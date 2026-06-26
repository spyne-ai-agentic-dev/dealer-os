"use client"

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { SpyneLineTab, SpyneLineTabStrip } from '@/components/max-2/spyne-line-tabs'
import { max2Classes } from '@/lib/design-system/max-2'
import { cn } from '@/lib/utils'
import { CHART_SERIES, SPYNE_DRAWER_SHADOW } from '../spyne-palette'
import { MaterialSymbol } from '@/components/max-2/material-symbol'
import ConversationThread from './ConversationThread'
import { buildVehicles } from './ServiceCustomerProfile'

// ── Stage config ───────────────────────────────────────────

const STAGES = [
  { key: 'RESEARCH',    label: 'Just Looking' },
  { key: 'SHOPPING',    label: 'Comparing Options' },
  { key: 'EVALUATION',  label: 'Ready to Visit' },
  { key: 'NEGOTIATION', label: 'Talking Numbers' },
  { key: 'CLOSING',     label: 'Ready to Buy' },
]

const STAGE_LABELS = Object.fromEntries(STAGES.map(s => [s.key, s.label]))

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

// AI opener per stage — salesperson reads this before calling
const AI_OPENERS = {
  RESEARCH:    'Lead is early stage — don\'t push. Lead with curiosity: ask what brought them in and what they\'re driving today. Goal is to get them talking, not to close.',
  SHOPPING:    'Actively comparing options. Offer a concrete side-by-side vs their likely alternative. Ask what\'s most important — price, payment, or features. Don\'t discount yet.',
  EVALUATION:  'Ready to visit. Confirm the appointment and pre-sell the experience. Mention a specific vehicle you\'ve set aside. Give them a reason to show up.',
  NEGOTIATION: 'In numbers. Come with a clear best offer and one back-pocket concession. Don\'t open with discounts — let them make the first move. Have trade-in research ready.',
  CLOSING:     'Ready to buy. Don\'t oversell. Confirm delivery timeline, F&I process, and any open items. Remove friction — they\'ve already decided.',
}

// Channel filter tabs — Conversation tab only (Appointments + Action Items are in Overview)
const CHANNEL_FILTERS = [
  { id: 'all',  label: 'All'   },
  { id: 'sms',  label: 'SMS'   },
  { id: 'call', label: 'Calls' },
]

// ── Helpers ────────────────────────────────────────────────

function avatarBg(name = '') {
  const colors = CHART_SERIES
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % colors.length
  return colors[h]
}

// ── Left column components ─────────────────────────────────

function AiOpener({ stage, conversationOpener }) {
  const text = conversationOpener || AI_OPENERS[stage] || AI_OPENERS.RESEARCH
  return (
    <div style={{
      borderLeft: '3px solid var(--spyne-brand)',
      border: '1px solid var(--spyne-brand-muted)',
      borderLeft: '3px solid var(--spyne-brand)',
      borderRadius: 'var(--spyne-radius-md)',
      background: 'var(--spyne-brand-subtle)',
      padding: '10px 12px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
        textTransform: 'uppercase', color: 'var(--spyne-brand)', marginBottom: 6,
      }}>
        <MaterialSymbol name="auto_awesome" size={11} />Lead with this
      </div>
      <p style={{ fontSize: 12, color: 'var(--spyne-text-primary)', lineHeight: 1.6 }}>
        {text}
      </p>
    </div>
  )
}

function StageProgress({ current }) {
  const currentIdx = STAGES.findIndex(s => s.key === current)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {STAGES.map((stage, i) => {
        const isActive = stage.key === current
        const isPast   = i < currentIdx
        return (
          <div key={stage.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', position: 'relative' }}>
            {/* Connecting line */}
            {i < STAGES.length - 1 && (
              <div style={{
                position: 'absolute', left: 5, top: 20, width: 2, height: 16,
                background: isPast || isActive ? 'var(--spyne-brand)' : 'var(--spyne-border)',
                zIndex: 0,
              }} />
            )}
            {/* Dot */}
            <div style={{
              width: 12, height: 12, borderRadius: '50%', flexShrink: 0, zIndex: 1,
              background: isActive ? 'var(--spyne-brand)' : isPast ? 'var(--spyne-brand)' : 'var(--spyne-border)',
              border: isActive ? '2px solid var(--spyne-brand)' : isPast ? 'none' : '2px solid var(--spyne-border-strong)',
              boxShadow: isActive ? '0 0 0 3px var(--spyne-brand-subtle)' : 'none',
              opacity: isPast ? 0.45 : 1,
            }} />
            {/* Label */}
            <span style={{
              fontSize: 12,
              fontWeight: isActive ? 700 : 400,
              color: isActive ? 'var(--spyne-brand)' : isPast ? 'var(--spyne-text-muted)' : 'var(--spyne-text-secondary)',
            }}>
              {stage.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function SignalRow({ label, value, warning }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--spyne-text-muted)' }}>
        {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 500, color: warning ? 'var(--spyne-warning-text)' : 'var(--spyne-text-primary)' }}>
        {value}
        {warning && <span style={{ marginLeft: 5, fontSize: 11 }}>⚠</span>}
      </span>
    </div>
  )
}

// ── Event marker (inline in conversation thread) ──────────

const EVENT_MARKER_CONFIG = {
  stage_change:  { icon: 'swap_horiz',   color: 'var(--spyne-brand)'        },
  appointment:   { icon: 'event',        color: 'var(--spyne-success-text)' },
  agent_action:  { icon: 'bolt',         color: 'var(--spyne-warning-text)' },
}

function EventMarker({ entry }) {
  const cfg = EVENT_MARKER_CONFIG[entry.type]
  if (!cfg) return null
  let label = ''
  if (entry.type === 'stage_change')  label = `Stage updated: ${entry.fromStage} → ${entry.toStage}`
  if (entry.type === 'appointment')   label = entry.title ? `${entry.title}${entry.vehicle ? ` · ${entry.vehicle}` : ''}` : 'Appointment'
  if (entry.type === 'agent_action')  label = entry.body?.replace('Action item created: ', '') || 'Action item'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--spyne-border)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <MaterialSymbol name={cfg.icon} size={11} style={{ color: cfg.color }} />
        <span style={{ fontSize: 11, color: 'var(--spyne-text-muted)', whiteSpace: 'nowrap', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </span>
        <span style={{ fontSize: 10, color: 'var(--spyne-text-muted)', opacity: 0.6, marginLeft: 2 }}>· {entry.timestamp}</span>
      </div>
      <div style={{ flex: 1, height: 1, background: 'var(--spyne-border)' }} />
    </div>
  )
}

// ── Filtered thread ────────────────────────────────────────

const MESSAGE_TYPES = new Set(['sms', 'call', 'chat'])
const EVENT_TYPES   = new Set(['stage_change', 'agent_action', 'appointment'])

function FilteredThread({ timeline, filter }) {
  if (!timeline || timeline.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
        <p style={{ fontSize: 13, color: 'var(--spyne-text-muted)' }}>No conversation history yet.</p>
      </div>
    )
  }

  // In 'all' view: show messages + inline event markers; in filtered view: messages only
  const showMarkers = filter === 'all'
  const filtered = filter === 'all'
    ? timeline
    : timeline.filter(e => e.type === filter)

  const sorted = [...filtered].sort((a, b) => b.sortKey - a.sortKey)

  // Group into day buckets
  const groups = []
  let lastDay = null
  sorted.forEach(entry => {
    const day = entry.dayLabel || entry.timestamp?.split(' ')[0] || 'Earlier'
    if (day !== lastDay) { groups.push({ day, entries: [] }); lastDay = day }
    groups[groups.length - 1].entries.push(entry)
  })

  return (
    <div>
      {groups.map((group, gi) => {
        const messages = group.entries.filter(e => MESSAGE_TYPES.has(e.type))
        const markers  = group.entries.filter(e => EVENT_TYPES.has(e.type))
        // interleave by sortKey descending
        const all = [...group.entries].sort((a, b) => b.sortKey - a.sortKey)
        return (
          <div key={gi}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 0 8px', position: 'sticky', top: 0,
              background: 'var(--spyne-surface)', zIndex: 2,
            }}>
              <div style={{ flex: 1, height: 1, background: 'var(--spyne-border)' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--spyne-text-muted)', whiteSpace: 'nowrap' }}>{group.day}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--spyne-border)' }} />
            </div>
            {showMarkers ? (
              // Render messages and event markers interleaved
              all.map(entry =>
                MESSAGE_TYPES.has(entry.type)
                  ? <ConversationThread key={entry.id} timeline={[entry]} />
                  : <EventMarker key={entry.id} entry={entry} />
              )
            ) : (
              <ConversationThread timeline={messages} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Section label ──────────────────────────────────────────

const SECTION_LABEL = {
  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.07em', color: 'var(--spyne-text-muted)', marginBottom: 10,
}

// ── Service quick CTA ──────────────────────────────────────

function QuickCta({ glyph, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="spyne-focus-ring"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
        padding: '10px 6px', borderRadius: 'var(--spyne-radius-md)',
        border: '1px solid var(--spyne-border)', background: 'var(--spyne-surface)',
        cursor: 'pointer', textAlign: 'center', transition: 'background 150ms, border-color 150ms',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--spyne-brand-subtle)'; e.currentTarget.style.borderColor = 'var(--spyne-brand-muted)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--spyne-surface)'; e.currentTarget.style.borderColor = 'var(--spyne-border)' }}
    >
      <span className="inline-flex" style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'var(--spyne-brand-subtle)', color: 'var(--spyne-brand)' }}>
        <MaterialSymbol name={glyph} size={17} />
      </span>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--spyne-text-primary)', lineHeight: 1.2 }}>{label}</span>
    </button>
  )
}

// ── Service snapshot (replaces the sales buying-stage funnel) ──────────────

const RO_ITEM_STATUS = {
  Approved: { bg: 'var(--spyne-success-subtle)', fg: 'var(--spyne-success-text)' },
  'Pending approval': { bg: 'var(--spyne-warning-subtle)', fg: 'var(--spyne-warning-ink)' },
}

function ServiceSnapshot({ customer }) {
  const vehicles = buildVehicles(customer)
  const vehicle = vehicles[0]
  const openRo = vehicles.map(v => v.openRo).find(Boolean)
  const rec = vehicle?.recommended?.[0]

  return (
    <>
      {/* Vehicles */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--spyne-border)' }}>
        <p style={SECTION_LABEL}>{vehicles.length > 1 ? `Vehicles (${vehicles.length})` : 'Vehicle'}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {vehicles.map((v) => (
            <div key={v.vin} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="inline-flex" style={{ width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', background: 'var(--spyne-brand-subtle)', color: 'var(--spyne-brand)', flexShrink: 0 }}>
                <MaterialSymbol name="directions_car" size={18} />
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--spyne-text-primary)' }}>{v.name}</p>
                <p style={{ fontSize: 11, color: 'var(--spyne-text-muted)' }}>{v.mileage.toLocaleString()} mi · VIN …{v.vin.slice(-6)}</p>
              </div>
              {v.openRo && <span className="spyne-badge spyne-badge-info" style={{ fontSize: 9 }}>Open RO</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Open repair order + pending items */}
      {openRo && (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--spyne-border)' }}>
          <p style={SECTION_LABEL}>Open repair order</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--spyne-text-primary)' }}>{openRo.ro}</span>
            <span style={{ fontSize: 11, color: 'var(--spyne-text-muted)' }}>{openRo.mileage.toLocaleString()} mi · {openRo.date}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {openRo.items.map((it, i) => {
              const st = RO_ITEM_STATUS[it.status] || RO_ITEM_STATUS.Approved
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="spyne-badge" style={{ fontSize: 9, background: st.bg, color: st.fg, flexShrink: 0 }}>{it.status}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--spyne-text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--spyne-text-primary)', fontVariantNumeric: 'tabular-nums' }}>${it.total}</span>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 11.5 }}>
            <span style={{ color: 'var(--spyne-success-text)' }}>Approved <b>${openRo.approvedTotal}</b></span>
            <span style={{ color: 'var(--spyne-warning-ink)' }}>Pending <b>${openRo.pendingTotal}</b></span>
            <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--spyne-text-primary)' }}>Est. ${openRo.approvedTotal + openRo.pendingTotal}</span>
          </div>
        </div>
      )}

      {/* Recommended next service */}
      {rec && (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--spyne-border)' }}>
          <p style={SECTION_LABEL}>Recommended next service</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--spyne-text-primary)' }}>{rec.mileage.toLocaleString()} mile service</p>
              <p style={{ fontSize: 11, color: 'var(--spyne-text-muted)' }}>Due ~{rec.label} · {rec.items.length} items</p>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--spyne-text-primary)', fontVariantNumeric: 'tabular-nums' }}>~${rec.est}</span>
          </div>
        </div>
      )}
    </>
  )
}

// ── Main panel ─────────────────────────────────────────────

export default function CustomerOverviewPanel({ customer, onClose, onViewProfile, inline = false, department = 'sales', onNavigate }) {
  const [panelTab,      setPanelTab]      = useState('overview')
  const [channelFilter, setChannelFilter] = useState('all')

  // Always land on Overview when a new customer opens
  useEffect(() => { setPanelTab('overview') }, [customer?.id])

  if (!customer) return null

  const isService = department === 'service'

  const stageCls = STAGE_BADGE_CLASS[customer.buyingStage] || STAGE_BADGE_CLASS.RESEARCH
  const srcCls   = SOURCE_BADGE_CLASS[customer.source] || SOURCE_BADGE_CLASS.Referral

  const trendColor =
    customer.engagementTrend === 'improving' ? 'var(--spyne-success-text)' :
    customer.engagementTrend === 'cooling'   ? 'var(--spyne-danger-text)'  : 'var(--spyne-text-muted)'
  const trendSymbol =
    customer.engagementTrend === 'improving' ? 'trending_up' :
    customer.engagementTrend === 'cooling'   ? 'trending_down' : 'trending_flat'

  // Last message touchpoint for Overview
  const lastMessage = customer.timeline
    ? [...customer.timeline].sort((a, b) => b.sortKey - a.sortKey).find(e => MESSAGE_TYPES.has(e.type))
    : null

  // Signal fields — only render what exists
  const vehicleWarning = customer.vehicleDaysOnLot > 30
  const signalFields = [
    customer.budget       && { label: 'Budget',          value: customer.budget },
    customer.financeType  && { label: 'Finance',          value: customer.financeType },
    customer.vehicle      && { label: 'Vehicle Interest', value: customer.vehicle, warning: vehicleWarning },
    customer.vehicleDaysOnLot > 0 && { label: 'Days on Lot', value: `${customer.vehicleDaysOnLot}d`, warning: vehicleWarning },
    customer.vehiclePrice && { label: 'List Price',       value: `$${customer.vehiclePrice.toLocaleString()}` },
    customer.features?.length && { label: 'Features',    value: Array.isArray(customer.features) ? customer.features.join(' · ') : customer.features },
    customer.useCase      && { label: 'Use Case',         value: customer.useCase },
  ].filter(Boolean)

  const inner = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, overflow: 'hidden', boxSizing: 'border-box' }}>

      {/* ── Fixed header ── */}
      <div style={{ flexShrink: 0, padding: '16px 20px 12px', borderBottom: '1px solid var(--spyne-border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div
            className="flex items-center justify-center rounded-full text-white font-bold flex-shrink-0"
            style={{ width: 42, height: 42, fontSize: 14, background: avatarBg(customer.name) }}
          >
            {customer.initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <p className={max2Classes.pageTitle}>{customer.name}</p>
                {customer.phone && (
                  <a href={`tel:${customer.phone}`} style={{ fontSize: 12, color: 'var(--spyne-brand)', textDecoration: 'none', display: 'block', marginTop: 1 }}>
                    {customer.phone}
                  </a>
                )}
              </div>
              <button onClick={onClose} className="spyne-btn-ghost" style={{ padding: '4px 6px', height: 28, flexShrink: 0, border: '1px solid var(--spyne-border)' }} aria-label="Close panel">
                <MaterialSymbol name="close" size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <span className={cn('spyne-badge', stageCls)}>
                {customer.serviceStageLabel || STAGE_LABELS[customer.buyingStage] || customer.buyingStage}
              </span>
              <span className={cn('spyne-badge', srcCls)}>{customer.source}</span>
              <span style={{ fontSize: 11, color: 'var(--spyne-text-muted)' }}>{customer.salesperson}</span>
            </div>
            {customer.engagementDetail && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 7 }}>
                <MaterialSymbol name={trendSymbol} size={10} style={{ color: trendColor, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: trendColor }}>{customer.engagementDetail}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Panel tabs — service keeps Overview only (conversation opens via CTA) ── */}
      {!isService && (
        <div style={{ flexShrink: 0, padding: '0 20px' }}>
          <SpyneLineTabStrip embedded compact>
            <SpyneLineTab active={panelTab === 'overview'}      onClick={() => setPanelTab('overview')}>Overview</SpyneLineTab>
            <SpyneLineTab active={panelTab === 'conversation'}  onClick={() => setPanelTab('conversation')}>Conversation</SpyneLineTab>
          </SpyneLineTabStrip>
        </div>
      )}

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

        {/* ── OVERVIEW TAB ── */}
        {panelTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* 1 — Lead With This */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--spyne-border)' }}>
              <AiOpener stage={customer.buyingStage} conversationOpener={customer.conversationOpener} />
            </div>

            {/* Service quick CTAs — open conversation / appointments / action items */}
            {isService && (
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--spyne-border)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <QuickCta glyph="forum" label="Latest conversation" onClick={() => onViewProfile?.()} />
                <QuickCta glyph="event" label="Appointments" onClick={() => { onClose?.(); onNavigate?.('appointments') }} />
                <QuickCta glyph="checklist" label="Action items" onClick={() => { onClose?.(); onNavigate?.('action-items') }} />
              </div>
            )}

            {isService ? (
              /* 2 — Service snapshot (vehicles · open RO · recommended) */
              <ServiceSnapshot customer={customer} />
            ) : (
              <>
                {/* 2 — Buying Stage */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--spyne-border)' }}>
                  <p style={SECTION_LABEL}>Buying Stage</p>
                  <StageProgress current={customer.buyingStage} />
                </div>

                {/* 3 — Key Signals */}
                {signalFields.length > 0 && (
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--spyne-border)' }}>
                    <p style={SECTION_LABEL}>Key Signals</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
                      {signalFields.map(f => (
                        <SignalRow key={f.label} label={f.label} value={f.value} warning={f.warning} />
                      ))}
                    </div>
                    {customer.lastSignal && (
                      <p style={{ fontSize: 12, color: 'var(--spyne-text-secondary)', fontStyle: 'italic', marginTop: 14, lineHeight: 1.55, borderTop: '1px solid var(--spyne-border)', paddingTop: 12 }}>
                        "{customer.lastSignal}"
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* 4 — Action Items */}
            {customer.actionItems?.length > 0 && (
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--spyne-border)' }}>
                <p style={SECTION_LABEL}>Action Items</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {customer.actionItems.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <MaterialSymbol name="bolt" size={13} style={{ color: 'var(--spyne-brand)', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: 'var(--spyne-text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item}
                      </span>
                      <button className="spyne-btn-ghost" style={{ fontSize: 11, padding: '2px 8px', height: 26, flexShrink: 0 }}>
                        Do it <MaterialSymbol name="arrow_forward" size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5 — Next Appointment */}
            {customer.nextAppointment && (
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--spyne-border)' }}>
                <p style={SECTION_LABEL}>Next Appointment</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--spyne-success-subtle)', border: '1px solid var(--spyne-success-muted)', borderRadius: 'var(--spyne-radius)' }}>
                  <MaterialSymbol name="event" size={13} style={{ color: 'var(--spyne-success-text)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--spyne-success-text)' }}>
                    {customer.nextAppointment.date}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--spyne-success-text)', opacity: 0.75 }}>
                    · {customer.nextAppointment.type}
                  </span>
                </div>
              </div>
            )}

            {/* 6 — Last Touchpoint */}
            {lastMessage && (
              <div style={{ padding: '16px 20px' }}>
                <p style={SECTION_LABEL}>Last Touchpoint</p>
                <div style={{ background: 'var(--spyne-surface)', border: '1px solid var(--spyne-border)', borderRadius: 'var(--spyne-radius)', padding: '10px 12px' }}>
                  <p style={{ fontSize: 11, color: 'var(--spyne-text-muted)', marginBottom: 5 }}>
                    {lastMessage.timestamp} · {lastMessage.agent ? 'Vini AI' : 'Customer'}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--spyne-text-secondary)', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {lastMessage.body}
                  </p>
                  <button
                    onClick={() => { if (isService) { onViewProfile?.() } else { setPanelTab('conversation'); setChannelFilter('all') } }}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, color: 'var(--spyne-brand)', fontWeight: 600, marginTop: 8 }}
                  >
                    View conversation →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CONVERSATION TAB ── */}
        {panelTab === 'conversation' && (
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ flexShrink: 0, position: 'sticky', top: 0, background: 'var(--spyne-surface)', zIndex: 3 }} className="px-5 pt-2.5">
              <SpyneLineTabStrip embedded compact className="min-w-0 overflow-x-auto">
                {CHANNEL_FILTERS.map(f => (
                  <SpyneLineTab key={f.id} active={channelFilter === f.id} onClick={() => setChannelFilter(f.id)} className="shrink-0 whitespace-nowrap">
                    {f.label}
                  </SpyneLineTab>
                ))}
              </SpyneLineTabStrip>
            </div>
            <div style={{ padding: '8px 16px 16px' }}>
              <FilteredThread timeline={customer.timeline} filter={channelFilter} />
            </div>
          </div>
        )}
      </div>

      {/* ── Fixed footer ── */}
      <div style={{ flexShrink: 0, display: 'flex', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--spyne-border)', minWidth: 0 }}>
        <a href={`tel:${customer.phone?.replace(/\D/g, '')}`} className="spyne-btn-secondary" style={{ flex: 1, minWidth: 0, justifyContent: 'center', textDecoration: 'none', height: 40 }}>
          <MaterialSymbol name="phone" size={13} />Call Now
        </a>
        <button onClick={onViewProfile} className="spyne-btn-primary" style={{ flex: 1, minWidth: 0, justifyContent: 'center', height: 40 }}>
          View Full Profile <MaterialSymbol name="arrow_forward" size={12} />
        </button>
      </div>
    </div>
  )

  /* ── Inline split-pane mode (table view) ── */
  if (inline) {
    return (
      <div style={{ height: '100%', background: 'var(--spyne-surface)' }}>
        {inner}
      </div>
    )
  }

  /* ── Overlay mode — portaled to body so `position: fixed` is viewport-relative.
      Ancestors with `transform` (e.g. `.spyne-animate-fade-in`) otherwise create a
      containing block and fake “margins” around the scrim and drawer. ── */
  const overlay = (
    <div className="console-v2-sales-root max2-spyne">
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.25)', zIndex: 59 }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(720px, 100%)',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        background: 'var(--spyne-surface)',
        borderLeft: '1px solid var(--spyne-border)',
        boxShadow: SPYNE_DRAWER_SHADOW,
        zIndex: 60,
        animation: 'spyne-slide-in-right 200ms cubic-bezier(0.0,0,0.2,1) both',
      }}>
        {inner}
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(overlay, document.body)
}
