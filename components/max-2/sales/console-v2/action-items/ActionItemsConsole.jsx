"use client"

/**
 * Action Items — master/detail console (matches the vini-product reference).
 * LEFT: action items grouped by Customer / Intent / Assignee (or a flat None
 * view), sorted by SLA burn (breaching first). RIGHT: the matching open items
 * stacked in a list — each with what-needs-doing, the source message, assignee,
 * an activity trail, and Resolve / Assign / Incorrect. Manager vs My-queue
 * scope + a manager SLA strip on top. Categorized search, an intent filter, a
 * group-by control, typed resolution, clickable resolved rows, a customer
 * sidebar drawer, a create-item modal, and a read-only rules panel.
 */

import { useEffect, useMemo, useState } from 'react'
import { MaterialSymbol } from '@/components/max-2/material-symbol'
import { max2Classes, spyneSalesLayout } from '@/lib/design-system/max-2'
import { cn } from '@/lib/utils'
import { SpyneLineTab, SpyneLineTabStrip } from '@/components/max-2/spyne-line-tabs'
import { EmptyState, SectionLabel, SpyneSwitch } from '../shared'
import CategorizedSearchBox from './CategorizedSearchBox'
import CreateActionItemModal from './CreateActionItemModal'
import CustomerSidebar from './CustomerSidebar'
import {
  ACTION_ITEMS, INTENT_TAXONOMY, DEPT_BADGE, DEPT_LABEL, CHANNEL_META, CUSTOMERS, USERS,
  CURRENT_USER_ID, CLEARED_TODAY, RESOLVED_TOTAL,
  RESOLUTION_TYPES, RESOLUTION_TYPE_LABEL, RESOLUTION_TYPE_GLYPH,
  ageLabel, ageMinutes, isPastSla, slaBurnRatio, deptOf,
} from './data'

const INCORRECT_REASONS = [
  { value: 'wrong_intent', label: 'Wrong intent' },
  { value: 'not_a_task', label: 'Not a task' },
  { value: 'customer_did_not_say_this', label: "Customer didn't say this" },
  { value: 'duplicate_of_existing', label: 'Duplicate of existing' },
  { value: 'other', label: 'Other' },
]

const GROUP_BY = [
  ['customer', 'Customer', 'person'],
  ['intent', 'Intent', 'sell'],
  ['assignee', 'Assignee', 'badge'],
  ['none', 'None', 'list'],
]

/** Channels that auto-create action items (rules-panel demo seed). */
const CHANNEL_AUTOCREATE_DEFAULTS = {
  call: true, sms: true, chat: true, email: true, hitl_takeover: false, hitl_warm_transfer: false,
}

/** Turn a minted "c-<slug>" id into a readable display name. */
function humanize(id) {
  if (!id) return ''
  return String(id)
    .replace(/^c-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Resolve a display name that tolerates freshly-minted (off-map) customer ids.
 * Prefers the item's typed customer_name (manually-created items carry one since
 * their c-<slug> id is not in the CUSTOMERS map), then the CUSTOMERS map, then a
 * humanized fallback so a raw slug never reaches the UI.
 */
function customerName(customerId, item) {
  return item?.customer_name ?? CUSTOMERS[customerId]?.name ?? humanize(customerId)
}

export function ActionItemsConsole() {
  const [items, setItems] = useState(ACTION_ITEMS)
  const [scope, setScope] = useState('manager') // 'manager' | 'mine'
  const [tab, setTab] = useState('unresolved')
  const [filters, setFilters] = useState({ search: '', assignment: 'all', channel: 'all', dept: 'all', intent: 'all' })
  const [groupBy, setGroupBy] = useState('customer')
  const [selectedGroup, setSelectedGroup] = useState(null)  // group key (customer/intent/assignee) the user picked
  const [selectedItemId, setSelectedItemId] = useState(null) // single action_item_id (None view + search highlight)
  const [expanded, setExpanded] = useState({})
  const [incorrectFor, setIncorrectFor] = useState(null)   // action_item_id awaiting reason
  const [assigningFor, setAssigningFor] = useState(null)   // action_item_id awaiting assignee
  const [resolvingFor, setResolvingFor] = useState(null)   // action_item_id awaiting resolution type
  const [highlightId, setHighlightId] = useState(null)     // action_item_id pulsed after a search pick
  const [sidebarCustomer, setSidebarCustomer] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [resolvedDetailId, setResolvedDetailId] = useState(null) // open resolved/incorrect item in detail
  const [toast, setToast] = useState(null)

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600) }

  const pending = useMemo(() => items.filter((i) => i.status === 'pending'), [items])
  // Resolved + Incorrect honour the Manager/Mine scope just like Unresolved:
  // in 'mine' scope, restrict to the current user's items so the tab COUNTS and
  // LISTS stay consistent across all three tabs.
  const inScope = (i) => scope !== 'mine' || i.assignee_user_id === CURRENT_USER_ID
  const resolved = useMemo(() => items.filter((i) => i.status === 'completed' && inScope(i)), [items, scope])
  const incorrect = useMemo(() => items.filter((i) => i.status === 'incorrect' && inScope(i)), [items, scope])

  const filteredPending = useMemo(() => pending.filter((i) => {
    if (scope === 'mine' && i.assignee_user_id !== CURRENT_USER_ID) return false
    if (filters.assignment === 'unassigned' && i.assignee_user_id) return false
    if (filters.assignment === 'assigned' && !i.assignee_user_id) return false
    if (filters.channel !== 'all' && i.source_channel !== filters.channel) return false
    if (filters.dept !== 'all' && deptOf(i) !== filters.dept) return false
    if (filters.intent !== 'all' && i.intent_id !== filters.intent) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const name = customerName(i.customer_id, i).toLowerCase()
      if (!i.intent_recap.toLowerCase().includes(q) && !name.includes(q) && !i.action_item_id.includes(q)) return false
    }
    return true
  }), [pending, filters, scope])

  // Flat, SLA-burn-sorted list (used by the None view + as the source for groups).
  const flatSorted = useMemo(
    () => [...filteredPending].sort((a, b) => slaBurnRatio(b) - slaBurnRatio(a)),
    [filteredPending]
  )

  // Group the filtered list by the active groupBy key, sorting groups by worst SLA burn.
  const groups = useMemo(() => {
    if (groupBy === 'none') return []
    const keyOf = (it) =>
      groupBy === 'intent' ? it.intent_id
      : groupBy === 'assignee' ? (it.assignee_user_id ?? '__unassigned__')
      : it.customer_id
    const map = new Map()
    for (const it of filteredPending) {
      const k = keyOf(it)
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(it)
    }
    const arr = [...map.entries()]
      .filter(([, its]) => its.length > 0)
      .map(([key, its]) => ({ key, items: [...its].sort((a, b) => slaBurnRatio(b) - slaBurnRatio(a)) }))
    const maxBurn = (its) => (its.length ? Math.max(...its.map(slaBurnRatio)) : -1)
    arr.sort((a, b) => maxBurn(b.items) - maxBurn(a.items))
    return arr
  }, [filteredPending, groupBy])

  const metrics = useMemo(() => ({
    breaching: pending.filter(isPastSla).length,
    unassigned: pending.filter((i) => !i.assignee_user_id).length,
    repeatCallers: new Set(pending.filter((i) => i.repeat_caller_count >= 3).map((i) => i.customer_id)).size,
    clearedToday: CLEARED_TODAY,
  }), [pending])

  // ── Selection resolution ──────────────────────────────────────────
  // None view → a single item; grouped views → a group's worth of items.
  const isFlat = groupBy === 'none'
  const activeGroupKey = isFlat ? null : (selectedGroup ?? groups[0]?.key ?? null)

  const activeItems = useMemo(() => {
    if (isFlat) {
      const one = flatSorted.find((i) => i.action_item_id === selectedItemId)
      return one ? [one] : (flatSorted[0] ? [flatSorted[0]] : [])
    }
    if (selectedItemId) {
      const one = filteredPending.find((i) => i.action_item_id === selectedItemId)
      if (one) return [one]
    }
    const g = groups.find((x) => x.key === activeGroupKey)
    return g ? g.items : []
  }, [isFlat, flatSorted, selectedItemId, filteredPending, groups, activeGroupKey])

  // The customer the right pane is about (header + resolve-all + sidebar link).
  const activeCustomerId = activeItems[0]?.customer_id ?? null

  // ── Mutations ─────────────────────────────────────────────────────
  const resolveTyped = (id, resolutionType, note) => {
    const closedAt = new Date().toISOString()
    setItems((p) => p.map((i) => (i.action_item_id === id
      ? { ...i, status: 'completed', resolution_type: resolutionType, resolution_note: note?.trim() || undefined, closed_at: closedAt }
      : i)))
    setResolvingFor(null)
    flash('Resolved — moved to Resolved')
  }
  // Scope resolve-all to the currently-VISIBLE (filtered) items so the action
  // matches its "Resolve all {filtered count}" label — never silently resolving
  // pending items the user can't see under the active filters.
  const resolveAll = (visibleItems) => {
    const ids = new Set((visibleItems ?? []).filter((i) => i.status === 'pending').map((i) => i.action_item_id))
    if (ids.size === 0) return
    const closedAt = new Date().toISOString()
    setItems((p) => p.map((i) => (ids.has(i.action_item_id) && i.status === 'pending'
      ? { ...i, status: 'completed', resolution_type: i.resolution_type ?? 'info_provided', closed_at: closedAt }
      : i)))
    flash('All items resolved'); setResolvingFor(null); setIncorrectFor(null)
  }
  const markIncorrect = (id, reason) => { setItems((p) => p.map((i) => (i.action_item_id === id ? { ...i, status: 'incorrect', incorrect_reason: reason } : i))); setIncorrectFor(null); flash('Marked incorrect — excluded from closure rate') }
  const undoIncorrect = (id) => { setItems((p) => p.map((i) => (i.action_item_id === id ? { ...i, status: 'pending', incorrect_reason: undefined } : i))); flash('Restored to Unresolved') }
  const assign = (id, userId) => { setItems((p) => p.map((i) => (i.action_item_id === id ? { ...i, assignee_user_id: userId } : i))); setAssigningFor(null); flash(`Assigned to ${USERS[userId]?.name ?? 'rep'}`) }

  // ── Search-pick wiring ────────────────────────────────────────────
  // If a picked target would be hidden by an active intent/channel/dept/assignment
  // filter, clear only the conflicting filter(s) so the target becomes visible —
  // instead of silently snapping the selection to groups[0].
  const clearFiltersHiding = (it) => {
    if (!it) return
    setFilters((f) => {
      const next = { ...f }
      if (f.intent !== 'all' && it.intent_id !== f.intent) next.intent = 'all'
      if (f.channel !== 'all' && it.source_channel !== f.channel) next.channel = 'all'
      if (f.dept !== 'all' && deptOf(it) !== f.dept) next.dept = 'all'
      if (f.assignment === 'assigned' && !it.assignee_user_id) next.assignment = 'all'
      if (f.assignment === 'unassigned' && it.assignee_user_id) next.assignment = 'all'
      return next
    })
  }
  const focusCustomer = (customerId) => {
    const rep = items.find((i) => i.customer_id === customerId && i.status === 'pending') ?? items.find((i) => i.customer_id === customerId)
    clearFiltersHiding(rep)
    if (groupBy === 'customer') { setSelectedGroup(customerId); setSelectedItemId(null) }
    else if (groupBy === 'none') { const first = flatSorted.find((i) => i.customer_id === customerId) ?? rep; setSelectedItemId(first?.action_item_id ?? null) }
    else { setGroupBy('customer'); setSelectedGroup(customerId); setSelectedItemId(null) }
  }
  const pickItem = (actionItemId) => {
    const it = items.find((i) => i.action_item_id === actionItemId)
    if (!it) return
    clearFiltersHiding(it)
    if (groupBy === 'none') setSelectedItemId(actionItemId)
    else {
      const k = groupBy === 'intent' ? it.intent_id : groupBy === 'assignee' ? (it.assignee_user_id ?? '__unassigned__') : it.customer_id
      setSelectedGroup(k); setSelectedItemId(actionItemId)
    }
    setHighlightId(actionItemId)
    setTimeout(() => setHighlightId(null), 2000)
  }

  // After resolving, if the active selection emptied out, advance to the next group/item.
  useEffect(() => {
    if (tab !== 'unresolved') return
    if (activeItems.length === 0) {
      if (isFlat) { const next = flatSorted[0]?.action_item_id ?? null; if (next !== selectedItemId) setSelectedItemId(next) }
      else { const next = groups[0]?.key ?? null; if (next !== selectedGroup) { setSelectedGroup(next); setSelectedItemId(null) } }
    }
  }, [activeItems.length, isFlat, flatSorted, groups, selectedItemId, selectedGroup, tab])

  const resetSelection = () => { setSelectedGroup(null); setSelectedItemId(null) }

  return (
    <div className={spyneSalesLayout.pageStack}>
      {/* SLA banner — the hero answer: how many items are past SLA right now */}
      <SlaHero metrics={metrics} />

      {/* Tabs + toolbar */}
      <SpyneLineTabStrip>
        {[['unresolved', 'Unresolved', filteredPending.length], ['resolved', 'Resolved', resolved.length], ['incorrect', 'Incorrect', incorrect.length]].map(([id, label, n]) => (
          <SpyneLineTab key={id} active={tab === id} onClick={() => { setTab(id); setResolvedDetailId(null) }}>
            {label} <span className="rounded-full px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums" style={tab === id ? { background: 'var(--spyne-primary-soft)', color: 'var(--spyne-primary)' } : { background: 'var(--spyne-page-bg)', color: 'var(--spyne-text-muted)' }}>{n}</span>
          </SpyneLineTab>
        ))}
        <div className="ml-auto flex items-center gap-2 pb-2">
          <button onClick={() => setRulesOpen(true)} className="spyne-btn-ghost !h-9 !text-[12.5px]" title="Action-item rules & routing">
            <MaterialSymbol name="settings" size={16} /> Rules
          </button>
          <button onClick={() => setCreateOpen(true)} className="spyne-btn-primary !h-9 !text-[12.5px]">
            <MaterialSymbol name="add_task" size={16} /> Create action item
          </button>
          <div className="inline-flex rounded-lg border border-spyne-border bg-spyne-surface p-0.5">
            {[['manager', 'Manager', 'groups'], ['mine', 'My queue', 'person']].map(([id, label, icon]) => (
              <button key={id} onClick={() => { setScope(id); resetSelection() }} className={cn('spyne-focus-ring inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-colors', scope === id ? 'bg-spyne-primary text-white' : 'text-spyne-text-secondary hover:text-spyne-text-primary')}>
                <MaterialSymbol name={icon} size={14} /> {label}
              </button>
            ))}
          </div>
        </div>
      </SpyneLineTabStrip>

      {tab === 'resolved' ? (
        <ResolvedList items={resolved} openId={resolvedDetailId} onOpen={setResolvedDetailId} onOpenSidebar={setSidebarCustomer} />
      ) : tab === 'incorrect' ? (
        <IncorrectList items={incorrect} onUndo={undoIncorrect} onOpenSidebar={setSidebarCustomer} />
      ) : (
        <>
          {/* Filters */}
          <FilterBar
            filters={filters}
            onChange={setFilters}
            items={items}
            groupBy={groupBy}
            onGroupBy={(g) => { setGroupBy(g); resetSelection() }}
            onPickCustomer={focusCustomer}
            onPickIntent={(intentId) => setFilters((f) => ({ ...f, intent: intentId }))}
            onPickItem={pickItem}
          />

          {/* Master / detail */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(320px,400px)_1fr]">
            {/* LEFT list */}
            <div className="flex flex-col gap-2.5">
              <SectionLabel
                glyph="reorder"
                text="Queue"
                hint={`${isFlat ? flatSorted.length : groups.length} ${isFlat ? (flatSorted.length === 1 ? 'item' : 'items') : (groups.length === 1 ? 'group' : 'groups')} · worst SLA first`}
              />
              <div className="flex max-h-[calc(100vh-380px)] flex-col gap-2 overflow-y-auto pr-1">
              {(isFlat ? flatSorted.length === 0 : groups.length === 0) ? (
                <div className="spyne-card">
                  <EmptyState glyph="filter_alt_off" title="No items match these filters" helper="Try clearing a filter or widening your search." />
                </div>
              ) : isFlat ? (
                flatSorted.map((it) => (
                  <FlatItemRow
                    key={it.action_item_id}
                    item={it}
                    active={selectedItemId ? selectedItemId === it.action_item_id : flatSorted[0]?.action_item_id === it.action_item_id}
                    highlight={highlightId === it.action_item_id}
                    onSelect={() => { setSelectedItemId(it.action_item_id) }}
                    onOpenSidebar={() => setSidebarCustomer(it.customer_id)}
                  />
                ))
              ) : (
                groups.map((g) => (
                  <GroupRow
                    key={g.key}
                    groupBy={groupBy}
                    group={g}
                    active={activeGroupKey === g.key}
                    expanded={!!expanded[g.key]}
                    onSelect={() => { setSelectedGroup(g.key); setSelectedItemId(null) }}
                    onToggle={() => setExpanded((m) => ({ ...m, [g.key]: !m[g.key] }))}
                    onResolveAll={() => resolveAll(g.items)}
                    onOpenSidebar={(cid) => setSidebarCustomer(cid)}
                  />
                ))
              )}
              </div>
            </div>

            {/* RIGHT detail */}
            <div className="flex flex-col gap-2.5">
              <SectionLabel glyph="task_alt" text="Open items" hint="resolve · assign · flag" />
              <div className="spyne-card flex min-h-[420px] flex-col p-0">
              {activeItems.length === 0 ? (
                <EmptyState
                  glyph="task_alt"
                  title={`Select ${isFlat ? 'an item' : 'a group'}`}
                  helper="Pick from the queue to see its open items and resolve them here."
                  className="flex-1"
                />
              ) : (
                <RightPane
                  customerId={activeCustomerId}
                  items={activeItems}
                  groupBy={groupBy}
                  groupKey={activeGroupKey}
                  isSingle={isFlat || !!selectedItemId}
                  incorrectFor={incorrectFor}
                  assigningFor={assigningFor}
                  resolvingFor={resolvingFor}
                  highlightId={highlightId}
                  onResolve={resolveTyped}
                  onAskResolve={setResolvingFor}
                  onCancelResolve={() => setResolvingFor(null)}
                  onResolveAll={() => resolveAll(activeItems)}
                  onAskIncorrect={setIncorrectFor}
                  onMarkIncorrect={markIncorrect}
                  onAskAssign={setAssigningFor}
                  onAssign={assign}
                  onOpenSidebar={setSidebarCustomer}
                />
              )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div className="spyne-animate-slide-up fixed left-1/2 bottom-6 z-[200] flex -translate-x-1/2 items-center gap-1.5 rounded-lg px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-lg" style={{ background: 'var(--spyne-text-primary)' }}>
          <MaterialSymbol name="check_circle" size={14} /> {toast}
        </div>
      )}

      {/* Floating layers */}
      {sidebarCustomer && (
        <CustomerSidebar customerId={sidebarCustomer} items={items} onClose={() => setSidebarCustomer(null)} />
      )}
      {createOpen && (
        <CreateActionItemModal onCreate={(item) => { setItems((p) => [item, ...p]); flash('Action item created'); }} onClose={() => setCreateOpen(false)} />
      )}
      {rulesOpen && <RulesPanel onClose={() => setRulesOpen(false)} />}
    </div>
  )
}

/* ── SLA hero ────────────────────────────────────────────────────── */
/* The page's single most important answer: how many items are past SLA.
   Big tabular number anchors the left; secondary queue stats are demoted to a
   quiet, divider-separated rail on the right so the eye lands on the hero first. */

function SlaHero({ metrics }) {
  const breaching = metrics.breaching > 0
  return (
    <div
      className="spyne-animate-fade-in flex flex-wrap items-center gap-x-6 gap-y-4 rounded-2xl px-5 py-4"
      style={{
        background: breaching ? 'var(--spyne-danger-subtle)' : 'var(--spyne-success-subtle)',
        border: `1px solid ${breaching ? 'var(--spyne-danger-muted)' : 'var(--spyne-success-muted)'}`,
      }}
    >
      {/* Hero number + answer (tier 1 + tier 3 eyebrow) */}
      <div className="flex items-center gap-4">
        <span
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: breaching ? 'var(--spyne-danger-subtle)' : 'var(--spyne-success-subtle)',
            color: breaching ? 'var(--spyne-danger-text)' : 'var(--spyne-success-text)',
            boxShadow: `inset 0 0 0 1px ${breaching ? 'var(--spyne-danger-muted)' : 'var(--spyne-success-muted)'}`,
          }}
        >
          <MaterialSymbol name={breaching ? 'warning' : 'task_alt'} size={24} />
        </span>
        <div className="min-w-0">
          <p className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--spyne-text-muted)' }}>Past SLA now</p>
          <div className="flex items-baseline gap-2">
            <span className="text-[44px] font-bold leading-none tabular-nums" style={{ color: breaching ? 'var(--spyne-danger-text)' : 'var(--spyne-success-text)' }}>{metrics.breaching}</span>
            <span className="text-[13px] font-semibold" style={{ color: 'var(--spyne-text-secondary)' }}>{breaching ? (metrics.breaching === 1 ? 'item breaching' : 'items breaching') : 'all clear'}</span>
          </div>
        </div>
      </div>

      {/* Secondary queue stats — demoted, divider-separated rail */}
      <div className="ml-auto flex items-stretch gap-5">
        <HeroStat n={metrics.unassigned} label="Unassigned" tone="var(--spyne-warning-ink)" />
        <span className="w-px self-stretch" style={{ background: 'var(--spyne-border)' }} />
        <HeroStat n={metrics.repeatCallers} label="Repeat callers" tone="var(--spyne-primary)" />
        <span className="w-px self-stretch" style={{ background: 'var(--spyne-border)' }} />
        <HeroStat n={metrics.clearedToday} label="Cleared today" tone="var(--spyne-success-text)" />
      </div>
    </div>
  )
}

function HeroStat({ n, label, tone }) {
  return (
    <div className="flex flex-col justify-center">
      <span className="text-[22px] font-bold leading-none tabular-nums" style={{ color: tone }}>{n}</span>
      <span className="mt-1 text-[9.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--spyne-text-muted)' }}>{label}</span>
    </div>
  )
}

/* ── Filters ─────────────────────────────────────────────────────── */

function FilterBar({ filters, onChange, items, groupBy, onGroupBy, onPickCustomer, onPickIntent, onPickItem }) {
  return (
    <div className="spyne-card flex flex-col gap-2.5 px-3 py-2.5">
      <div className="min-w-[220px]">
        <CategorizedSearchBox
          items={items.filter((i) => i.status === 'pending')}
          value={filters.search}
          onChange={(next) => onChange({ ...filters, search: next })}
          onPickCustomer={onPickCustomer}
          onPickIntent={onPickIntent}
          onPickItem={onPickItem}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select label="Group by" value={groupBy} onChange={onGroupBy} options={GROUP_BY.map(([v, l]) => [v, l])} />
        <span className="hidden h-5 w-px bg-spyne-border sm:inline-block" />
        <Select label="Intent" value={filters.intent} onChange={(v) => onChange({ ...filters, intent: v })} options={[['all', 'All'], ...Object.values(INTENT_TAXONOMY).map((i) => [i.id, i.display_name])]} />
        <Select label="Assignment" value={filters.assignment} onChange={(v) => onChange({ ...filters, assignment: v })} options={[['all', 'All'], ['assigned', 'Assigned'], ['unassigned', 'Unassigned']]} />
        <Select label="Channel" value={filters.channel} onChange={(v) => onChange({ ...filters, channel: v })} options={[['all', 'All'], ['call', 'Call'], ['sms', 'SMS'], ['chat', 'Chat'], ['email', 'Email']]} />
        <Select label="Dept" value={filters.dept} onChange={(v) => onChange({ ...filters, dept: v })} options={[['all', 'All'], ['sales', 'Sales'], ['service', 'Service'], ['compliance', 'Compliance']]} />
      </div>
    </div>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--spyne-text-muted)' }}>
      {label}:
      <select value={value} onChange={(e) => onChange(e.target.value)} className="spyne-input spyne-focus-ring cursor-pointer" style={{ fontSize: 12, height: 32, paddingRight: 22 }}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  )
}

/* ── Shared atoms ────────────────────────────────────────────────── */

function IntentBadge({ intentId }) {
  const intent = INTENT_TAXONOMY[intentId]
  if (!intent) return <span className="spyne-badge spyne-badge-neutral" style={{ fontSize: 10 }}>{intentId}</span>
  return <span className={cn('spyne-badge', DEPT_BADGE[intent.dept])} style={{ fontSize: 10 }}>{intent.display_name}</span>
}

function ChannelChip({ channel }) {
  const ch = CHANNEL_META[channel] ?? { label: 'Unknown', symbol: 'chat' }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{ background: 'var(--spyne-page-bg)', color: 'var(--spyne-text-secondary)' }} title={ch.label}>
      <MaterialSymbol name={ch.symbol} size={14} /> {ch.label}
    </span>
  )
}

function PastSlaPill() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: 'var(--spyne-danger-subtle)', color: 'var(--spyne-danger-text)' }}>
      <MaterialSymbol name="warning" size={14} /> Past SLA
    </span>
  )
}

function ResolutionBadge({ type }) {
  if (!type) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ background: 'var(--spyne-success-subtle)', color: 'var(--spyne-success-text)' }}>
      <MaterialSymbol name={RESOLUTION_TYPE_GLYPH[type] ?? 'check_circle'} size={14} /> {RESOLUTION_TYPE_LABEL[type] ?? type}
    </span>
  )
}

function Assignee({ userId }) {
  if (!userId) return <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold" style={{ color: 'var(--spyne-warning-ink)' }}><MaterialSymbol name="mark_email_unread" size={14} /> Unassigned</span>
  const u = USERS[userId]
  return <span className="inline-flex items-center gap-1 text-[10.5px]" style={{ color: 'var(--spyne-text-muted)' }}><MaterialSymbol name="person" size={14} /> {u?.name ?? userId}</span>
}

/** Customer name as an open-in-sidebar button (row-select stays separate via stopPropagation). */
function CustomerNameButton({ customerId, item, onOpen, size = 13 }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onOpen(customerId) }}
      className="spyne-focus-ring group inline-flex max-w-full items-center gap-1 truncate rounded text-left font-bold transition-colors"
      style={{ fontSize: size, color: 'var(--spyne-text-primary)' }}
      title="Open customer panel"
    >
      <span className="truncate">{customerName(customerId, item)}</span>
      <span className="inline-flex shrink-0 opacity-50 transition-opacity group-hover:opacity-100" style={{ color: 'var(--spyne-primary)' }}>
        <MaterialSymbol name="open_in_new" size={14} />
      </span>
    </button>
  )
}

/* ── Left: grouped row (Customer / Intent / Assignee) ────────────── */

function GroupRow({ groupBy, group, active, expanded, onSelect, onToggle, onResolveAll, onOpenSidebar }) {
  const its = group.items
  const multi = its.length > 1
  const worst = its[0]
  const anyPast = its.some(isPastSla)
  const sameCustomer = its.every((i) => i.customer_id === worst.customer_id)

  // Header content depends on grouping mode.
  let header
  if (groupBy === 'intent') {
    const intent = INTENT_TAXONOMY[group.key]
    header = (
      <div className="flex min-w-0 items-center gap-1.5">
        <IntentBadge intentId={group.key} />
        <span className="rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide" style={{ background: 'var(--spyne-page-bg)', color: 'var(--spyne-text-secondary)' }}>{intent ? DEPT_LABEL[intent.dept] : '—'}</span>
      </div>
    )
  } else if (groupBy === 'assignee') {
    const u = group.key === '__unassigned__' ? null : USERS[group.key]
    header = u ? (
      <span className="inline-flex items-center gap-1.5">
        <span className="flex size-5 items-center justify-center rounded-full text-[8.5px] font-bold" style={{ background: 'var(--spyne-primary-soft)', color: 'var(--spyne-primary)' }}>{u.initials}</span>
        <span className="truncate text-[13px] font-bold" style={{ color: 'var(--spyne-text-primary)' }}>{u.name}</span>
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-[13px] font-bold" style={{ color: 'var(--spyne-warning-ink)' }}><MaterialSymbol name="mark_email_unread" size={16} /> Unassigned</span>
    )
  } else {
    header = <CustomerNameButton customerId={group.key} item={worst} onOpen={onOpenSidebar} />
  }

  return (
    <div className={cn('spyne-card-interactive', active && 'active-action-card')} style={{ borderLeft: `3px solid ${anyPast ? 'var(--spyne-danger-text)' : active ? 'var(--spyne-primary)' : 'transparent'}` }}>
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { if (e.key === ' ') e.preventDefault(); onSelect() } }}
        className="spyne-focus-ring flex w-full items-start gap-2.5 rounded-lg p-3.5 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {header}
            {multi && <span className="rounded-full px-1.5 py-0.5 text-[9.5px] font-bold tabular-nums" style={{ background: 'var(--spyne-page-bg)', color: 'var(--spyne-text-secondary)' }}>{its.length} items</span>}
            {worst.repeat_caller_count >= 3 && (
              <span title={`Repeat caller — ${worst.repeat_caller_count} contacts`} className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold tabular-nums" style={{ background: 'var(--spyne-primary-soft)', color: 'var(--spyne-primary)' }}>
                <MaterialSymbol name="autorenew" size={14} /> ×{worst.repeat_caller_count}
              </span>
            )}
            <span className="ml-auto shrink-0">{anyPast ? <PastSlaPill /> : <span className="text-[10.5px] tabular-nums" style={{ color: 'var(--spyne-text-muted)' }}>{ageLabel(ageMinutes(worst))}</span>}</span>
          </div>
          <p className="mt-1 line-clamp-1 text-[12px] leading-snug" style={{ color: 'var(--spyne-text-secondary)' }}>{worst.intent_recap}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="inline-flex" style={{ color: 'var(--spyne-text-muted)' }}><MaterialSymbol name={CHANNEL_META[worst.source_channel]?.symbol ?? 'chat'} size={14} /></span>
            {groupBy !== 'assignee' && <Assignee userId={worst.assignee_user_id} />}
            {groupBy === 'assignee' && <span className="text-[10.5px]" style={{ color: 'var(--spyne-text-muted)' }}>{customerName(worst.customer_id, worst)}{!sameCustomer ? ' +' : ''}</span>}
            {multi && (
              <button onClick={(e) => { e.stopPropagation(); onToggle() }} className="spyne-focus-ring ml-auto inline-flex items-center gap-0.5 rounded text-[10.5px] font-semibold" style={{ color: 'var(--spyne-primary)' }}>
                {expanded ? 'Hide' : `See all ${its.length}`} <MaterialSymbol name={expanded ? 'expand_less' : 'expand_more'} size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {multi && expanded && (
        <div className="border-t border-spyne-border px-3 py-2">
          <ul className="flex flex-col gap-1.5">
            {its.map((it) => (
              <li key={it.action_item_id} className="flex items-center gap-2 rounded-md px-2 py-1.5" style={{ background: 'var(--spyne-page-bg)' }}>
                <IntentBadge intentId={it.intent_id} />
                {isPastSla(it) ? <PastSlaPill /> : <span className="text-[10px] tabular-nums" style={{ color: 'var(--spyne-text-muted)' }}>{ageLabel(ageMinutes(it))}</span>}
                <span className="min-w-0 flex-1 truncate text-[11px]" style={{ color: 'var(--spyne-text-secondary)' }}>{it.intent_recap}</span>
              </li>
            ))}
          </ul>
          {sameCustomer && (
            <button onClick={(e) => { e.stopPropagation(); onResolveAll() }} className="spyne-focus-ring mt-2 inline-flex items-center gap-1 rounded text-[11.5px] font-semibold" style={{ color: 'var(--spyne-primary)' }}>
              <MaterialSymbol name="done_all" size={14} /> Resolve all {its.length}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Left: flat item row (None grouping) ─────────────────────────── */

function FlatItemRow({ item, active, highlight, onSelect, onOpenSidebar }) {
  const past = isPastSla(item)
  const sla = INTENT_TAXONOMY[item.intent_id]?.sla_hours
  return (
    <div className={cn('spyne-card-interactive spyne-animate-fade-in', (active || highlight) && 'active-action-card')} style={{ borderLeft: `3px solid ${past ? 'var(--spyne-danger-text)' : (active || highlight) ? 'var(--spyne-primary)' : 'transparent'}` }}>
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { if (e.key === ' ') e.preventDefault(); onSelect() } }}
        className="spyne-focus-ring flex w-full flex-col gap-2 rounded-lg p-3.5 text-left"
      >
        <div className="flex items-center gap-1.5">
          <IntentBadge intentId={item.intent_id} />
          <span className="inline-flex" style={{ color: 'var(--spyne-text-muted)' }}><MaterialSymbol name={CHANNEL_META[item.source_channel]?.symbol ?? 'chat'} size={14} /></span>
          <span className="ml-auto shrink-0">{past ? <PastSlaPill /> : <span className="text-[10.5px] tabular-nums" style={{ color: 'var(--spyne-text-muted)' }}>{ageLabel(ageMinutes(item))}</span>}</span>
        </div>
        <p className="line-clamp-2 text-[12.5px] leading-snug" style={{ color: 'var(--spyne-text-primary)' }}>{item.intent_recap}</p>
        <div className="flex items-center gap-2">
          <CustomerNameButton customerId={item.customer_id} item={item} onOpen={onOpenSidebar} size={11} />
          <Assignee userId={item.assignee_user_id} />
          {sla != null && <span className="ml-auto text-[10px] tabular-nums" style={{ color: 'var(--spyne-text-muted)' }}>SLA {sla}h</span>}
        </div>
      </div>
    </div>
  )
}

/* ── Right: detail pane ──────────────────────────────────────────── */

function RightPane({ customerId, items, groupBy, groupKey, isSingle, incorrectFor, assigningFor, resolvingFor, highlightId, onResolve, onAskResolve, onCancelResolve, onResolveAll, onAskIncorrect, onMarkIncorrect, onAskAssign, onAssign, onOpenSidebar }) {
  const multi = items.length > 1
  // The pane can be heterogeneous (Intent / Assignee group spans customers).
  const sameCustomer = items.every((i) => i.customer_id === customerId)

  let title
  if (!isSingle && groupBy === 'intent') title = <span className="inline-flex items-center gap-2"><IntentBadge intentId={groupKey} /></span>
  else if (!isSingle && groupBy === 'assignee') {
    const u = groupKey === '__unassigned__' ? null : USERS[groupKey]
    title = <span className="text-[14px] font-bold" style={{ color: 'var(--spyne-text-primary)' }}>{u?.name ?? 'Unassigned'}</span>
  } else {
    title = <CustomerNameButton customerId={customerId} item={items[0]} onOpen={onOpenSidebar} size={15} />
  }

  const subtitle = (!isSingle && (groupBy === 'intent' || groupBy === 'assignee'))
    ? `${items.length} open item${items.length === 1 ? '' : 's'}`
    : `${CUSTOMERS[customerId]?.phone ? CUSTOMERS[customerId].phone + ' · ' : ''}${items.length} open item${items.length === 1 ? '' : 's'}`

  return (
    <>
      <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-spyne-border px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">{title}</div>
          <p className="mt-0.5 text-[11px] tabular-nums" style={{ color: 'var(--spyne-text-muted)' }}>{subtitle}</p>
        </div>
        {multi && sameCustomer && (
          <button onClick={onResolveAll} className="spyne-btn-secondary !h-8 !text-[12px]"><MaterialSymbol name="done_all" size={14} /> Resolve all {items.length}</button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        {items.map((it) => (
          <ItemCard
            key={it.action_item_id}
            item={it}
            highlight={highlightId === it.action_item_id}
            showCustomer={!sameCustomer}
            askingIncorrect={incorrectFor === it.action_item_id}
            askingAssign={assigningFor === it.action_item_id}
            askingResolve={resolvingFor === it.action_item_id}
            onOpenSidebar={onOpenSidebar}
            onAskResolve={() => { onAskAssign(null); onAskIncorrect(null); onAskResolve(it.action_item_id) }}
            onCancelResolve={onCancelResolve}
            onResolve={(type, note) => onResolve(it.action_item_id, type, note)}
            onAskIncorrect={() => { onAskAssign(null); onCancelResolve(); onAskIncorrect(it.action_item_id) }}
            onCancelIncorrect={() => onAskIncorrect(null)}
            onMarkIncorrect={(reason) => onMarkIncorrect(it.action_item_id, reason)}
            onAskAssign={() => { onAskIncorrect(null); onCancelResolve(); onAskAssign(it.action_item_id) }}
            onCancelAssign={() => onAskAssign(null)}
            onAssign={(userId) => onAssign(it.action_item_id, userId)}
          />
        ))}
      </div>
    </>
  )
}

/* ── Activity trail (derived from item fields, no clock at render) ── */

function ActivityTrail({ item }) {
  const steps = []
  steps.push({
    glyph: item.created_by_ai ? 'smart_toy' : 'person',
    label: item.created_by_ai ? 'Logged by Vini (AI)' : 'Logged by an agent',
    time: ageLabel(ageMinutes(item)),
  })
  if (item.assignee_user_id) {
    steps.push({ glyph: 'person_add', label: `Assigned to ${USERS[item.assignee_user_id]?.name ?? item.assignee_user_id}`, time: null })
  }
  if (item.status === 'completed') {
    steps.push({
      glyph: RESOLUTION_TYPE_GLYPH[item.resolution_type] ?? 'check_circle',
      label: `Resolved${item.resolution_type ? ` as ${RESOLUTION_TYPE_LABEL[item.resolution_type]}` : ''}`,
      time: item.closed_at ? ageLabel(ageMinutes({ ...item, created_at: item.closed_at })) : null,
      success: true,
    })
  }
  if (item.status === 'incorrect') {
    steps.push({ glyph: 'flag', label: 'Flagged incorrect', time: null })
  }
  return (
    <div className="mt-1">
      <SectionLabel glyph="history" text="Activity" />
      <ol className="mt-1.5 flex flex-col gap-1.5">
        {steps.map((s, idx) => (
          <li key={idx} className="flex items-center gap-2 text-[11px]">
            <span className="inline-flex" style={{ color: s.success ? 'var(--spyne-success-text)' : 'var(--spyne-text-muted)' }}><MaterialSymbol name={s.glyph} size={14} /></span>
            <span style={{ color: 'var(--spyne-text-secondary)' }}>{s.label}</span>
            {s.time && <span className="ml-auto tabular-nums" style={{ color: 'var(--spyne-text-muted)' }}>{s.time}</span>}
          </li>
        ))}
      </ol>
    </div>
  )
}

/* ── Right: item card ────────────────────────────────────────────── */

function ItemCard({ item, highlight, showCustomer, askingIncorrect, askingAssign, askingResolve, onOpenSidebar, onAskResolve, onCancelResolve, onResolve, onAskIncorrect, onCancelIncorrect, onMarkIncorrect, onAskAssign, onCancelAssign, onAssign }) {
  const intent = INTENT_TAXONOMY[item.intent_id]
  const past = isPastSla(item)
  return (
    <div className={cn('spyne-card-interactive spyne-animate-fade-in p-0', highlight && 'active-action-card')} style={{ borderLeft: `3px solid ${past ? 'var(--spyne-danger-text)' : highlight ? 'var(--spyne-primary)' : 'transparent'}` }}>
      {/* Top zone: intent + channel (left) · SLA status — the prominent answer (right) */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-4 pt-3.5">
        <IntentBadge intentId={item.intent_id} />
        <ChannelChip channel={item.source_channel} />
        <span className="ml-auto inline-flex items-center gap-2">
          {past ? (
            <PastSlaPill />
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums" style={{ color: 'var(--spyne-text-secondary)' }}>
              <span className="inline-flex" style={{ color: 'var(--spyne-text-muted)' }}><MaterialSymbol name="schedule" size={14} /></span>
              {ageLabel(ageMinutes(item))} · SLA {intent?.sla_hours ?? '?'}h
            </span>
          )}
        </span>
      </div>

      <div className="px-4 py-3">
        {showCustomer && (
          <div className="mb-2"><CustomerNameButton customerId={item.customer_id} item={item} onOpen={onOpenSidebar} size={12} /></div>
        )}
        {/* Headline — what needs doing (tier 1 / tier 3 eyebrow) */}
        <p className="text-[9.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--spyne-text-muted)' }}>What needs doing</p>
        <p className="mt-1 text-[15px] font-semibold leading-snug" style={{ color: 'var(--spyne-text-primary)' }}>{item.intent_recap}</p>

        {/* Source message — quiet quote (no boxed sub-card, just a left rule) */}
        <div className="mt-3 border-l-2 pl-3" style={{ borderColor: 'var(--spyne-border)' }}>
          <div className="flex items-center gap-2">
            <span className="text-[9.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--spyne-text-muted)' }}>Source</span>
            <div className="ml-auto flex items-center gap-1">
              <button title="Recording playback — coming soon" className="spyne-focus-ring inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold transition-colors hover:bg-spyne-page-bg" style={{ color: 'var(--spyne-text-muted)' }}><MaterialSymbol name="play_circle" size={14} /> Listen</button>
              <button title="Full transcript — coming soon" className="spyne-focus-ring inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold transition-colors hover:bg-spyne-page-bg" style={{ color: 'var(--spyne-text-muted)' }}><MaterialSymbol name="notes" size={14} /> Transcript</button>
            </div>
          </div>
          <p className="mt-0.5 text-[12px] italic leading-snug" style={{ color: 'var(--spyne-text-muted)' }}>“{item.source_message}”</p>
        </div>

        {/* Footer: assignee */}
        <div className="mt-3 flex items-center gap-1.5">
          <Assignee userId={item.assignee_user_id} />
        </div>

        {/* Activity trail */}
        <div className="mt-3 border-t border-spyne-border pt-3">
          <ActivityTrail item={item} />
        </div>
      </div>

      {/* Actions */}
      {askingResolve ? (
        <ResolvePicker onResolve={onResolve} onCancel={onCancelResolve} />
      ) : askingAssign ? (
        <div className="border-t border-spyne-border px-4 py-3">
          <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--spyne-text-muted)' }}>Assign to</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(USERS).filter(([id]) => id !== 'vini_agent').map(([id, u]) => (
              <button key={id} onClick={() => onAssign(id)} className="spyne-focus-ring inline-flex items-center gap-1 rounded-lg border border-spyne-border px-2 py-1 text-[11px] font-medium transition-colors hover:border-spyne-primary" style={{ color: 'var(--spyne-text-secondary)' }}>
                <span className="flex size-4 items-center justify-center rounded-full text-[7.5px] font-bold" style={{ background: 'var(--spyne-primary-soft)', color: 'var(--spyne-primary)' }}>{u.initials}</span>
                {u.name}
              </button>
            ))}
            <button onClick={onCancelAssign} className="spyne-focus-ring ml-auto rounded text-[11px] font-semibold" style={{ color: 'var(--spyne-text-muted)' }}>Cancel</button>
          </div>
        </div>
      ) : askingIncorrect ? (
        <div className="border-t border-spyne-border px-4 py-3">
          <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--spyne-text-muted)' }}>Why is this incorrect?</p>
          <div className="flex flex-wrap gap-1.5">
            {INCORRECT_REASONS.map((r) => (
              <button key={r.value} onClick={() => onMarkIncorrect(r.value)} className="spyne-focus-ring rounded-lg border border-spyne-border px-2 py-1 text-[11px] font-medium transition-colors hover:border-spyne-primary" style={{ color: 'var(--spyne-text-secondary)' }}>{r.label}</button>
            ))}
            <button onClick={onCancelIncorrect} className="spyne-focus-ring ml-auto rounded text-[11px] font-semibold" style={{ color: 'var(--spyne-text-muted)' }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 border-t border-spyne-border px-4 py-3">
          <button onClick={onAskResolve} className="spyne-btn-primary !h-8 flex-1 justify-center !text-[12.5px]"><MaterialSymbol name="check_circle" size={16} /> Resolve</button>
          <button onClick={onAskAssign} className="spyne-btn-secondary !h-8 !text-[12px]"><MaterialSymbol name="person_add" size={14} /> Assign</button>
          <button onClick={onAskIncorrect} className="spyne-btn-secondary !h-8 !text-[12px]"><MaterialSymbol name="flag" size={14} /> Incorrect</button>
        </div>
      )}
    </div>
  )
}

/* ── Resolve-with-type inline picker ─────────────────────────────── */

function ResolvePicker({ onResolve, onCancel }) {
  const [type, setType] = useState(null)
  const [note, setNote] = useState('')
  return (
    <div className="border-t border-spyne-border px-4 py-3">
      <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--spyne-text-muted)' }}>How was this resolved?</p>
      <div className="flex flex-wrap gap-1.5">
        {RESOLUTION_TYPES.map((r) => (
          <button
            key={r.value}
            onClick={() => setType(r.value)}
            className={cn('spyne-focus-ring inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors', type === r.value ? 'border-spyne-primary' : 'border-spyne-border hover:border-spyne-primary')}
            style={type === r.value ? { background: 'var(--spyne-primary-soft)', color: 'var(--spyne-primary)' } : { color: 'var(--spyne-text-secondary)' }}
          >
            <MaterialSymbol name={r.glyph} size={14} /> {r.label}
          </button>
        ))}
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note · optional"
        className="spyne-input spyne-focus-ring mt-2 w-full"
        style={{ fontSize: 12 }}
      />
      <div className="mt-2 flex items-center gap-2">
        <button onClick={() => onResolve(type ?? 'other', note)} disabled={!type} className="spyne-btn-primary !h-8 flex-1 justify-center !text-[12px]">
          <MaterialSymbol name="check_circle" size={14} /> Confirm resolution
        </button>
        <button onClick={onCancel} className="spyne-focus-ring rounded text-[11px] font-semibold" style={{ color: 'var(--spyne-text-muted)' }}>Cancel</button>
      </div>
    </div>
  )
}

/* ── Resolved tab (clickable rows → detail) ──────────────────────── */

function ResolvedList({ items, openId, onOpen, onOpenSidebar }) {
  if (items.length === 0) return (
    <div className="spyne-card">
      <EmptyState glyph="task_alt" title="No resolved items yet" helper="Items you resolve will be recorded here with their resolution type." />
    </div>
  )
  const open = items.find((i) => i.action_item_id === openId)
  return (
    <div className="flex flex-col gap-3">
      <SectionLabel glyph="check_circle" text="Resolved" hint={`${items.length} in view · ${RESOLVED_TOTAL} all-time`} />
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(320px,1fr)_minmax(320px,420px)]">
      <div className="flex flex-col gap-2">
        {items.map((it) => {
          const active = it.action_item_id === openId
          return (
            <button
              key={it.action_item_id}
              onClick={() => onOpen(active ? null : it.action_item_id)}
              className={cn('spyne-card-interactive spyne-focus-ring flex flex-wrap items-center gap-2 p-3 text-left', active && 'active-action-card')}
              style={{ borderLeft: `3px solid ${active ? 'var(--spyne-primary)' : 'transparent'}` }}
            >
              <span className="inline-flex" style={{ color: 'var(--spyne-success-text)' }}><MaterialSymbol name="check_circle" size={16} /></span>
              <IntentBadge intentId={it.intent_id} />
              <span className="text-[13px] font-bold" style={{ color: 'var(--spyne-text-primary)' }}>{customerName(it.customer_id, it)}</span>
              <span className="min-w-0 flex-1 truncate text-[12px]" style={{ color: 'var(--spyne-text-secondary)' }}>{it.resolution_note ?? it.intent_recap}</span>
              {it.resolution_type && <ResolutionBadge type={it.resolution_type} />}
              <span className="text-[10.5px]" style={{ color: 'var(--spyne-text-muted)' }}>{it.assignee_user_id ? `by ${USERS[it.assignee_user_id]?.name ?? 'Unknown'}` : ''}</span>
            </button>
          )
        })}
      </div>
      <div className="spyne-card flex min-h-[280px] flex-col p-0">
        {open ? (
          <ClosedDetail item={open} onOpenSidebar={onOpenSidebar} />
        ) : (
          <EmptyState glyph="receipt_long" title="Select a resolved item" helper="Open any row to see its full record and resolution note." className="flex-1" />
        )}
      </div>
    </div>
    </div>
  )
}

/** Shared read-only detail for resolved (and reusable for closed) items. */
function ClosedDetail({ item, onOpenSidebar }) {
  const intent = INTENT_TAXONOMY[item.intent_id]
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <IntentBadge intentId={item.intent_id} />
        <ChannelChip channel={item.source_channel} />
        {item.resolution_type && <ResolutionBadge type={item.resolution_type} />}
      </div>
      <CustomerNameButton customerId={item.customer_id} item={item} onOpen={onOpenSidebar} size={15} />
      <div>
        <p className="text-[9.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--spyne-text-muted)' }}>What needed doing</p>
        <p className="mt-0.5 text-[13.5px] leading-snug" style={{ color: 'var(--spyne-text-primary)' }}>{item.intent_recap}</p>
      </div>
      <div className="rounded-lg border border-spyne-border p-2.5" style={{ background: 'var(--spyne-page-bg)' }}>
        <p className="mb-1 text-[9.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--spyne-text-muted)' }}>Source</p>
        <p className="text-[12px] italic leading-snug" style={{ color: 'var(--spyne-text-secondary)' }}>“{item.source_message}”</p>
      </div>
      {item.resolution_note && (
        <div className="rounded-lg p-2.5" style={{ background: 'var(--spyne-success-subtle)' }}>
          <p className="mb-0.5 inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--spyne-success-text)' }}><MaterialSymbol name="sticky_note_2" size={14} /> Resolution note</p>
          <p className="text-[12px] leading-snug" style={{ color: 'var(--spyne-text-secondary)' }}>{item.resolution_note}</p>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Assignee userId={item.assignee_user_id} />
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] tabular-nums" style={{ color: 'var(--spyne-text-muted)' }}><MaterialSymbol name="schedule" size={14} /> SLA {intent?.sla_hours ?? '?'}h</span>
      </div>
      <div className="border-t border-spyne-border pt-2.5"><ActivityTrail item={item} /></div>
    </div>
  )
}

/* ── Incorrect tab ───────────────────────────────────────────────── */

const INCORRECT_REASON_LABEL = Object.fromEntries(INCORRECT_REASONS.map((r) => [r.value, r.label]))

function IncorrectList({ items, onUndo, onOpenSidebar }) {
  if (items.length === 0) return (
    <div className="spyne-card">
      <EmptyState glyph="flag" title="Nothing flagged incorrect" helper="Items you mark incorrect land here and stay out of your closure rate." />
    </div>
  )
  return (
    <div className="flex flex-col gap-3">
      <SectionLabel glyph="flag" text="Incorrect" hint={`${items.length} flagged · excluded from closure rate`} />
      <div className="flex flex-col gap-2">
      {items.map((it) => (
        <div key={it.action_item_id} className="spyne-card flex flex-wrap items-center gap-2 p-3">
          <span className="inline-flex" style={{ color: 'var(--spyne-warning-ink)' }}><MaterialSymbol name="flag" size={16} /></span>
          <IntentBadge intentId={it.intent_id} />
          <CustomerNameButton customerId={it.customer_id} item={it} onOpen={onOpenSidebar} />
          <span className="min-w-0 flex-1 truncate text-[12px]" style={{ color: 'var(--spyne-text-secondary)' }}>{it.intent_recap}</span>
          {it.incorrect_reason && (
            <span className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ background: 'var(--spyne-warning-subtle)', color: 'var(--spyne-warning-ink)' }}>{INCORRECT_REASON_LABEL[it.incorrect_reason] ?? it.incorrect_reason}</span>
          )}
          <button onClick={() => onUndo(it.action_item_id)} className="spyne-focus-ring inline-flex items-center gap-1 rounded-lg border border-spyne-border px-2 py-1 text-[11px] font-semibold transition-colors hover:border-spyne-primary" style={{ color: 'var(--spyne-primary)' }}>
            <MaterialSymbol name="undo" size={14} /> Restore
          </button>
        </div>
      ))}
      </div>
    </div>
  )
}

/* ── Rules / config drawer (read-only demo) ──────────────────────── */

function RulesPanel({ onClose }) {
  const [channelAuto, setChannelAuto] = useState(CHANNEL_AUTOCREATE_DEFAULTS)
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Group intents by department for the routing read-out.
  const byDept = useMemo(() => {
    const m = {}
    for (const intent of Object.values(INTENT_TAXONOMY)) {
      (m[intent.dept] ||= []).push(intent)
    }
    return m
  }, [])

  return (
    <div className="console-v2-sales-root max2-spyne">
      <div onClick={onClose} className="fixed inset-0 z-[199]" style={{ background: 'rgba(15,23,42,0.45)' }} />
      <div className="spyne-float spyne-animate-slide-up fixed right-0 top-0 z-[200] flex h-full w-[440px] max-w-[92vw] flex-col" style={{ background: 'var(--spyne-surface)' }} role="dialog" aria-modal="true" aria-label="Action-item rules">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center gap-2.5 border-b border-spyne-border px-4 py-3.5">
          <span className="inline-flex size-8 items-center justify-center rounded-lg" style={{ background: 'var(--spyne-primary-soft)', color: 'var(--spyne-primary)' }}><MaterialSymbol name="settings" size={16} /></span>
          <div className="flex-1">
            <h2 className="text-[15px] font-bold" style={{ color: 'var(--spyne-text-primary)' }}>Action-item rules</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="spyne-focus-ring inline-flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-spyne-page-bg" style={{ color: 'var(--spyne-text-muted)' }}><MaterialSymbol name="close" size={20} /></button>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-4">
          {/* Per-channel auto-create */}
          <div className="flex flex-col gap-2">
            <SectionLabel glyph="hub" text="Auto-create by channel" />
            <div className="spyne-card flex flex-col gap-0.5 p-1.5">
              {Object.entries(CHANNEL_META).map(([id, ch]) => (
                <div key={id} className="flex items-center gap-2.5 rounded-lg px-2 py-2">
                  <span className="inline-flex" style={{ color: 'var(--spyne-text-muted)' }}><MaterialSymbol name={ch.symbol} size={16} /></span>
                  <span className="flex-1 text-[12.5px] font-semibold" style={{ color: 'var(--spyne-text-primary)' }}>{ch.label}</span>
                  <SpyneSwitch checked={!!channelAuto[id]} onChange={(v) => setChannelAuto((p) => ({ ...p, [id]: v }))} label={`Auto-create from ${ch.label}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Department → intents routing */}
          <div className="flex flex-col gap-2">
            <SectionLabel glyph="account_tree" text="Department routing" />
            <div className="flex flex-col gap-2">
              {Object.entries(byDept).map(([dept, intents]) => (
                <div key={dept} className="spyne-card p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className={cn('spyne-badge', DEPT_BADGE[dept])} style={{ fontSize: 10 }}>{DEPT_LABEL[dept] ?? dept}</span>
                    <span className="text-[10.5px] tabular-nums" style={{ color: 'var(--spyne-text-muted)' }}>{intents.length} intent{intents.length === 1 ? '' : 's'}</span>
                  </div>
                  <ul className="flex flex-col gap-1">
                    {intents.map((i) => (
                      <li key={i.id} className="flex items-center gap-2 rounded-md px-2 py-1.5" style={{ background: 'var(--spyne-page-bg)' }}>
                        <span className="flex-1 text-[12px]" style={{ color: 'var(--spyne-text-secondary)' }}>{i.display_name}</span>
                        <span className="inline-flex items-center gap-1 text-[10px] tabular-nums" style={{ color: 'var(--spyne-text-muted)' }}><MaterialSymbol name="schedule" size={14} /> SLA {i.sla_hours}h</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-spyne-border px-4 py-3">
          <button onClick={onClose} className="spyne-btn-secondary !h-9 w-full justify-center !text-[12.5px]">Done</button>
        </div>
      </div>
    </div>
  )
}
