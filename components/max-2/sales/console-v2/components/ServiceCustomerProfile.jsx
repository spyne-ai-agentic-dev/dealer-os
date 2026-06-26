"use client"

import { useMemo, useState } from 'react'
import { MaterialSymbol } from '@/components/max-2/material-symbol'
import { max2Classes, spyneSalesLayout } from '@/lib/design-system/max-2'
import { cn } from '@/lib/utils'
import ConversationThread from './ConversationThread'
import { SectionLabel, StatTile, EmptyState } from '../shared'

/* ────────────────────────────────────────────────────────────────────────────
 * Service customer profile — the dealership service-history journey, modeled on
 * xTime Spectrum's Customers view: customer snapshot → communication → appointment
 * & action items → vehicles, each with a per-VIN service Timeline (completed ROs →
 * today → recommended services by mileage milestone).
 *
 * The service mock carries only a single `vehicle` string + a message timeline, so
 * the structured vehicle list and per-vehicle RO history are synthesized here,
 * deterministically from the customer (id + vehicle), so every customer renders a
 * full, stable history without bloating the mock. Swap buildVehicles() for real
 * data when a service DMS feed lands.
 * ──────────────────────────────────────────────────────────────────────────── */

const ADVISORS = ['Chris A.', 'Maria S.', 'Devon K.', 'Priya R.', 'Sam T.']
const COLORS = ['Silver', 'Black', 'White', 'Gray', 'Blue', 'Red']
const MAKE_MODELS = [
  ['Toyota', 'Camry'], ['Honda', 'CR-V'], ['BMW', 'X3'], ['Kia', 'Sportage'],
  ['Ford', 'F-150'], ['Subaru', 'Outback'], ['Nissan', 'Rogue'], ['Hyundai', 'Tucson'],
]

/* Maintenance line items by mileage interval (severe/normal blended) — what a service
 * lane quotes at each milestone. Keyed by the interval in thousands. */
const INTERVAL_SERVICES = {
  5: ['Replace engine oil and filter', 'Rotate tires, inspect tread & pressure', 'Multi-point inspection'],
  10: ['Replace engine oil and filter', 'Rotate tires', 'Replace cabin air filter', 'Inspect brake pads & rotors'],
  15: ['Replace engine oil and filter', 'Rotate tires', 'Inspect battery & charging system', 'Top off all fluids'],
  20: ['Replace engine oil and filter', 'Rotate tires', 'Replace engine air filter', 'Inspect brakes', 'Inspect suspension'],
  30: ['Replace engine oil and filter', 'Brake fluid flush', 'Replace cabin & engine air filters', 'Wheel alignment', 'Inspect drive belts'],
  40: ['Replace engine oil and filter', 'Rotate tires', 'Replace cabin air filter', 'Inspect battery condition', 'Inspect brake lines & hoses'],
  60: ['Replace spark plugs', 'Coolant flush', 'Transmission service', 'Replace engine oil and filter', 'Inspect timing components'],
}

function hash(str = '') {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}
function seeded(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
function pick(arr, rnd) {
  return arr[Math.floor(rnd() * arr.length)]
}
function fakeVin(rnd) {
  const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'
  let v = ''
  for (let i = 0; i < 17; i++) v += chars[Math.floor(rnd() * chars.length)]
  return v
}
function fakePlate(rnd) {
  const L = 'ABCDEFGHJKLMNPRSTUVWXYZ'
  return `${pick([...L], rnd)}${pick([...L], rnd)}${pick([...L], rnd)} ${Math.floor(1000 + rnd() * 8999)}`
}
function monthsAgoLabel(months) {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const base = new Date(2026, 5, 26) // pin to the demo "today" so labels stay stable
  const d = new Date(base.getFullYear(), base.getMonth() - months, 15)
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}
function milestoneLabel(months) {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const base = new Date(2026, 5, 26)
  const d = new Date(base.getFullYear(), base.getMonth() + months, 1)
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** Parse "2019 BMW X3 · 40k service" → { year, make, model, mileage }. Falls back to
 *  a deterministic make/model + mileage when the string is sparse. */
function parseVehicle(str = '', rnd) {
  const year = (str.match(/\b(19|20)\d{2}\b/) || [])[0] || String(2017 + Math.floor(rnd() * 7))
  const kMatch = str.match(/(\d+)\s*k\b/i)
  const miMatch = str.match(/([\d,]{4,})\s*(?:mi|miles)/i)
  let mileage = kMatch ? parseInt(kMatch[1], 10) * 1000
    : miMatch ? parseInt(miMatch[1].replace(/,/g, ''), 10)
    : 15000 + Math.floor(rnd() * 70000)
  // pull make/model out of the leading "YEAR MAKE MODEL" chunk before any "·"
  const head = str.split('·')[0].replace(/\b(19|20)\d{2}\b/, '').trim()
  let make, model
  if (head) {
    const parts = head.split(/\s+/).filter(Boolean)
    make = parts[0]
    model = parts.slice(1).join(' ') || ''
  }
  if (!make) [make, model] = pick(MAKE_MODELS, rnd)
  return { year, make, model, mileage }
}

/** Build the structured vehicle list (with per-vehicle RO history + recommendations)
 *  for a service customer. Deterministic in the customer's id. Exported so the
 *  row-select side panel shows the same vehicles/ROs as the full profile. */
export function buildVehicles(customer) {
  const rnd = seeded(hash(customer.id || customer.name || 'svc'))
  const primary = makeVehicle(parseVehicle(customer.vehicle || '', rnd), customer, rnd, true)
  const vehicles = [primary]
  // Some households service a second vehicle — add one for ~1 in 3 customers.
  if (rnd() > 0.66) {
    vehicles.push(makeVehicle(parseVehicle('', rnd), customer, rnd, false))
  }
  return vehicles
}

function makeVehicle(parsed, customer, rnd, isPrimary) {
  const { year, make, model, mileage } = parsed
  const name = `${year} ${make} ${model}`.trim()
  const vin = fakeVin(rnd)
  const plate = fakePlate(rnd)
  const color = pick(COLORS, rnd)
  const advisor = customer.salesperson || pick(ADVISORS, rnd)

  // Per-line parts/labor pricing so every RO can break down to the work performed.
  const priceItem = (label) => {
    const l = label.toLowerCase()
    let parts = 0, labor = 40
    if (/oil|filter/.test(l)) { parts = 28 + Math.floor(rnd() * 18); labor = 35 + Math.floor(rnd() * 20) }
    else if (/rotate|tire/.test(l)) { parts = 0; labor = 25 + Math.floor(rnd() * 15) }
    else if (/brake/.test(l)) { parts = 140 + Math.floor(rnd() * 120); labor = 120 + Math.floor(rnd() * 90) }
    else if (/flush|coolant|transmission/.test(l)) { parts = 40 + Math.floor(rnd() * 40); labor = 80 + Math.floor(rnd() * 60) }
    else if (/spark plug|timing/.test(l)) { parts = 80 + Math.floor(rnd() * 80); labor = 120 + Math.floor(rnd() * 90) }
    else if (/battery/.test(l)) { parts = 160 + Math.floor(rnd() * 60); labor = 30 }
    else if (/align/.test(l)) { parts = 0; labor = 90 + Math.floor(rnd() * 40) }
    else if (/inspect|multi-point|top off/.test(l)) { parts = 0; labor = 0 } // inspection, no charge
    else { parts = 15 + Math.floor(rnd() * 30); labor = 30 + Math.floor(rnd() * 30) }
    return { parts, labor }
  }
  const makeLines = (labels, status) => labels.map((label) => {
    const { parts, labor } = priceItem(label)
    return { label, parts, labor, total: parts + labor, status }
  })

  // Completed RO history: walk back from the current mileage in ~5k steps (most recent first).
  const history = []
  const startInterval = Math.max(5, Math.floor(mileage / 5000) * 5) // nearest 5k at/below current
  let months = 2 + Math.floor(rnd() * 2) // most recent service ~2–3 months ago
  for (let mk = startInterval, count = 0; mk >= 5 && count < 6; mk -= 5, count++) {
    const labels = INTERVAL_SERVICES[mk] || INTERVAL_SERVICES[mk % 30 === 0 ? 30 : mk >= 60 ? 60 : 5]
    const lines = makeLines(labels, 'Completed')
    const partsTotal = lines.reduce((s, l) => s + l.parts, 0)
    const laborTotal = lines.reduce((s, l) => s + l.labor, 0)
    const warrantyPay = count === 0 ? Math.floor(rnd() * 90) : 0
    const total = partsTotal + laborTotal
    history.push({
      id: `${vin}-${mk}`,
      ro: `RO-${10000 + Math.floor(rnd() * 89999)}`,
      mileage: mk * 1000,
      date: monthsAgoLabel(months),
      items: lines,
      advisor,
      status: 'Completed',
      partsTotal,
      laborTotal,
      warrantyPay,
      customerPay: Math.max(0, total - warrantyPay),
      total,
      notes: count === 0 ? 'All recommended work completed; customer declined nothing.' : null,
    })
    months += 4 + Math.floor(rnd() * 3)
  }

  // Open / current visit — when the customer is mid-service, lift it from the RO summary and
  // split it into pending vs approved line items (what's awaiting the customer's go-ahead).
  const openRo = (() => {
    const summary = customer.roSummary || ''
    const hasOpen = customer.outcome === 'in_progress' || (/\bopen ro\b/i.test(summary) && !/no\s+open\s+ro/i.test(summary))
    if (!hasOpen) return null
    const rawLabels = (customer.roSummary || 'Open repair order')
      .replace(/^open ro\s*[·-]?\s*/i, '')
      .split(/[+,]/)
      .map((s) => s.trim())
      .filter(Boolean)
    const labels = rawLabels.length ? rawLabels : ['Multi-point inspection']
    const lines = labels.map((label, i) => {
      const { parts, labor } = priceItem(label)
      // first line is the diagnosis (approved); the rest are recommendations awaiting approval
      const status = i === 0 ? 'Approved' : 'Pending approval'
      return { label, parts, labor, total: parts + labor, status }
    })
    return {
      id: `${vin}-open`,
      ro: `RO-${10000 + Math.floor(rnd() * 89999)}`,
      mileage,
      date: customer.lastInteracted || 'Today',
      items: lines,
      advisor,
      status: 'In progress',
      due: customer.nextAppointment?.date,
      approvedTotal: lines.filter((l) => l.status === 'Approved').reduce((s, l) => s + l.total, 0),
      pendingTotal: lines.filter((l) => l.status !== 'Approved').reduce((s, l) => s + l.total, 0),
    }
  })()

  // Recommended upcoming services — the next two 5k milestones above current mileage.
  const next1 = (Math.floor(mileage / 5000) + 1) * 5000
  const next2 = next1 + 5000
  const recommended = [next1, next2].map((mi, i) => {
    const mk = (mi / 1000) % 30 === 0 ? 30 : (mi / 1000) % 10 === 0 ? 10 : 5
    const items = INTERVAL_SERVICES[(mi / 1000) % 30 === 0 ? 30 : mk] || INTERVAL_SERVICES[5]
    return {
      mileage: mi,
      monthsOut: 2 + i * 3,
      label: milestoneLabel(2 + i * 3),
      items,
      est: 90 + ((mi / 1000) % 30 === 0 ? 60 : 0) + Math.floor(rnd() * 70),
      severe: (mi / 1000) % 30 === 0,
    }
  })

  // Open recall / manufacturer campaign — ~40% of vehicles.
  const recall = rnd() > 0.6
    ? { id: `CS${2000 + Math.floor(rnd() * 999)}`, title: 'Theft-deterrent ignition software update', status: 'OPEN' }
    : null

  const lifetimePay = history.reduce((s, h) => s + h.total, 0)

  // Complete vehicle details (xTime "Edit / Decode VIN" fields), synthesized.
  const DRIVETRAINS = ['FWD', 'AWD', 'RWD', '4WD']
  const ENGINES = ['2.5L I4', '2.0L Turbo I4', '3.5L V6', '1.6L Turbo', '2.4L I4']
  const TRANS = ['8-speed automatic', 'CVT', '6-speed automatic', '10-speed automatic']
  const specs = {
    color,
    plate,
    mileage,
    avgMilesMonth: 800 + Math.floor(rnd() * 700),
    inServiceDate: monthsAgoLabel(Math.round((mileage / (900 + rnd() * 300)))),
    warrantyStatus: mileage < 36000 ? 'Bumper-to-bumper active' : mileage < 60000 ? 'Powertrain only' : 'Out of warranty',
    engine: pick(ENGINES, rnd),
    drivetrain: pick(DRIVETRAINS, rnd),
    transmission: pick(TRANS, rnd),
    primaryVehicle: isPrimary,
  }

  return { name, year, make, model, mileage, vin, plate, color, advisor, isPrimary, history, openRo, recommended, recall, lifetimePay, specs }
}

/* ── component ─────────────────────────────────────────────────────────────── */

export default function ServiceCustomerProfile({ customer, onBack, onNavigate }) {
  const vehicles = useMemo(() => buildVehicles(customer), [customer])
  const [activeVin, setActiveVin] = useState(vehicles[0]?.vin)
  const [showThread, setShowThread] = useState(false)
  const vehicle = vehicles.find((v) => v.vin === activeVin) || vehicles[0]

  const phoneHref = `tel:${(customer.phone || '').replace(/\D/g, '')}`
  const openCount = vehicles.filter((v) => v.openRo).length
  const lifetime = vehicles.reduce((s, v) => s + v.lifetimePay, 0)
  const lastMsg = [...(customer.timeline || [])].sort((a, b) => (b.sortKey ?? 0) - (a.sortKey ?? 0))[0]
  const actionItems = customer.actionItems || []
  const nextAppt = customer.nextAppointment
  const isLead = (customer.customerType ?? 'lead') === 'lead'

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className={cn('spyne-animate-fade-in', spyneSalesLayout.pageStack)}>
      {/* Back */}
      <button type="button" onClick={onBack} className="spyne-btn-ghost w-fit">
        <MaterialSymbol name="arrow_back" size={16} /> All customers
      </button>

      {/* ── Customer info (req 1) ── */}
      <div className="spyne-card overflow-hidden p-0">
        <div className="flex flex-wrap items-start gap-4 p-5">
          <div
            className={cn(customer.avatarColor, 'flex items-center justify-center rounded-2xl font-bold text-white')}
            style={{ width: 60, height: 60, fontSize: 21, flexShrink: 0 }}
          >
            {customer.initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className={cn(max2Classes.pageTitle, 'text-[26px] leading-none')}>{customer.name}</h1>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
                style={isLead
                  ? { background: 'var(--spyne-info-subtle)', color: 'var(--spyne-info-text)' }
                  : { background: 'var(--spyne-success-subtle)', color: 'var(--spyne-success-text)' }}
              >
                <MaterialSymbol name={isLead ? 'person_add' : 'how_to_reg'} size={13} />
                {isLead ? 'New lead' : 'Returning customer'}
              </span>
              {customer.serviceStageLabel && (
                <span className="spyne-badge spyne-badge-brand">{customer.serviceStageLabel}</span>
              )}
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]" style={{ color: 'var(--spyne-text-secondary)' }}>
              <a href={phoneHref} className="inline-flex items-center gap-1 no-underline" style={{ color: 'var(--spyne-text-secondary)' }}>
                <span className="inline-flex" style={{ color: 'var(--spyne-text-muted)' }}><MaterialSymbol name="call" size={14} /></span>
                {customer.phone}
              </a>
              {customer.email && <span style={{ color: 'var(--spyne-text-muted)' }}>· {customer.email}</span>}
              <span style={{ color: 'var(--spyne-text-muted)' }}>· Advisor {customer.salesperson}</span>
              <span style={{ color: 'var(--spyne-text-muted)' }}>· last touch {customer.lastContact}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <a href={phoneHref} className="spyne-btn-primary no-underline"><MaterialSymbol name="phone" size={16} /> Call</a>
            <button className="spyne-btn-secondary"><MaterialSymbol name="sms" size={16} /> Message</button>
            <button className="spyne-btn-secondary"><MaterialSymbol name="event" size={16} /> Schedule service</button>
          </div>
        </div>

        {/* Snapshot stats — the numbers a service drive scans first */}
        <div className="grid grid-cols-2 divide-x sm:grid-cols-4" style={{ borderTop: '1px solid var(--spyne-border)', borderColor: 'var(--spyne-border)' }}>
          <HeroStat glyph="directions_car" value={vehicles.length} label={vehicles.length === 1 ? 'Vehicle · view details' : 'Vehicles · view details'} tabular onClick={() => scrollTo('svc-vehicles')} />
          <HeroStat glyph="build" value={openCount || 'None'} label={openCount ? 'Open repair orders' : 'No open ROs'} muted={!openCount} onClick={openCount ? () => scrollTo('svc-openro') : undefined} />
          <HeroStat glyph="payments" value={`$${lifetime.toLocaleString()}`} label="Lifetime service pay" tabular onClick={() => scrollTo('svc-rohistory')} />
          <HeroStat
            glyph="event_available"
            value={nextAppt ? (nextAppt.type ?? 'Scheduled') : 'None yet'}
            label={nextAppt ? `Next · ${nextAppt.date ?? 'TBD'}` : 'No appointment'}
            muted={!nextAppt}
            onClick={() => onNavigate?.('appointments')}
          />
        </div>
      </div>

      {/* ── Quick snippets: communication / appointment / action items (req 2 & 3) ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Communication (req 2) */}
        <SnippetCard
          icon="forum"
          title="Communication"
          meta={`${customer.timeline?.length ?? 0} messages`}
          ctaLabel={showThread ? 'Hide conversation' : 'View full conversation'}
          onCta={() => setShowThread((v) => !v)}
        >
          {lastMsg ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--spyne-text-muted)' }}>
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  style={lastMsg.agent
                    ? { background: 'var(--spyne-brand-subtle)', color: 'var(--spyne-brand)' }
                    : { background: 'var(--spyne-page-bg)', color: 'var(--spyne-text-secondary)' }}
                >
                  {lastMsg.agent ? 'Vini / advisor' : customer.name.split(' ')[0]}
                </span>
                <span className="tabular-nums">{lastMsg.timestamp}</span>
              </div>
              <p className="line-clamp-3 text-[12.5px] leading-snug" style={{ color: 'var(--spyne-text-primary)' }}>{lastMsg.body}</p>
            </div>
          ) : (
            <EmptyState glyph="forum" title="No messages yet" helper="Conversation history appears here." className="!px-2 !py-5" />
          )}
        </SnippetCard>

        {/* Appointment (req 3) */}
        <SnippetCard
          icon="event"
          title="Appointment"
          ctaLabel="View in Appointments"
          onCta={() => onNavigate?.('appointments')}
        >
          {nextAppt ? (
            <div className="flex items-start gap-2.5">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ background: 'var(--spyne-brand-subtle)', color: 'var(--spyne-brand)' }}>
                <MaterialSymbol name="event_available" size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold leading-tight" style={{ color: 'var(--spyne-text-primary)' }}>{nextAppt.type ?? 'Service visit'}</p>
                <p className="mt-0.5 text-[12px]" style={{ color: 'var(--spyne-text-secondary)' }}>{nextAppt.date ?? 'TBD'}</p>
                {vehicle && <p className="mt-0.5 text-[11px]" style={{ color: 'var(--spyne-text-muted)' }}>{vehicle.name}</p>}
              </div>
            </div>
          ) : (
            <EmptyState glyph="event_busy" title="No upcoming appointment" helper="Schedule the next service visit." className="!px-2 !py-5" />
          )}
        </SnippetCard>

        {/* Action items (req 3) */}
        <SnippetCard
          icon="checklist"
          title="Action items"
          count={actionItems.length}
          ctaLabel="View in Action Items"
          onCta={() => onNavigate?.('action-items')}
        >
          {actionItems.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {actionItems.slice(0, 3).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-[12.5px] leading-snug" style={{ color: 'var(--spyne-text-secondary)' }}>
                  <span className="mt-[5px] size-1.5 shrink-0 rounded-full" style={{ background: 'var(--spyne-brand)' }} />
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState glyph="task_alt" title="All caught up" helper="No open action items." className="!px-2 !py-5" />
          )}
        </SnippetCard>
      </div>

      {/* Full conversation (revealed from the communication snippet) */}
      {showThread && (
        <div className="spyne-card p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <span className="inline-flex" style={{ color: 'var(--spyne-text-muted)' }}><MaterialSymbol name="forum" size={16} /></span>
            <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--spyne-text-secondary)' }}>Full conversation</span>
          </div>
          <ConversationThread timeline={customer.timeline} />
        </div>
      )}

      {/* ── Vehicles & service timeline (req 4 — the centerpiece) ── */}
      <section id="svc-vehicles" className="flex flex-col gap-3 scroll-mt-24">
        <SectionLabel glyph="directions_car" text="Vehicles & service timeline" hint="service history per vehicle" chip />

        {/* Vehicle selector (when more than one) */}
        {vehicles.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {vehicles.map((v) => {
              const active = v.vin === activeVin
              return (
                <button
                  key={v.vin}
                  onClick={() => setActiveVin(v.vin)}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all',
                    active ? 'border-spyne-brand bg-[var(--spyne-brand-subtle)]' : 'border-spyne-border bg-spyne-card hover:border-spyne-brand',
                  )}
                >
                  <MaterialSymbol name="directions_car" size={16} />
                  <span className="text-[12.5px] font-bold" style={{ color: 'var(--spyne-text-primary)' }}>{v.name}</span>
                  {v.isPrimary && <span className="spyne-badge spyne-badge-neutral text-[9px]">Primary</span>}
                </button>
              )
            })}
          </div>
        )}

        {vehicle && <VehiclePanel vehicle={vehicle} />}
      </section>
    </div>
  )
}

/* ── Vehicle panel — summary + timeline + recommendations + RO history ──────── */

function VehiclePanel({ vehicle }) {
  const [view, setView] = useState('3 Months')
  const [showSpecs, setShowSpecs] = useState(false)

  // Timeline milestones: completed ROs (newest last so they read left→right past→future),
  // then today, then recommended services.
  const past = [...vehicle.history].reverse() // oldest → newest
  return (
    <div className="spyne-card overflow-hidden p-0">
      {/* Vehicle summary (xTime SUMMARY row) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-spyne-border px-5 py-4" style={{ background: 'var(--spyne-page-bg)' }}>
        <div className="flex items-center gap-3">
          <span className="inline-flex size-11 items-center justify-center rounded-xl" style={{ background: 'var(--spyne-brand-subtle)', color: 'var(--spyne-brand)' }}>
            <MaterialSymbol name="directions_car" size={24} />
          </span>
          <div>
            <p className="text-[16px] font-bold leading-tight" style={{ color: 'var(--spyne-text-primary)' }}>{vehicle.name}</p>
            <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--spyne-text-muted)' }}>
              {vehicle.color} · VIN {vehicle.vin} · {vehicle.plate}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <SummaryFig label="Mileage" value={vehicle.mileage.toLocaleString()} />
          <SummaryFig label="Lifetime pay" value={`$${vehicle.lifetimePay.toLocaleString()}`} />
          <SummaryFig label="ROs" value={vehicle.history.length + (vehicle.openRo ? 1 : 0)} />
          <button
            onClick={() => setShowSpecs((s) => !s)}
            className="spyne-btn-secondary !h-9"
          >
            <MaterialSymbol name={showSpecs ? 'expand_less' : 'expand_more'} size={16} />
            {showSpecs ? 'Hide details' : 'Vehicle details'}
          </button>
        </div>
      </div>

      {/* Complete vehicle details (req: view vehicles → full details) */}
      {showSpecs && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-b border-spyne-border px-5 py-4 sm:grid-cols-3 lg:grid-cols-4">
          <Spec label="VIN" value={vehicle.vin} />
          <Spec label="License plate" value={vehicle.specs.plate} />
          <Spec label="Color" value={vehicle.specs.color} />
          <Spec label="Odometer" value={`${vehicle.specs.mileage.toLocaleString()} mi`} />
          <Spec label="Avg miles / month" value={vehicle.specs.avgMilesMonth.toLocaleString()} />
          <Spec label="In service since" value={vehicle.specs.inServiceDate} />
          <Spec label="Warranty" value={vehicle.specs.warrantyStatus} />
          <Spec label="Engine" value={vehicle.specs.engine} />
          <Spec label="Transmission" value={vehicle.specs.transmission} />
          <Spec label="Drivetrain" value={vehicle.specs.drivetrain} />
          <Spec label="Primary vehicle" value={vehicle.specs.primaryVehicle ? 'Yes' : 'No'} />
          <Spec label="Advisor" value={vehicle.advisor} />
        </div>
      )}

      {/* Open recall / campaign banner */}
      {vehicle.recall && (
        <div className="flex items-center gap-2 border-b border-spyne-border px-5 py-2.5" style={{ background: 'var(--spyne-warning-subtle)' }}>
          <span className="inline-flex" style={{ color: 'var(--spyne-warning-ink)' }}><MaterialSymbol name="campaign" size={16} /></span>
          <p className="text-[11.5px] font-semibold" style={{ color: 'var(--spyne-warning-ink)' }}>
            Open manufacturer campaign {vehicle.recall.id} — {vehicle.recall.title}
          </p>
          <span className="spyne-badge spyne-badge-warning ml-auto text-[9px]">{vehicle.recall.status}</span>
        </div>
      )}

      {/* Current / open repair order — current RO + pending items (req) */}
      {vehicle.openRo && (
        <div id="svc-openro" className="border-b border-spyne-border px-5 py-4 scroll-mt-24" style={{ background: 'var(--spyne-info-subtle)' }}>
          <CurrentRO ro={vehicle.openRo} />
        </div>
      )}

      {/* View toggle */}
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--spyne-text-muted)' }}>Service timeline</span>
        <div className="inline-flex rounded-lg border border-spyne-border p-0.5">
          {['Month', '3 Months', 'Year'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn('rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors', view === v ? 'text-white' : '')}
              style={view === v ? { background: 'var(--spyne-brand)' } : { color: 'var(--spyne-text-secondary)' }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Milestone timeline strip — past ROs → Today → recommended */}
      <div className="px-5 py-4">
        <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
          {past.map((ro) => (
            <MilestoneCard
              key={ro.id}
              tone="done"
              mileageK={Math.round(ro.mileage / 1000)}
              caption={ro.date}
              title="Completed"
            />
          ))}
          {vehicle.openRo && (
            <MilestoneCard tone="open" mileageK={Math.round(vehicle.openRo.mileage / 1000)} caption={vehicle.openRo.date} title="In progress" />
          )}
          <div className="flex flex-col items-center justify-center px-1">
            <span className="h-full w-px" style={{ background: 'var(--spyne-brand)' }} />
            <span className="mt-1 whitespace-nowrap text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--spyne-brand)' }}>Today</span>
          </div>
          {vehicle.recommended.map((rec, i) => (
            <MilestoneCard key={i} tone="rec" mileageK={Math.round(rec.mileage / 1000)} caption={rec.label} title="Recommended" />
          ))}
        </div>
      </div>

      {/* Recommended service detail (next milestone) */}
      {vehicle.recommended[0] && (
        <div className="border-t border-spyne-border px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[13.5px] font-bold" style={{ color: 'var(--spyne-text-primary)' }}>
                Recommended · {vehicle.recommended[0].mileage.toLocaleString()} mile service
              </p>
              <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--spyne-text-muted)' }}>
                Due ~{vehicle.recommended[0].label} · {vehicle.recommended[0].severe ? 'Severe factory maintenance' : 'Factory maintenance'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[18px] font-bold tabular-nums" style={{ color: 'var(--spyne-text-primary)' }}>~${vehicle.recommended[0].est}</span>
              <button className="spyne-btn-primary !h-9"><MaterialSymbol name="calendar_add_on" size={16} /> Schedule service</button>
            </div>
          </div>
          <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {vehicle.recommended[0].items.map((it, i) => (
              <li key={i} className="flex items-center gap-2 text-[12.5px]" style={{ color: 'var(--spyne-text-secondary)' }}>
                <span className="inline-flex" style={{ color: 'var(--spyne-success-text)' }}><MaterialSymbol name="check_circle" size={14} /></span>
                {it}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* R.O. history (the actual service history — every service, expandable) */}
      <div id="svc-rohistory" className="border-t border-spyne-border px-5 py-4 scroll-mt-24">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--spyne-text-muted)' }}>
          R.O. history ({vehicle.history.length}) · tap a visit for full detail
        </p>
        <div className="flex flex-col gap-2.5">
          {vehicle.history.map((ro) => <ROCard key={ro.id} ro={ro} />)}
        </div>
      </div>
    </div>
  )
}

function Spec({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--spyne-text-muted)' }}>{label}</p>
      <p className="mt-0.5 truncate text-[12.5px] font-semibold" style={{ color: 'var(--spyne-text-primary)' }} title={String(value)}>{value}</p>
    </div>
  )
}

const RO_STATUS_STYLE = {
  Approved: { bg: 'var(--spyne-success-subtle)', fg: 'var(--spyne-success-text)' },
  'Pending approval': { bg: 'var(--spyne-warning-subtle)', fg: 'var(--spyne-warning-ink)' },
  Declined: { bg: 'var(--spyne-danger-subtle)', fg: 'var(--spyne-danger-text)' },
  Completed: { bg: 'var(--spyne-success-subtle)', fg: 'var(--spyne-success-text)' },
}

/* Current/open RO — what's on the lift now and what's awaiting the customer's approval. */
function CurrentRO({ ro }) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-7 items-center justify-center rounded-lg" style={{ background: 'var(--spyne-info-text)', color: '#fff' }}>
            <MaterialSymbol name="build" size={15} />
          </span>
          <div>
            <p className="text-[13.5px] font-bold leading-tight" style={{ color: 'var(--spyne-text-primary)' }}>Current repair order · {ro.ro}</p>
            <p className="text-[11px]" style={{ color: 'var(--spyne-text-muted)' }}>{ro.mileage.toLocaleString()} mi · {ro.date} · Advisor {ro.advisor}{ro.due ? ` · due ${ro.due}` : ''}</p>
          </div>
        </div>
        <span className="spyne-badge text-[9px]" style={{ background: 'var(--spyne-info-text)', color: '#fff' }}>{ro.status}</span>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-spyne-border bg-spyne-card">
        {ro.items.map((it, i) => {
          const st = RO_STATUS_STYLE[it.status] || RO_STATUS_STYLE.Approved
          return (
            <div key={i} className={cn('flex items-center justify-between gap-3 px-3.5 py-2.5', i > 0 && 'border-t border-spyne-border')}>
              <div className="flex min-w-0 items-center gap-2">
                <span className="spyne-badge text-[9px]" style={{ background: st.bg, color: st.fg }}>{it.status}</span>
                <span className="truncate text-[12.5px] font-medium" style={{ color: 'var(--spyne-text-primary)' }}>{it.label}</span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-[11px]" style={{ color: 'var(--spyne-text-muted)' }}>parts ${it.parts} · labor ${it.labor}</span>
                <span className="w-14 text-right text-[12.5px] font-bold tabular-nums" style={{ color: 'var(--spyne-text-primary)' }}>${it.total}</span>
                {it.status === 'Pending approval' && (
                  <button className="spyne-btn-primary !h-7 !text-[11px]">Approve</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-4 text-[11.5px]">
        <span style={{ color: 'var(--spyne-success-text)' }}>Approved <b className="tabular-nums">${ro.approvedTotal}</b></span>
        <span style={{ color: 'var(--spyne-warning-ink)' }}>Pending approval <b className="tabular-nums">${ro.pendingTotal}</b></span>
        <span className="ml-auto font-bold" style={{ color: 'var(--spyne-text-primary)' }}>Estimate total <span className="tabular-nums">${ro.approvedTotal + ro.pendingTotal}</span></span>
      </div>
    </div>
  )
}

function MilestoneCard({ tone, mileageK, caption, title }) {
  const styles = {
    done: { bg: 'var(--spyne-success-subtle)', fg: 'var(--spyne-success-text)' },
    open: { bg: 'var(--spyne-info-subtle)', fg: 'var(--spyne-info-text)' },
    rec: { bg: 'var(--spyne-warning-subtle)', fg: 'var(--spyne-warning-ink)' },
  }[tone]
  return (
    <div className="flex w-[96px] shrink-0 flex-col rounded-xl px-3 py-2.5" style={{ background: styles.bg }}>
      <span className="text-[17px] font-extrabold tabular-nums leading-none" style={{ color: styles.fg }}>{mileageK}k</span>
      <span className="mt-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: styles.fg }}>{title}</span>
      <span className="mt-0.5 text-[10px]" style={{ color: 'var(--spyne-text-muted)' }}>{caption}</span>
    </div>
  )
}

function ROCard({ ro }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-xl border border-spyne-border">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full flex-wrap items-center justify-between gap-2 p-3.5 text-left transition-colors hover:bg-[var(--spyne-page-bg)]">
        <div className="flex items-center gap-2">
          <MaterialSymbol name={open ? 'expand_less' : 'expand_more'} size={18} style={{ color: 'var(--spyne-text-muted)' }} />
          <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--spyne-text-primary)' }}>{ro.mileage.toLocaleString()} mi</span>
          <span className="spyne-badge text-[9px]" style={{ background: 'var(--spyne-success-subtle)', color: 'var(--spyne-success-text)' }}>{ro.status}</span>
          <span className="text-[11px]" style={{ color: 'var(--spyne-text-muted)' }}>{ro.ro} · {ro.date}</span>
        </div>
        <div className="flex items-center gap-3 text-right">
          <span className="text-[11px]" style={{ color: 'var(--spyne-text-muted)' }}>{ro.items.length} items</span>
          <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--spyne-text-primary)' }}>${ro.total.toLocaleString()}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-spyne-border px-3.5 py-3" style={{ background: 'var(--spyne-page-bg)' }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ color: 'var(--spyne-text-muted)' }}>
                <th className="pb-1.5 text-left text-[10px] font-bold uppercase tracking-wide">Service performed</th>
                <th className="pb-1.5 text-right text-[10px] font-bold uppercase tracking-wide">Parts</th>
                <th className="pb-1.5 text-right text-[10px] font-bold uppercase tracking-wide">Labor</th>
                <th className="pb-1.5 text-right text-[10px] font-bold uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody>
              {ro.items.map((it, i) => (
                <tr key={i} className="border-t border-spyne-border">
                  <td className="py-1.5 pr-2" style={{ color: 'var(--spyne-text-primary)' }}>{it.label}</td>
                  <td className="py-1.5 text-right tabular-nums" style={{ color: 'var(--spyne-text-secondary)' }}>{it.parts ? `$${it.parts}` : '—'}</td>
                  <td className="py-1.5 text-right tabular-nums" style={{ color: 'var(--spyne-text-secondary)' }}>{it.labor ? `$${it.labor}` : '—'}</td>
                  <td className="py-1.5 text-right font-semibold tabular-nums" style={{ color: 'var(--spyne-text-primary)' }}>{it.total ? `$${it.total}` : 'No charge'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-spyne-border pt-2.5 text-[11.5px]" style={{ color: 'var(--spyne-text-secondary)' }}>
            <span>Parts <b className="tabular-nums" style={{ color: 'var(--spyne-text-primary)' }}>${ro.partsTotal}</b></span>
            <span>Labor <b className="tabular-nums" style={{ color: 'var(--spyne-text-primary)' }}>${ro.laborTotal}</b></span>
            {ro.warrantyPay > 0 && <span>Warranty <b className="tabular-nums" style={{ color: 'var(--spyne-success-text)' }}>−${ro.warrantyPay}</b></span>}
            <span>Customer pay <b className="tabular-nums" style={{ color: 'var(--spyne-text-primary)' }}>${ro.customerPay}</b></span>
            <span className="ml-auto">Advisor {ro.advisor}</span>
          </div>
          {ro.notes && <p className="mt-2 text-[11.5px] italic" style={{ color: 'var(--spyne-text-muted)' }}>{ro.notes}</p>}
        </div>
      )}
    </div>
  )
}

/* ── small parts ───────────────────────────────────────────────────────────── */

function SnippetCard({ icon, title, meta, count, ctaLabel, onCta, children }) {
  return (
    <div className="spyne-card flex flex-col p-4">
      <div className="mb-3 flex items-center gap-1.5">
        <span className="inline-flex" style={{ color: 'var(--spyne-text-muted)' }}><MaterialSymbol name={icon} size={16} /></span>
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--spyne-text-secondary)' }}>{title}</span>
        {meta != null && <span className="ml-auto text-[10.5px] font-medium tabular-nums" style={{ color: 'var(--spyne-text-muted)' }}>{meta}</span>}
        {count != null && (
          <span className="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold" style={{ background: 'var(--spyne-page-bg)', color: 'var(--spyne-text-secondary)' }}>{count}</span>
        )}
      </div>
      <div className="flex-1">{children}</div>
      {ctaLabel && (
        <button onClick={onCta} className="spyne-focus-ring mt-3 inline-flex items-center gap-1 self-start text-[12px] font-semibold" style={{ color: 'var(--spyne-brand)' }}>
          {ctaLabel} <MaterialSymbol name="arrow_forward" size={14} />
        </button>
      )}
    </div>
  )
}

function SummaryFig({ label, value }) {
  return (
    <div className="text-right">
      <p className="text-[15px] font-bold tabular-nums leading-tight" style={{ color: 'var(--spyne-text-primary)' }}>{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--spyne-text-muted)' }}>{label}</p>
    </div>
  )
}

function HeroStat({ glyph, value, label, tabular, muted, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={cn('flex items-center gap-2.5 px-4 py-3.5 text-left transition-colors', onClick && 'hover:bg-[var(--spyne-page-bg)] cursor-pointer')}
      style={{ borderColor: 'var(--spyne-border)' }}
    >
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ background: 'var(--spyne-page-bg)', color: muted ? 'var(--spyne-text-muted)' : 'var(--spyne-brand)' }}>
        <MaterialSymbol name={glyph} size={16} />
      </span>
      <div className="min-w-0">
        <div className={cn('truncate text-[15px] font-bold leading-tight', tabular && 'tabular-nums')} style={{ color: muted ? 'var(--spyne-text-secondary)' : 'var(--spyne-text-primary)' }}>{value}</div>
        <div className="mt-0.5 flex items-center gap-0.5 truncate text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--spyne-text-muted)' }}>
          {label}
          {onClick && <MaterialSymbol name="chevron_right" size={12} />}
        </div>
      </div>
    </Tag>
  )
}
