"use client"

import React, { useState } from 'react'
import { MaterialSymbol } from '@/components/max-2/material-symbol'
import { customersData, serviceLeadsData } from '../mockData'
import { SERVICE_CONSOLE_TAB_CONTENT } from '@/lib/max-2/service-console-tab-content'
import CustomerOverviewPanel from './CustomerOverviewPanel'
import ViniTabStrip from './ViniTabStrip'
import { SpyneSegmentedButton, SpyneSegmentedControl } from '@/components/max-2/spyne-toolbar-controls'
import { max2Classes, spyneSalesLayout } from '@/lib/design-system/max-2'
import { cn } from '@/lib/utils'
import { CHART_SERIES, SPYNE, SPYNE_SOFT_BG } from '../spyne-palette'

const STAGE_LABELS = {
  RESEARCH:    'Just Looking',
  SHOPPING:    'Comparing Options',
  EVALUATION:  'Ready to Visit',
  NEGOTIATION: 'Talking Numbers',
  CLOSING:     'Ready to Buy',
}

/** Semantic badge variants — fills from `.max2-spyne .spyne-badge-*` (design system) */
const STAGE_BADGE_CLASS = {
  CLOSING:     'spyne-badge-brand',
  NEGOTIATION: 'spyne-badge-brand',
  EVALUATION:  'spyne-badge-warning',
  SHOPPING:    'spyne-badge-neutral',
  RESEARCH:    'spyne-badge-neutral',
}

const SOURCE_BADGE_CLASS = {
  'Internet Lead': 'spyne-badge-info',
  'Phone Lead':    'spyne-badge-success',
  'Email Lead':    'spyne-badge-brand',
  'Walk-in':       'spyne-badge-warning',
  'Referral':      'spyne-badge-neutral',
  'Online Scheduler': 'spyne-badge-info',
  'Service Campaign': 'spyne-badge-brand',
}

const TEMP_CONFIG = {
  HOT:  { color: SPYNE.error, label: 'Hot' },
  WARM: { color: SPYNE.warningInk, label: 'Warm' },
  COLD: { color: SPYNE.textSecondary, label: 'Cold' },
}
const TEMP_ORDER = { HOT: 0, WARM: 1, COLD: 2 }

const FILTERS = [
  { id: 'all',             label: 'All' },
  { id: 'appointment_set', label: 'Appointment Set' },
  { id: 'qualified',       label: 'Qualified' },
  { id: 'cooling',         label: 'Cooling' },
  { id: 'in_progress',     label: 'In Progress' },
  { id: 'needs_attention', label: 'Needs Attention' },
]

const COLS = ['Customer', 'Stage', 'Temperature', 'Vehicle', 'Last Interaction ↓', 'Salesperson', 'Next Appt', '']

const SERVICE_COLS = ['Guest', 'Lead status', 'Temperature', 'Vehicle / RO', 'Last interaction ↓', 'Advisor', 'Next appt', '']

// Swimlane columns — 5 pipeline stages
const SWIMLANE_COLS = [
  { key: 'NEW',               label: 'New Leads',         color: SPYNE.textSecondary, bg: SPYNE_SOFT_BG.neutral },
  { key: 'ENGAGED',           label: 'Engaged Leads',     color: SPYNE.info, bg: SPYNE_SOFT_BG.info },
  { key: 'QUALIFIED',         label: 'Qualified',         color: SPYNE.warningInk, bg: SPYNE_SOFT_BG.warning },
  { key: 'APPOINTMENT_BOOKED', label: 'Appointment Booked', color: SPYNE.primary, bg: SPYNE_SOFT_BG.primary },
  { key: 'STORE_VISIT',       label: 'Store Visit',       color: SPYNE.success, bg: SPYNE_SOFT_BG.success },
]

const SWIMLANE_COL_MIN_WIDTH_PX = 310
const SWIMLANE_COL_GAP_PX = 16
const SWIMLANE_GRID_MIN_WIDTH_PX =
  SWIMLANE_COLS.length * SWIMLANE_COL_MIN_WIDTH_PX + (SWIMLANE_COLS.length - 1) * SWIMLANE_COL_GAP_PX

const swimlaneColumnSurface = {
  backgroundImage:
    'linear-gradient(var(--spyne-page), var(--spyne-page)), repeating-linear-gradient(-45deg, transparent, transparent 7px, color-mix(in srgb, var(--spyne-border) 45%, transparent) 0, color-mix(in srgb, var(--spyne-border) 45%, transparent) 1px)',
}

// Simple hash for avatar background
function avatarBg(name) {
  const colors = CHART_SERIES
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % colors.length
  return colors[h]
}

function leadDisplayId(id) {
  const digits = id.match(/\d+/g)?.join('') ?? id.replace(/[^a-z0-9]/gi, '')
  const tail = digits.slice(-3).padStart(3, '0')
  return `# ${tail}`
}

function salespersonInitials(name) {
  if (!name) return '?'
  return name
    .split(/[\s.]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatCurrencyUSD(n) {
  if (n == null || Number.isNaN(n) || n <= 0) return null
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

function swimlaneWebsiteLabel(customer) {
  const s = customer.source || ''
  if (/Internet|Online|Email|Scheduler/i.test(s)) {
    const d = customer.email?.split('@')[1]
    return d || 'dealer-inventory.com'
  }
  if (/Phone/i.test(s)) return 'phone-queue'
  if (/Walk/i.test(s)) return 'showroom'
  if (/Referral/i.test(s)) return 'referral'
  if (/Service/i.test(s)) return 'service-lane'
  return 'lead'
}

function swimlaneAmountLine(customer, isService) {
  if (isService) {
    const cur = formatCurrencyUSD(customer.vehiclePrice)
    if (cur) return cur
    if (customer.roSummary) {
      const t = customer.roSummary
      return t.length > 36 ? `${t.slice(0, 36)}…` : t
    }
    return 'Open RO'
  }
  const cur = formatCurrencyUSD(customer.vehiclePrice)
  if (cur) return cur
  return customer.budget || '—'
}

function swimlaneCloseLabel(customer) {
  if (customer.nextAppointment?.date) return customer.nextAppointment.date
  return customer.lastInteracted || customer.lastContact || '—'
}

function swimlaneCategoryTags(customer, isService) {
  const tags = []
  const src = (customer.source || '').replace(' Lead', '')
  if (src) tags.push({ label: src, key: 'src', palette: 0 })
  const temp = TEMP_CONFIG[customer.temperature]
  if (temp) tags.push({ label: temp.label, key: 'temp', palette: 1 })
  if (isService && customer.serviceStageLabel) {
    tags.push({ label: customer.serviceStageLabel.split('·')[0].trim(), key: 'svc', palette: 2 })
  } else if (customer.financeType) {
    tags.push({ label: customer.financeType, key: 'fin', palette: 2 })
  } else if (customer.features?.[0]) {
    tags.push({ label: customer.features[0], key: 'feat', palette: 3 })
  }
  return tags.slice(0, 4)
}

const SWIMLANE_TAG_PALETTES = [
  { bg: SPYNE_SOFT_BG.orange, color: SPYNE.orange },
  { bg: SPYNE_SOFT_BG.info, color: SPYNE.info },
  { bg: SPYNE_SOFT_BG.pink, color: SPYNE.pink },
  { bg: SPYNE_SOFT_BG.success, color: SPYNE.success },
]

function swimlaneFileAndCommentCounts(customer) {
  const files = customer.actionItemCount ?? 0
  const t = customer.timeline
  const comments = t?.length
    ? t.filter((e) => e.type === 'sms' || e.type === 'call').length
    : Math.max(0, (customer.touchCount ?? 0) - 1)
  return { files, comments: Math.max(comments, 0) }
}

function FunnelBar({ data }) {
  const counts = SWIMLANE_COLS.map(col => ({
    ...col,
    count: data.filter(c => c.swimlaneStage === col.key).length,
  }))
  const max = Math.max(...counts.map(c => c.count), 1)

  return (
    <div className="spyne-card p-4 mb-4">
      <div className="flex items-end gap-0 h-full">
        {counts.map((col, i) => (
          <div key={col.key} className="flex-1 flex flex-col items-center gap-1.5">
            {/* Bar */}
            <div className="w-full flex items-end justify-center" style={{ height: 32 }}>
              <div
                style={{
                  width: '85%',
                  height: Math.max(6, (col.count / max) * 32),
                  background: col.color,
                  borderRadius: '3px 3px 0 0',
                  opacity: 0.85,
                  transition: 'height 300ms ease',
                }}
              />
            </div>
            {/* Count */}
            <span style={{ fontSize: 18, fontWeight: 700, color: col.color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {col.count}
            </span>
            {/* Label */}
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--spyne-text-muted)', textAlign: 'center', lineHeight: 1.3 }}>
              {col.label}
            </span>
            {/* Arrow connector */}
            {i < counts.length - 1 && (
              <div style={{ position: 'absolute' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function SwimlaneDetailRow({ icon, label, value }) {
  return (
    <div className="flex gap-3">
      <div className="flex w-[88px] shrink-0 items-center gap-1.5 text-spyne-text-secondary">
        <MaterialSymbol name={icon} size={14} className="shrink-0 opacity-80" aria-hidden />
        <span className="text-[11px]">{label}</span>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end text-spyne-text">{value}</div>
    </div>
  )
}

function SwimlaneCard({ customer, onViewProfile, isService = false }) {
  const bg = avatarBg(customer.name)
  const assigneeBg = avatarBg(customer.salesperson || 'rep')
  const temp = TEMP_CONFIG[customer.temperature]
  const statusLabel = isService && customer.serviceStageLabel ? customer.serviceStageLabel : null
  const tags = swimlaneCategoryTags(customer, isService)
  const { files: fileCount, comments: commentCount } = swimlaneFileAndCommentCounts(customer)
  const website = swimlaneWebsiteLabel(customer)
  const amount = swimlaneAmountLine(customer, isService)
  const closeLbl = swimlaneCloseLabel(customer)

  return (
    <div
      role="button"
      tabIndex={0}
      style={{ backgroundColor: 'rgba(255, 255, 255, 1)' }}
      className={cn(
        'relative flex min-w-0 flex-col overflow-x-auto rounded-2xl border border-spyne-border p-4 shadow-[var(--spyne-card-shadow)] transition-[box-shadow,transform] duration-200',
        'hover:shadow-[0_8px_30px_rgb(0_0_0_/_0.08)] hover:-translate-y-px',
        'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-spyne-primary focus-visible:ring-offset-2',
      )}
      onClick={() => onViewProfile && onViewProfile(customer.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onViewProfile && onViewProfile(customer.id)
        }
      }}
    >
      {customer.needsAttention && (
        <div className="absolute right-3 top-3" title={customer.attentionReason || 'Needs attention'}>
          <MaterialSymbol name="warning" size={14} style={{ color: SPYNE.warningInk }} />
        </div>
      )}

      <div className={cn('mb-3 flex items-start justify-between gap-2', customer.needsAttention && 'pr-6')}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
            style={{ background: bg }}
          >
            {customer.initials}
          </div>
          <span className="truncate text-sm font-semibold text-spyne-text">{customer.name}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs font-medium tabular-nums text-spyne-text-secondary">{leadDisplayId(customer.id)}</span>
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ background: assigneeBg }}
            title={customer.salesperson}
          >
            {salespersonInitials(customer.salesperson)}
          </div>
        </div>
      </div>

      <div className="mb-3 space-y-2.5 rounded-xl border border-spyne-border bg-spyne-bg px-3 py-3">
        <SwimlaneDetailRow
          icon="language"
          label="Website"
          value={
            <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-spyne-border bg-spyne-surface px-2.5 py-1 text-[11px] font-medium text-spyne-text">
              <MaterialSymbol name="link" size={12} className="shrink-0 text-spyne-text-secondary" aria-hidden />
              <span className="truncate">{website}</span>
            </span>
          }
        />
        <SwimlaneDetailRow
          icon="attach_money"
          label={isService ? 'RO / value' : 'Amount'}
          value={<span className="text-right text-[12px] font-semibold text-spyne-text">{amount}</span>}
        />
        <SwimlaneDetailRow
          icon="person"
          label={isService ? 'Guest' : 'Contact'}
          value={
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-spyne-border bg-spyne-surface py-1 pl-1 pr-2.5 text-[11px] font-medium text-spyne-text">
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold text-white"
                style={{ background: bg }}
              >
                {customer.initials}
              </span>
              <span className="truncate">{customer.name}</span>
            </span>
          }
        />
        <div className="flex gap-3">
          <div className="flex w-[88px] shrink-0 items-center gap-1.5 text-spyne-text-secondary">
            <MaterialSymbol name="label" size={14} className="shrink-0 opacity-80" aria-hidden />
            <span className="text-[11px]">Categories</span>
          </div>
          <div className="flex min-w-0 max-w-full flex-1 flex-nowrap justify-end gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
            {tags.map((t) => {
              const pal = SWIMLANE_TAG_PALETTES[t.palette % SWIMLANE_TAG_PALETTES.length]
              return (
                <span
                  key={t.key}
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: pal.bg, color: pal.color }}
                >
                  {t.label}
                </span>
              )
            })}
          </div>
        </div>
        <SwimlaneDetailRow
          icon="calendar_today"
          label="Close date"
          value={<span className="text-right text-[12px] font-semibold text-spyne-text">{closeLbl}</span>}
        />
      </div>

      <p className="mb-3 line-clamp-2 text-[11px] font-medium leading-snug text-spyne-text-secondary">{customer.vehicle}</p>

      {temp && (
        <div className="mb-3 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: temp.color }} />
          <span className="text-[10px] font-semibold" style={{ color: temp.color }}>
            {temp.label}
            {!isService && customer.source ? ` · ${customer.source}` : ''}
          </span>
        </div>
      )}

      {statusLabel && (
        <div className="mb-3">
          <span className="spyne-badge spyne-badge-neutral inline-flex text-[10px]">{statusLabel}</span>
        </div>
      )}

      {customer.notes && (
        <p className="mb-3 border-t border-spyne-border pt-2.5 text-[10px] leading-relaxed text-spyne-text-secondary">
          {customer.notes.length > 72 ? `${customer.notes.slice(0, 72)}…` : customer.notes}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between border-t border-spyne-border pt-3 text-[11px] text-spyne-text-secondary">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1" title="Action items">
            <MaterialSymbol name="attach_file" size={14} className="opacity-70" aria-hidden />
            <span className="tabular-nums">{fileCount}</span>
          </span>
          <span className="inline-flex items-center gap-1" title="Messages">
            <MaterialSymbol name="chat_bubble" size={14} className="opacity-70" aria-hidden />
            <span className="tabular-nums">{commentCount}</span>
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-spyne-text-secondary">
          <MaterialSymbol name="schedule" size={14} className="opacity-70" aria-hidden />
          <span>{customer.lastContact}</span>
        </span>
      </div>
    </div>
  )
}

function SwimlaneView({ data, onViewProfile, emptyColumnLabel = 'No leads', isService = false }) {
  return (
    <div
      className="-mx-max2-page max-w-[100vw] min-w-0 w-full overflow-x-auto overscroll-x-contain px-max2-page pb-1 sm:max-w-none"
      role="region"
      aria-label="Lead pipeline columns"
    >
      <div
        className="grid w-max min-w-full items-start gap-4"
        style={{
          minWidth: `${SWIMLANE_GRID_MIN_WIDTH_PX}px`,
          gridTemplateColumns: `repeat(${SWIMLANE_COLS.length}, minmax(${SWIMLANE_COL_MIN_WIDTH_PX}px, 1fr))`,
        }}
      >
        {SWIMLANE_COLS.map((col) => {
          const cards = data
            .filter((c) => c.swimlaneStage === col.key)
            .sort((a, b) => {
              const tDiff = (TEMP_ORDER[a.temperature] ?? 3) - (TEMP_ORDER[b.temperature] ?? 3)
              if (tDiff !== 0) return tDiff
              return b.lastInteractedTs - a.lastInteractedTs
            })
          return (
            <div
              key={col.key}
              className="flex min-w-0 flex-col rounded-2xl border border-spyne-border p-3"
              style={swimlaneColumnSurface}
            >
              <div className="mb-3 flex items-center justify-between gap-2 px-0.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-xs font-semibold text-spyne-text">{col.label}</span>
                  <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full border border-spyne-border bg-spyne-surface px-1.5 text-[11px] font-semibold tabular-nums text-spyne-text-secondary">
                    {cards.length}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-spyne-text-secondary transition-colors hover:bg-spyne-surface hover:text-spyne-text"
                    aria-label={`More actions for ${col.label}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MaterialSymbol name="more_horiz" size={20} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-spyne-text-secondary transition-colors hover:bg-spyne-surface hover:text-spyne-text"
                    aria-label={`Add lead to ${col.label}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MaterialSymbol name="add" size={20} aria-hidden />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {cards.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-spyne-border bg-spyne-surface/60 px-3 py-8 text-center text-[11px] text-spyne-text-secondary">
                    {emptyColumnLabel}
                  </div>
                ) : (
                  cards.map((c) => (
                    <SwimlaneCard key={c.id} customer={c} onViewProfile={onViewProfile} isService={isService} />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function CustomerListingPage({ onViewProfile, department = 'sales' }) {
  const isService = department === 'service'
  const roster = isService ? serviceLeadsData : customersData

  const [search,       setSearch]       = useState('')
  const [filter,       setFilter]       = useState('all')
  const [selectedId,   setSelectedId]   = useState(null)
  const [tooltipId,    setTooltipId]    = useState(null)
  const [view,         setView]         = useState(isService ? 'table' : 'swimlane')
  const [expandedNote, setExpandedNote] = useState(null) // customer id with note open
  const [editedNotes,  setEditedNotes]  = useState({})   // local edits: { [id]: string }

  const sorted = [...roster].sort((a, b) => b.lastInteractedTs - a.lastInteractedTs)

  const filtered = sorted.filter((c) => {
    const q = search.toLowerCase()
    const roQ = (c.roSummary && c.roSummary.toLowerCase()) || ''
    const stageQ = (c.serviceStageLabel && c.serviceStageLabel.toLowerCase()) || ''
    const matchSearch =
      c.name.toLowerCase().includes(q) ||
      c.vehicle.toLowerCase().includes(q) ||
      c.salesperson.toLowerCase().includes(q) ||
      (isService && (roQ.includes(q) || stageQ.includes(q)))
    const matchFilter =
      filter === 'all' ||
      (filter === 'cooling' && c.engagementTrend === 'cooling') ||
      (filter === 'needs_attention' && c.needsAttention) ||
      c.outcome === filter
    return matchSearch && matchFilter
  })

  function getNoteText(c) {
    return editedNotes[c.id] !== undefined ? editedNotes[c.id] : (c.notes ?? '')
  }

  const selectedCustomer = roster.find((c) => c.id === selectedId) ?? null
  const visibleCols = (isService ? SERVICE_COLS : COLS).map((c) =>
    isService && c === 'Advisor' ? SERVICE_CONSOLE_TAB_CONTENT.customers.columnAdvisor : c,
  )

  return (
    <div className="relative min-w-0 spyne-animate-fade-in">
      <div className={spyneSalesLayout.pageStack}>
        <div className="min-w-0 space-y-6">
        {/* VINI decay-risk banner */}
        <ViniTabStrip
          insight={`${roster.length} ${isService ? 'guests' : 'leads'} in the pipeline. VINI ranks them by decay risk — re-engage the ones cooling fastest before they go cold, not after.`}
        />

        {/* Search + filters + view switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-shrink-0" style={{ width: 240 }}>
            <MaterialSymbol
              name="search"
              size={13}
              className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: 10, color: 'var(--spyne-text-muted)' }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isService
                  ? SERVICE_CONSOLE_TAB_CONTENT.customers.searchPlaceholder
                  : 'Search name, vehicle, salesperson…'
              }
              className="spyne-input w-full"
              style={{ paddingLeft: 30, fontSize: 12 }}
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`spyne-pill ${filter === f.id ? 'spyne-pill-active' : ''}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          </div>
          <SpyneSegmentedControl
            aria-label={isService ? SERVICE_CONSOLE_TAB_CONTENT.customers.viewAriaLabel : 'Leads view'}
            className="shrink-0"
          >
            <SpyneSegmentedButton active={view === 'swimlane'} onClick={() => setView('swimlane')}>
              <MaterialSymbol name="view_column" size={14} aria-hidden />
              Pipeline
            </SpyneSegmentedButton>
            <SpyneSegmentedButton active={view === 'table'} onClick={() => setView('table')}>
              <MaterialSymbol name="view_list" size={14} aria-hidden />
              Table
            </SpyneSegmentedButton>
          </SpyneSegmentedControl>
        </div>

        {/* Swimlane view */}
        {view === 'swimlane' && (
          <SwimlaneView
            data={filtered}
            onViewProfile={(id) => setSelectedId(id)}
            emptyColumnLabel={isService ? SERVICE_CONSOLE_TAB_CONTENT.customers.swimlaneEmpty : 'No leads'}
            isService={isService}
          />
        )}

        {/* Table view */}
        {view === 'table' && (
          <div className="spyne-card overflow-hidden">
            <div className="overflow-x-auto">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--spyne-border)', background: 'var(--spyne-bg)' }}>
                    {visibleCols.map((col) => (
                      <th
                        key={col}
                        style={{
                          textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600,
                          letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                          color: /last interaction/i.test(col) ? 'var(--spyne-brand)' : 'var(--spyne-text-muted)',
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const stageCls = STAGE_BADGE_CLASS[c.buyingStage] || STAGE_BADGE_CLASS.RESEARCH
                    const srcCls   = SOURCE_BADGE_CLASS[c.source]     || SOURCE_BADGE_CLASS.Referral
                    const temp   = TEMP_CONFIG[c.temperature]
                    const active = selectedId === c.id
                    const hasNote = c.notes || editedNotes[c.id]
                    const noteOpen = expandedNote === c.id
                    const leadStatusLabel = isService && c.serviceStageLabel ? c.serviceStageLabel : STAGE_LABELS[c.buyingStage]

                    return (
                      <React.Fragment key={c.id}>
                      <tr
                        onClick={() => setSelectedId(active ? null : c.id)}
                        style={{
                          borderBottom: noteOpen ? 'none' : '1px solid var(--spyne-border)',
                          background: active ? 'var(--spyne-brand-subtle)' : 'var(--spyne-surface)',
                          cursor: 'pointer', transition: 'background 150ms',
                        }}
                        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--spyne-bg)' }}
                        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'var(--spyne-surface)' }}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                              className="flex items-center justify-center rounded-full text-white font-bold flex-shrink-0"
                              style={{ width: 32, height: 32, fontSize: 11, background: avatarBg(c.name) }}
                            >
                              {c.initials}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--spyne-text-primary)' }}>{c.name}</p>
                                {c.needsAttention && (
                                  <span title={c.attentionReason} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', background: SPYNE_SOFT_BG.warning, flexShrink: 0 }}>
                                    <MaterialSymbol name="warning" size={9} style={{ color: SPYNE.warningInk }} />
                                  </span>
                                )}
                              </div>
                              <span className={cn('spyne-badge mt-0.5 inline-flex', srcCls)}>
                                {c.source}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className={cn('spyne-badge', stageCls)}>
                            {leadStatusLabel}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {temp && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: temp.color, display: 'inline-block', flexShrink: 0 }} />
                              <span style={{ fontSize: 12, fontWeight: 600, color: temp.color }}>{temp.label}</span>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', minWidth: 160 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--spyne-text-primary)' }}>{c.vehicle}</p>
                          {isService ? (
                            c.roSummary && (
                              <p style={{ fontSize: 11, color: 'var(--spyne-text-muted)', marginTop: 2, lineHeight: 1.35 }}>
                                {c.roSummary}
                              </p>
                            )
                          ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <span style={{ fontSize: 11, color: 'var(--spyne-text-muted)', fontVariantNumeric: 'tabular-nums' }}>${c.vehiclePrice.toLocaleString()}</span>
                            {c.vehicleDaysOnLot > 30 && (
                              <span style={{ fontSize: 11, color: 'var(--spyne-warning-text)', fontWeight: 600 }}>⚠ {c.vehicleDaysOnLot}d on lot</span>
                            )}
                          </div>
                          )}
                        </td>
                        <td
                          style={{ padding: '12px 16px', minWidth: 180, position: 'relative' }}
                          onMouseEnter={() => setTooltipId(c.id)}
                          onMouseLeave={() => setTooltipId(null)}
                        >
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--spyne-text-primary)' }}>{c.lastContact}</p>
                          <p style={{ fontSize: 11, color: 'var(--spyne-text-muted)', marginTop: 2, maxWidth: 200, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            {c.lastInteractionSummary}
                          </p>
                          {tooltipId === c.id && (
                            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50, width: 280, background: 'var(--spyne-text-primary)', color: '#fff', borderRadius: 10, padding: '10px 14px', fontSize: 12, lineHeight: 1.6, boxShadow: 'var(--spyne-shadow-lg)', pointerEvents: 'none' }}>
                              <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{c.lastInteracted}</p>
                              {c.lastInteractionSummary}
                            </div>
                          )}
                        </td>
                        {!selectedCustomer && (
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                            <p style={{ fontSize: 13, color: 'var(--spyne-text-secondary)' }}>{c.salesperson}</p>
                          </td>
                        )}
                        {!selectedCustomer && (
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                            {c.nextAppointment ? (
                              <div>
                                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--spyne-warning-text)' }}>{c.nextAppointment.date}</p>
                                <p style={{ fontSize: 11, color: 'var(--spyne-text-muted)' }}>{c.nextAppointment.type}</p>
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, color: 'var(--spyne-text-muted)' }}>—</span>
                            )}
                          </td>
                        )}
                        <td style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <a href={`tel:${c.phone.replace(/\D/g, '')}`} className="spyne-btn-ghost" style={{ padding: '4px 8px', height: 28 }} aria-label={`Call ${c.name}`}>
                              <MaterialSymbol name="phone" size={12} />
                            </a>
                            <button className="spyne-btn-ghost" style={{ padding: '4px 8px', height: 28 }} aria-label={`Message ${c.name}`}>
                              <MaterialSymbol name="chat" size={12} />
                            </button>
                            <button
                              className="spyne-btn-ghost"
                              style={{ padding: '4px 8px', height: 28, color: hasNote ? 'var(--spyne-brand)' : 'var(--spyne-text-muted)' }}
                              aria-label={`Notes for ${c.name}`}
                              onClick={(e) => { e.stopPropagation(); setExpandedNote(noteOpen ? null : c.id) }}
                            >
                              <MaterialSymbol name="description" size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {noteOpen && (
                        <tr key={`${c.id}-note`} style={{ borderBottom: '1px solid var(--spyne-border)', background: active ? 'var(--spyne-brand-subtle)' : 'var(--spyne-bg)' }}>
                          <td colSpan={visibleCols.length} style={{ padding: '0 16px 12px 58px' }}>
                            <textarea
                              value={getNoteText(c)}
                              onChange={(e) => setEditedNotes(n => ({ ...n, [c.id]: e.target.value }))}
                              placeholder="Add a note…"
                              rows={2}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: '100%', resize: 'vertical', fontSize: 12, lineHeight: 1.5,
                                padding: '8px 10px', borderRadius: 'var(--spyne-radius-md)',
                                border: '1px solid var(--spyne-border)', background: 'var(--spyne-surface)',
                                color: 'var(--spyne-text-primary)', fontFamily: 'inherit', outline: 'none',
                              }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                              <button
                                className="spyne-btn-primary"
                                style={{ height: 28, fontSize: 12, padding: '0 12px' }}
                                onClick={(e) => { e.stopPropagation(); setExpandedNote(null) }}
                              >
                                Save
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={visibleCols.length} style={{ padding: '48px 16px', textAlign: 'center' }}>
                        <p style={{ fontSize: 13, color: 'var(--spyne-text-muted)' }}>No customers match your search or filter.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>
      </div>

      {selectedCustomer && (
        <CustomerOverviewPanel
          customer={selectedCustomer}
          onClose={() => setSelectedId(null)}
          onViewProfile={() => {
            setSelectedId(null)
            onViewProfile(selectedCustomer.id)
          }}
        />
      )}
    </div>
  )
}
