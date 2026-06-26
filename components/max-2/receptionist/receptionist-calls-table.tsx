"use client"

/**
 * Receptionist Calls — production-grade call-log review.
 * Layout: dense list on the page + slide-over deep-dive drawer (waveform,
 * transcript, AI summary, activity, actions). Visual idiom is call-log-first,
 * not workflow-queue (which is what Action Items uses).
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { MaterialSymbol } from "@/components/max-2/material-symbol"
import { SpyneLineTab, SpyneLineTabStrip } from "@/components/max-2/spyne-line-tabs"
import { SpyneFilterSelectChevron, SpyneFilterSelectWrap } from "@/components/max-2/spyne-toolbar-controls"
import { max2Classes, spyneComponentClasses, spyneSalesLayout } from "@/lib/design-system/max-2"
import { cn } from "@/lib/utils"
import { dateRangeOptions } from "@/components/max-2/sales/console-v2/mockData"
import { periodCutoff } from "./receptionist-data"
import type { ReceptionistCallRow, CallSentiment, CallLeadStatus } from "./receptionist-data"

// ─────────────────────────────────────────────────────────────
// LOOKUPS
// ─────────────────────────────────────────────────────────────

const STATUS_META: Record<ReceptionistCallRow["transferStatus"], { label: string; tone: "success" | "warning" | "info" | "error"; icon: string }> = {
  connected:     { label: "Connected",        tone: "success", icon: "check_circle" },
  voicemail:     { label: "Voicemail",        tone: "warning", icon: "voicemail" },
  message_taken: { label: "Message taken",    tone: "info",    icon: "mail" },
  info_provided: { label: "Answered direct",  tone: "info",    icon: "chat" },
  abandoned:     { label: "Abandoned",        tone: "error",   icon: "call_end" },
}

const INTENT_LABEL: Record<string, string> = {
  service_inquiry: "Service",
  sales_inquiry: "Sales",
  parts_inquiry: "Parts",
  finance_inquiry: "Finance",
  staff_request: "Named staff",
  general_info: "General info",
  complaint_or_escalation: "Complaint",
  after_hours_message: "After hours",
  abandoned: "Abandoned",
}

const INTENT_TONE: Record<string, "success" | "brand" | "info" | "warning" | "error" | "neutral"> = {
  service_inquiry: "success",
  sales_inquiry: "brand",
  parts_inquiry: "info",
  finance_inquiry: "info",
  staff_request: "warning",
  general_info: "neutral",
  complaint_or_escalation: "error",
  after_hours_message: "warning",
  abandoned: "error",
}

const SENTIMENT_META: Record<CallSentiment, { color: string; bg: string; icon: string; label: string }> = {
  happy:   { color: "var(--spyne-success)",     bg: "var(--spyne-success-subtle)", icon: "sentiment_satisfied",    label: "Happy"   },
  neutral: { color: "var(--spyne-text-subtle)", bg: "var(--spyne-page)",           icon: "sentiment_neutral",      label: "Neutral" },
  upset:   { color: "var(--spyne-error)",       bg: "var(--spyne-error-subtle)",   icon: "sentiment_dissatisfied", label: "Upset"   },
}

const QUERY_RESOLVED_META: Record<"resolved" | "not_resolved" | "abandoned", { label: string; tone: "success" | "error" | "neutral"; icon: string }> = {
  resolved:     { label: "Resolved",       tone: "success", icon: "check_circle" },
  not_resolved: { label: "Not resolved",   tone: "error",   icon: "cancel" },
  abandoned:    { label: "Abandoned",      tone: "neutral", icon: "call_end" },
}

type SortBy = "time" | "duration" | "score"
type SortDir = "desc" | "asc"

const LEAD_STATUS_META: Record<CallLeadStatus, { label: string; tone: "success" | "brand" | "info" | "neutral"; icon: string } | null> = {
  appointment_booked: { label: "Appt booked",  tone: "success", icon: "event_available" },
  hot_lead:           { label: "Hot lead",     tone: "brand",   icon: "local_fire_department" },
  existing_customer:  { label: "Returning",    tone: "info",    icon: "autorenew" },
  info_only:          { label: "Info only",    tone: "neutral", icon: "info" },
  no_action:          null,
}

// ─────────────────────────────────────────────────────────────
// TOP-LEVEL CONSOLE
// ─────────────────────────────────────────────────────────────

export function ReceptionistCallsTable({ calls }: { calls: ReceptionistCallRow[] }) {
  const [tab, setTab] = useState<"all" | "routed" | "voicemails" | "abandoned">("all")
  const [search, setSearch] = useState("")
  const [period, setPeriod] = useState<string>("Last 30 days")
  const [intent, setIntent] = useState<string>("all")
  const [outcome, setOutcome] = useState<string>("all")
  const [sentiment, setSentiment] = useState<string>("all")
  const [queryResolved, setQueryResolved] = useState<string>("all")
  const [sortBy, setSortBy] = useState<SortBy>("time")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const toggleSort = (col: SortBy) => {
    if (sortBy === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"))
    else { setSortBy(col); setSortDir(col === "time" ? "desc" : col === "score" ? "desc" : "desc") }
  }
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null)
  const selectedCall = calls.find((c) => c.id === selectedCallId)

  const allIntents  = useMemo(() => Array.from(new Set(calls.map((c) => c.intent))).sort(), [calls])
  const allOutcomes = useMemo(() => Array.from(new Set(calls.map((c) => c.transferStatus))).sort(), [calls])

  const filteredByPeriod = useMemo(() => {
    const cutoff = periodCutoff(period)
    return calls.filter((c) => new Date(c.startedAt) >= cutoff)
  }, [calls, period])

  const counts = useMemo(() => ({
    all:        filteredByPeriod.length,
    routed:     filteredByPeriod.filter((c) => ["routed_to_ai_agent", "routed_to_staff", "routed_to_dept"].includes(c.outcome)).length,
    voicemails: filteredByPeriod.filter((c) => ["voicemail", "message_taken"].includes(c.transferStatus)).length,
    abandoned:  filteredByPeriod.filter((c) => c.transferStatus === "abandoned").length,
  }), [filteredByPeriod])

  const kpis = useMemo(() => {
    const total      = filteredByPeriod.length
    const answered   = filteredByPeriod.filter((c) => c.transferStatus !== "abandoned").length
    const answeredRate = total > 0 ? Math.round((answered / total) * 100) : 0
    const happy      = filteredByPeriod.filter((c) => c.sentiment === "happy").length
    const upset      = filteredByPeriod.filter((c) => c.sentiment === "upset").length
    const happyRate  = total > 0 ? Math.round((happy / total) * 100) : 0
    const leads      = filteredByPeriod.filter((c) => c.leadStatus === "appointment_booked" || c.leadStatus === "hot_lead").length
    const avgDur     = total > 0 ? Math.round(filteredByPeriod.reduce((s, c) => s + c.durationSec, 0) / total) : 0
    const avgSpeed   = total > 0 ? Math.round(filteredByPeriod.reduce((s, c) => s + c.speedToAnswerSec, 0) / total * 10) / 10 : 0
    return { total, answered, answeredRate, happy, upset, happyRate, leads, avgDur, avgSpeed }
  }, [filteredByPeriod])

  const visible = useMemo(() => {
    let r = filteredByPeriod
    if (tab === "routed")          r = r.filter((c) => ["routed_to_ai_agent", "routed_to_staff", "routed_to_dept"].includes(c.outcome))
    else if (tab === "voicemails") r = r.filter((c) => ["voicemail", "message_taken"].includes(c.transferStatus))
    else if (tab === "abandoned")  r = r.filter((c) => c.transferStatus === "abandoned")
    if (intent        !== "all") r = r.filter((c) => c.intent === intent)
    if (outcome       !== "all") r = r.filter((c) => c.transferStatus === outcome)
    if (sentiment     !== "all") r = r.filter((c) => c.sentiment === sentiment)
    if (queryResolved !== "all") r = r.filter((c) => c.queryResolved === queryResolved)
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter((c) =>
        c.callerPhone.includes(q) ||
        (c.customerName ?? "").toLowerCase().includes(q) ||
        c.intentTitle.toLowerCase().includes(q) ||
        (c.vehicleContext ?? "").toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    const sign = sortDir === "asc" ? 1 : -1
    return [...r].sort((a, b) => {
      if (sortBy === "duration") return sign * (a.durationSec - b.durationSec)
      if (sortBy === "score")    return sign * (a.aiScore - b.aiScore)
      return sign * (new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
    })
  }, [filteredByPeriod, tab, intent, outcome, sentiment, queryResolved, search, sortBy, sortDir])

  const hasActiveFilters = period !== "Last 30 days" || intent !== "all" || outcome !== "all" || sentiment !== "all" || queryResolved !== "all" || search.length > 0
  const clearFilters = () => { setPeriod("Last 30 days"); setIntent("all"); setOutcome("all"); setSentiment("all"); setQueryResolved("all"); setSearch("") }

  return (
    <div className={spyneSalesLayout.pageStack}>
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className={max2Classes.pageTitle}>Calls</h1>
          <p className={max2Classes.pageDescription}>Every inbound call answered by Riley, where it went, and what happened next.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className={cn(spyneComponentClasses.btnSecondaryMd, "flex items-center gap-1.5")}>
            <MaterialSymbol name="file_download" size={14} /> Export
          </button>
        </div>
      </div>

      {/* KPI STRIP — bold production-grade */}
      <KpiStrip kpis={kpis} period={period} />

      {/* FILTER BAR */}
      <div className="spyne-card flex flex-wrap items-center gap-2 px-3 py-2.5">
        <div className="flex flex-1 min-w-[260px] items-center gap-2 rounded-md border border-spyne-border bg-spyne-surface px-3 py-2">
          <MaterialSymbol name="search" size={16} className="text-spyne-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by caller, phone, intent, vehicle, tag"
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-spyne-text-subtle"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-spyne-text-muted hover:text-spyne-text-primary">
              <MaterialSymbol name="close" size={14} />
            </button>
          )}
        </div>
        <span className="hidden h-5 w-px bg-spyne-border md:inline-block" />
        <SpyneFilterSelectWrap>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className={cn(spyneComponentClasses.filterSelect, "min-w-[8rem] cursor-pointer")} aria-label="Date range">
            {(dateRangeOptions as string[]).filter((o) => o !== "Custom range").map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <SpyneFilterSelectChevron />
        </SpyneFilterSelectWrap>
        <SpyneFilterSelectWrap>
          <select value={intent} onChange={(e) => setIntent(e.target.value)} className={cn(spyneComponentClasses.filterSelect, "min-w-[8.5rem] cursor-pointer")} aria-label="Intent">
            <option value="all">All intents</option>
            {allIntents.map((i) => <option key={i} value={i}>{INTENT_LABEL[i] ?? i.replace(/_/g, " ")}</option>)}
          </select>
          <SpyneFilterSelectChevron />
        </SpyneFilterSelectWrap>
        <SpyneFilterSelectWrap>
          <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className={cn(spyneComponentClasses.filterSelect, "min-w-[8.5rem] cursor-pointer")} aria-label="Outcome">
            <option value="all">All outcomes</option>
            {allOutcomes.map((o) => <option key={o} value={o}>{STATUS_META[o]?.label ?? o}</option>)}
          </select>
          <SpyneFilterSelectChevron />
        </SpyneFilterSelectWrap>
        <SpyneFilterSelectWrap>
          <select value={sentiment} onChange={(e) => setSentiment(e.target.value)} className={cn(spyneComponentClasses.filterSelect, "min-w-[7.5rem] cursor-pointer")} aria-label="Sentiment">
            <option value="all">All sentiment</option>
            <option value="happy">Happy</option>
            <option value="neutral">Neutral</option>
            <option value="upset">Upset</option>
          </select>
          <SpyneFilterSelectChevron />
        </SpyneFilterSelectWrap>
        <SpyneFilterSelectWrap>
          <select value={queryResolved} onChange={(e) => setQueryResolved(e.target.value)} className={cn(spyneComponentClasses.filterSelect, "min-w-[8.5rem] cursor-pointer")} aria-label="Query resolved">
            <option value="all">All queries</option>
            <option value="resolved">Resolved</option>
            <option value="not_resolved">Not resolved</option>
            <option value="abandoned">Abandoned</option>
          </select>
          <SpyneFilterSelectChevron />
        </SpyneFilterSelectWrap>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-[12px] font-semibold text-spyne-brand hover:underline ml-auto">Clear all</button>
        )}
      </div>

      {/* ACTIVE-FILTER CHIPS — one-click remove */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 -mt-1.5">
          {period !== "Last 30 days" && <FilterChip label={`Period: ${period}`} onRemove={() => setPeriod("Last 30 days")} />}
          {search.length > 0 && <FilterChip label={`Search: "${search}"`} onRemove={() => setSearch("")} />}
          {intent !== "all" && <FilterChip label={`Intent: ${INTENT_LABEL[intent] ?? intent}`} onRemove={() => setIntent("all")} />}
          {outcome !== "all" && <FilterChip label={`Outcome: ${STATUS_META[outcome as keyof typeof STATUS_META]?.label ?? outcome}`} onRemove={() => setOutcome("all")} />}
          {sentiment !== "all" && <FilterChip label={`Sentiment: ${sentiment}`} onRemove={() => setSentiment("all")} />}
          {queryResolved !== "all" && <FilterChip label={`Query: ${QUERY_RESOLVED_META[queryResolved as keyof typeof QUERY_RESOLVED_META]?.label ?? queryResolved}`} onRemove={() => setQueryResolved("all")} />}
        </div>
      )}

      {/* TABS */}
      <SpyneLineTabStrip>
        {([["all", "All calls", counts.all], ["routed", "Routed", counts.routed], ["voicemails", "Voicemails", counts.voicemails], ["abandoned", "Abandoned", counts.abandoned]] as const).map(([id, label, n]) => (
          <SpyneLineTab key={id} active={tab === id} onClick={() => setTab(id)}>
            {label}{" "}
            <span className="rounded-full px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums" style={tab === id ? { background: "var(--spyne-brand-subtle)", color: "var(--spyne-brand)" } : { background: "var(--spyne-page)", color: "var(--spyne-text-muted)" }}>{n}</span>
          </SpyneLineTab>
        ))}
      </SpyneLineTabStrip>

      {/* LIST */}
      {visible.length === 0 ? (
        <div className="spyne-card py-16 text-center">
          <MaterialSymbol name="filter_alt_off" size={28} className="text-spyne-text-subtle mb-2" />
          <div className="text-[14px] font-semibold">No calls match</div>
          <div className="text-[13px] text-spyne-text-muted mt-1">Try clearing filters or switching tabs.</div>
        </div>
      ) : (
        <div className="spyne-card overflow-hidden">
          {/* COLUMN HEADER — sortable */}
          <div className="flex items-stretch bg-spyne-surface-hover border-b border-spyne-border text-[10.5px] font-bold uppercase tracking-[0.06em] text-spyne-text-muted">
            <span className="w-1 shrink-0" aria-hidden="true" />
            <SortHeader className="w-[300px]" label="Caller" active={false} dir={sortDir} onClick={() => {/* no-op */}} disabled />
            <SortHeader className="flex-1" label="Intent · summary" active={false} dir={sortDir} onClick={() => {/* no-op */}} disabled />
            <SortHeader className="w-[140px] justify-end" label="Query resolved" active={false} dir={sortDir} onClick={() => {/* no-op */}} disabled />
            <SortHeader className="w-[200px] justify-end" label="Outcome · time" active={sortBy === "time"} dir={sortDir} onClick={() => toggleSort("time")} />
            <SortHeader className="w-[90px] justify-center" label="Duration" active={sortBy === "duration"} dir={sortDir} onClick={() => toggleSort("duration")} />
            <SortHeader className="w-[88px] justify-center" label="AI Score" active={sortBy === "score"} dir={sortDir} onClick={() => toggleSort("score")} />
            <span className="w-12 shrink-0" aria-hidden="true" />
          </div>
          {visible.map((c, idx) => (
            <CallRow
              key={c.id}
              call={c}
              first={idx === 0}
              active={selectedCallId === c.id}
              onSelect={() => setSelectedCallId(c.id)}
            />
          ))}
        </div>
      )}

      {selectedCall && (
        <CallDetailDrawer
          call={selectedCall}
          onClose={() => setSelectedCallId(null)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// KPI STRIP — bold, production-grade
// ─────────────────────────────────────────────────────────────

function KpiStrip({ kpis, period }: { kpis: { total: number; answeredRate: number; happy: number; upset: number; happyRate: number; leads: number; avgDur: number; avgSpeed: number }; period: string }) {
  return (
    <div className="rounded-2xl border border-spyne-border bg-spyne-surface overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-spyne-border bg-spyne-surface-hover">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-spyne-text-muted">Performance · {period}</span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-spyne-text-muted">
          <span className="inline-flex h-2 w-2 rounded-full bg-spyne-success" />
          Live
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-x divide-spyne-border">
        <KpiCell label="Calls handled"        value={kpis.total.toString()}                 emphasis="primary" />
        <KpiCell label="Answer rate"          value={`${kpis.answeredRate}%`}                emphasis={kpis.answeredRate >= 90 ? "success" : kpis.answeredRate >= 75 ? "warning" : "error"} />
        <KpiCell label="Avg duration"         value={fmtDuration(kpis.avgDur)}               sub={`Speed-to-answer ⚡ ${kpis.avgSpeed}s`} />
        <SentimentCell happy={kpis.happy} upset={kpis.upset} happyRate={kpis.happyRate} total={kpis.total} />
        <KpiCell label="Hot leads & appts"    value={kpis.leads.toString()}                   emphasis="brand" sub={kpis.total > 0 ? `${Math.round((kpis.leads / kpis.total) * 100)}% conversion` : ""} />
      </div>
    </div>
  )
}

function KpiCell({ label, value, sub, emphasis }: { label: string; value: string; sub?: string; emphasis?: "primary" | "brand" | "success" | "warning" | "error" }) {
  const color =
    emphasis === "brand"   ? "var(--spyne-brand)" :
    emphasis === "success" ? "var(--spyne-success)" :
    emphasis === "warning" ? "var(--spyne-warning-ink)" :
    emphasis === "error"   ? "var(--spyne-error)" :
                             "var(--spyne-text-primary)"
  return (
    <div className="px-5 py-4">
      <div className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-spyne-text-muted">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-[32px] font-bold leading-none tabular-nums" style={{ color }}>{value}</span>
      </div>
      {sub && <div className="mt-1.5 text-[11px] text-spyne-text-muted">{sub}</div>}
    </div>
  )
}

function SentimentCell({ happy, upset, happyRate, total }: { happy: number; upset: number; happyRate: number; total: number }) {
  const neutral = total - happy - upset
  const happyPct   = total > 0 ? (happy   / total) * 100 : 0
  const neutralPct = total > 0 ? (neutral / total) * 100 : 0
  const upsetPct   = total > 0 ? (upset   / total) * 100 : 0
  return (
    <div className="px-5 py-4">
      <div className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-spyne-text-muted">Sentiment</div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-[32px] font-bold leading-none tabular-nums" style={{ color: "var(--spyne-success)" }}>{happyRate}%</span>
        <span className="text-[12px] font-semibold text-spyne-text-muted">happy</span>
      </div>
      <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-spyne-border-strong">
        <span style={{ width: `${happyPct}%`,   background: "var(--spyne-success)"     }} />
        <span style={{ width: `${neutralPct}%`, background: "var(--spyne-text-subtle)" }} />
        <span style={{ width: `${upsetPct}%`,   background: "var(--spyne-error)"       }} />
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-spyne-text-muted">
        <span><span className="font-bold tabular-nums">{happy}</span> happy</span>
        <span>·</span>
        <span><span className="font-bold tabular-nums">{neutral}</span> neutral</span>
        {upset > 0 && (<><span>·</span><span style={{ color: "var(--spyne-error)" }}><span className="font-bold tabular-nums">{upset}</span> upset</span></>)}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// CALL ROW — dense list row
// ─────────────────────────────────────────────────────────────

function CallRow({ call, first, active, onSelect }: { call: ReceptionistCallRow; first: boolean; active: boolean; onSelect: () => void }) {
  const sm = STATUS_META[call.transferStatus]
  const sentMeta = SENTIMENT_META[call.sentiment]
  const leadMeta = LEAD_STATUS_META[call.leadStatus]
  const intentTone = INTENT_TONE[call.intent] ?? "neutral"
  const displayName = call.customerName ?? "Unknown caller"

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { if (e.key === " ") e.preventDefault(); onSelect() } }}
      className={cn(
        "group relative flex items-stretch cursor-pointer transition-colors",
        !first && "border-t border-spyne-border",
        active ? "bg-spyne-brand-subtle/60" : "hover:bg-spyne-surface-hover"
      )}
    >
      {/* Sentiment stripe — 4px saturated */}
      <span className="w-1 shrink-0" style={{ background: sentMeta.color }} aria-label={`Sentiment: ${sentMeta.label}`} />

      {/* CALLER */}
      <div className="flex items-center gap-3 px-4 py-3.5 w-[300px] shrink-0 min-w-0">
        <div
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white text-[12px] font-bold"
          style={{ background: "linear-gradient(135deg, var(--spyne-brand), color-mix(in srgb, var(--spyne-brand) 70%, black))" }}
        >
          {(displayName === "Unknown caller" ? call.callerPhone : displayName).slice(-2)}
          {call.isReturningCaller && (
            <span
              className="absolute -bottom-0.5 -right-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] bg-spyne-success text-white border-2 border-white"
              title="Returning caller"
              aria-label="Returning caller"
            >
              <MaterialSymbol name="autorenew" size={8} />
            </span>
          )}
        </div>
        <div className="min-w-0">
          <div className="text-[14px] font-bold text-spyne-text-primary truncate leading-tight">{displayName}</div>
          <div className="text-[11.5px] font-mono text-spyne-text-muted truncate mt-0.5">{call.callerPhone}</div>
          {call.vehicleContext && (
            <div className="text-[11px] text-spyne-text-muted truncate mt-0.5 flex items-center gap-1">
              <MaterialSymbol name="directions_car" size={11} />
              {call.vehicleContext}
            </div>
          )}
        </div>
      </div>

      {/* INTENT + SUMMARY */}
      <div className="flex-1 min-w-0 px-4 py-3.5 flex flex-col gap-1.5 justify-center">
        <div className="flex items-center gap-2 min-w-0">
          <Pill tone={intentTone} compact>{INTENT_LABEL[call.intent] ?? call.intent.replace(/_/g, " ")}</Pill>
          {call.outcome !== "answered_directly" && call.outcome !== "abandoned" && (
            <span className="inline-flex items-center gap-1 text-[11.5px] text-spyne-text-muted min-w-0">
              <MaterialSymbol name="east" size={12} className="shrink-0" />
              <span className="font-semibold text-spyne-text-primary truncate">{call.transferTarget}</span>
            </span>
          )}
          {leadMeta && (
            <Pill tone={leadMeta.tone} compact icon={leadMeta.icon}>{leadMeta.label}</Pill>
          )}
          {call.tags.slice(0, 2).map((t) => (
            <span key={t} className="inline-flex items-center rounded bg-spyne-surface-hover px-1.5 py-0.5 text-[10.5px] font-semibold text-spyne-text-secondary">
              {t}
            </span>
          ))}
          {call.tags.length > 2 && (
            <span className="text-[10.5px] text-spyne-text-subtle font-semibold">+{call.tags.length - 2}</span>
          )}
        </div>
        <p className="text-[12.5px] text-spyne-text-secondary line-clamp-1">{call.summary}</p>
      </div>

      {/* QUERY RESOLVED */}
      <div className="flex items-center justify-end px-3 py-3.5 w-[140px] shrink-0">
        <QueryResolvedPill status={call.queryResolved} />
      </div>

      {/* OUTCOME + TIME */}
      <div className="flex flex-col items-end justify-center gap-1 px-3 py-3.5 w-[200px] shrink-0">
        <Pill tone={sm.tone} icon={sm.icon}>{sm.label}</Pill>
        <div className="text-[10.5px] text-spyne-text-subtle">{fmtRelativeTime(call.startedAt)}</div>
      </div>

      {/* DURATION */}
      <div className="flex flex-col items-center justify-center px-2 py-3.5 w-[90px] shrink-0 tabular-nums">
        <span className="text-[13px] font-bold text-spyne-text-primary">{fmtDuration(call.durationSec)}</span>
        <span className="text-[10px] text-spyne-text-muted mt-0.5 inline-flex items-center gap-0.5" title={`Answered in ${call.speedToAnswerSec}s`}>
          <MaterialSymbol name="bolt" size={10} /> {call.speedToAnswerSec}s
        </span>
      </div>

      {/* AI SCORE */}
      <div className="flex items-center justify-center px-2 py-2 w-[88px] shrink-0">
        <ScoreGauge value={call.aiScore} />
      </div>

      {/* Quick listen */}
      <div className="flex items-center justify-center w-12 shrink-0">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSelect() }}
          title="Listen to recording"
          aria-label="Listen to recording"
          className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center w-8 h-8 rounded-full bg-spyne-brand text-white hover:opacity-90 shadow-sm"
        >
          <MaterialSymbol name="play_arrow" size={16} />
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// DETAIL DRAWER — slide-over deep dive
// ─────────────────────────────────────────────────────────────

function CallDetailDrawer({ call, onClose }: { call: ReceptionistCallRow; onClose: () => void }) {
  const sm = STATUS_META[call.transferStatus]
  const sentMeta = SENTIMENT_META[call.sentiment]
  const leadMeta = LEAD_STATUS_META[call.leadStatus]
  const [toast, setToast] = useState<string | null>(null)
  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2400) }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev }
  }, [onClose])

  // Synthesise transcript with timestamps
  const transcript = useMemo(() => buildTranscript(call), [call])

  const transcriptText = () => {
    const head = `Call ${call.id} · ${call.customerName ?? call.callerPhone} · ${fmtDate(call.startedAt)} ${fmtTime(call.startedAt)}\n\n`
    return head + transcript.map((t) => t.kind === "transfer" ? `-- ${t.text} --` : `[${t.at}] ${t.name}: ${t.text}`).join("\n")
  }
  const copyTranscript = async () => {
    try { await navigator.clipboard.writeText(transcriptText()); flash("Transcript copied") }
    catch { flash("Couldn't copy") }
  }
  const downloadTranscript = () => {
    const blob = new Blob([transcriptText()], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = `${call.id}-transcript.txt`; a.click()
    URL.revokeObjectURL(url)
  }
  const createActionItem = () => flash(`Action item drafted for ${call.customerName ?? call.callerPhone}`)
  const sendToQA = () => flash("Sent to QA queue")
  const tagCall = () => flash("Tag picker coming soon")

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Call detail: ${call.customerName ?? call.callerPhone}`}
        className="fixed top-0 right-0 bottom-0 w-[720px] max-w-[95vw] bg-spyne-page shadow-2xl z-50 overflow-y-auto flex flex-col"
      >
        {/* STICKY HEADER */}
        <div className="sticky top-0 z-10 bg-spyne-surface border-b border-spyne-border px-6 py-4">
          <div className="flex items-start gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white text-[14px] font-bold"
              style={{ background: "linear-gradient(135deg, var(--spyne-brand), color-mix(in srgb, var(--spyne-brand) 65%, black))" }}
            >
              {(call.customerName ?? call.callerPhone).slice(-2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[18px] font-bold text-spyne-text-primary truncate">{call.customerName ?? "Unknown caller"}</h2>
                {call.isReturningCaller && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-spyne-success-subtle px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-spyne-success">
                    <MaterialSymbol name="autorenew" size={11} /> Returning
                  </span>
                )}
              </div>
              <div className="text-[12.5px] font-mono text-spyne-text-muted mt-0.5">{call.callerPhone}</div>
              {call.vehicleContext && (
                <div className="text-[12px] text-spyne-text-muted mt-1 inline-flex items-center gap-1">
                  <MaterialSymbol name="directions_car" size={12} /> {call.vehicleContext}
                </div>
              )}
            </div>
            <button type="button" onClick={onClose} className="text-spyne-text-muted hover:text-spyne-text-primary" aria-label="Close">
              <MaterialSymbol name="close" size={22} />
            </button>
          </div>

          {/* Tags inline */}
          {call.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3 ml-[60px]">
              {call.tags.map((t) => (
                <span key={t} className="inline-flex items-center rounded-md bg-spyne-surface px-2 py-0.5 text-[11px] font-semibold text-spyne-text-secondary border border-spyne-border">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 p-6 flex flex-col gap-4">
          {/* MINI KPI STRIP — 4 quick stats */}
          <div className="grid grid-cols-4 gap-2">
            <MiniStat icon={sentMeta.icon} label="Sentiment"  value={sentMeta.label}                    color={sentMeta.color} />
            <MiniStat icon="schedule"       label="Duration"  value={fmtDuration(call.durationSec)}      />
            <MiniStat icon="bolt"           label="Answered"  value={`${call.speedToAnswerSec}s`}        />
            <MiniStat icon={sm.icon}        label="Outcome"   value={sm.label}                          color={tonalColor(sm.tone)} />
          </div>

          {/* PLAYER */}
          <CallPlayer call={call} sm={sm} />

          {/* LEAD + INTENT BLOCK */}
          <div className="spyne-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <MaterialSymbol name="auto_awesome" size={16} className="text-spyne-brand" />
              <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-spyne-brand">AI Summary</span>
              <div className="ml-auto flex items-center gap-1.5 flex-wrap">
                <Pill tone={INTENT_TONE[call.intent] ?? "neutral"}>{INTENT_LABEL[call.intent] ?? call.intent}</Pill>
                {leadMeta && <Pill tone={leadMeta.tone} icon={leadMeta.icon}>{leadMeta.label}</Pill>}
              </div>
            </div>
            <p className="text-[13.5px] leading-relaxed text-spyne-text-primary">{call.summary}</p>
            {call.transferTarget && call.transferTarget !== "—" && (
              <div className="mt-3 pt-3 border-t border-spyne-border flex items-center gap-2 text-[12px] text-spyne-text-muted">
                <MaterialSymbol name="east" size={13} />
                Routed to <span className="font-semibold text-spyne-text-primary">{call.transferTarget}</span>
              </div>
            )}
          </div>

          {/* TRANSCRIPT */}
          <div className="spyne-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-spyne-border px-4 py-3">
              <div className="inline-flex items-center gap-2">
                <MaterialSymbol name="notes" size={15} className="text-spyne-brand" />
                <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-spyne-text-muted">Transcript</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={copyTranscript} className="inline-flex items-center gap-1 text-[11px] font-semibold text-spyne-brand hover:opacity-80 px-2 py-1 rounded-md hover:bg-spyne-brand-subtle">
                  <MaterialSymbol name="content_copy" size={12} /> Copy
                </button>
                <button onClick={downloadTranscript} className="inline-flex items-center gap-1 text-[11px] font-semibold text-spyne-brand hover:opacity-80 px-2 py-1 rounded-md hover:bg-spyne-brand-subtle">
                  <MaterialSymbol name="download" size={12} /> Download
                </button>
                <button onClick={sendToQA} className="inline-flex items-center gap-1 text-[11px] font-semibold text-spyne-brand hover:opacity-80 px-2 py-1 rounded-md hover:bg-spyne-brand-subtle">
                  <MaterialSymbol name="flag" size={12} /> QA
                </button>
              </div>
            </div>
            <div className="p-4 space-y-2.5">
              {transcript.map((t, i) => (
                t.kind === "transfer" ? (
                  <div key={i} className="flex items-center gap-2 my-2">
                    <span className="flex-1 h-px bg-spyne-border" />
                    <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-spyne-brand inline-flex items-center gap-1">
                      <MaterialSymbol name="east" size={11} /> {t.text}
                    </span>
                    <span className="flex-1 h-px bg-spyne-border" />
                  </div>
                ) : (
                  <div key={i} className={cn(
                    "flex gap-3 text-[13px] leading-relaxed",
                    t.speaker === "agent" ? "" : "flex-row-reverse"
                  )}>
                    <div className="shrink-0 w-12 text-[10.5px] font-mono tabular-nums text-spyne-text-subtle pt-1">
                      {t.at}
                    </div>
                    <div className={cn(
                      "flex-1 rounded-lg px-3 py-2",
                      t.speaker === "agent" ? "bg-spyne-brand-subtle/40 border border-spyne-brand/15" : "bg-spyne-surface border border-spyne-border"
                    )}>
                      <div className={cn(
                        "text-[10.5px] font-bold uppercase tracking-[0.04em] mb-0.5",
                        t.speaker === "agent" ? "text-spyne-brand" : "text-spyne-text-muted"
                      )}>
                        {t.name}
                      </div>
                      <p className="text-spyne-text-primary">{t.text}</p>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>

          {/* ACTIVITY */}
          <div className="spyne-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <MaterialSymbol name="history" size={15} className="text-spyne-text-muted" />
              <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-spyne-text-muted">Activity</span>
            </div>
            <ol className="flex flex-col gap-2 text-[12.5px]">
              <ActivityRow icon="call"            label={`Call started · ${call.callerPhone}`}                         time={fmtTime(call.startedAt)} />
              <ActivityRow icon="smart_toy"       label={`Riley answered in ${call.speedToAnswerSec}s`}                 time={fmtTime(call.startedAt)} />
              <ActivityRow icon="psychology"      label={`Intent detected: ${INTENT_LABEL[call.intent] ?? call.intent}`} />
              {call.outcome !== "answered_directly" && call.outcome !== "abandoned" && (
                <ActivityRow icon="east"          label={`Routed to ${call.transferTarget}`} success />
              )}
              {call.outcome === "answered_directly" && (
                <ActivityRow icon="check_circle"  label="Answered directly from knowledge base" success />
              )}
              {call.transferStatus === "voicemail" && (
                <ActivityRow icon="voicemail"     label="Rolled to voicemail" />
              )}
              {call.transferStatus === "abandoned" && (
                <ActivityRow icon="call_end"      label="Caller hung up" />
              )}
              <ActivityRow icon="stop_circle"     label="Call ended" time={fmtTime(new Date(new Date(call.startedAt).getTime() + call.durationSec * 1000).toISOString())} />
            </ol>
          </div>
        </div>

        {/* FOOTER ACTIONS — sticky */}
        <div className="sticky bottom-0 bg-spyne-surface border-t border-spyne-border px-6 py-3 flex items-center gap-2">
          <a
            href={`tel:${call.callerPhone.replace(/\s+/g, "")}`}
            className={cn(spyneComponentClasses.btnPrimaryMd, "flex-1 justify-center inline-flex items-center gap-1.5")}
          >
            <MaterialSymbol name="call" size={15} /> Call this customer
          </a>
          <button type="button" onClick={createActionItem} className={cn(spyneComponentClasses.btnSecondaryMd, "inline-flex items-center gap-1.5")}>
            <MaterialSymbol name="add_task" size={14} /> Action item
          </button>
          <button type="button" onClick={tagCall} className={cn(spyneComponentClasses.btnSecondaryMd, "inline-flex items-center gap-1.5")}>
            <MaterialSymbol name="label" size={14} /> Tag
          </button>
        </div>

        {toast && (
          <div className="spyne-animate-slide-up fixed left-1/2 bottom-24 z-[200] flex -translate-x-1/2 items-center gap-1.5 rounded-lg px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-lg" style={{ background: "var(--spyne-text-primary)" }}>
            <MaterialSymbol name="check_circle" size={14} /> {toast}
          </div>
        )}
      </aside>
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// PLAYER
// ─────────────────────────────────────────────────────────────

function waveformBars(seed: string, n: number) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return Array.from({ length: n }, () => {
    h = (h * 1664525 + 1013904223) >>> 0
    const r = (h % 1000) / 1000
    return 20 + Math.round(r * 78)
  })
}

function CallPlayer({ call, sm }: { call: ReceptionistCallRow; sm: { label: string; tone: "success" | "warning" | "info" | "error" } }) {
  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState(0)
  const barsRef = useRef<HTMLButtonElement | null>(null)
  const bars = useMemo(() => waveformBars(call.id, 96), [call.id])
  const progress = call.durationSec > 0 ? pos / call.durationSec : 0

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setPos((p) => {
        if (p >= call.durationSec) { setPlaying(false); return call.durationSec }
        return p + 1
      })
    }, 1000 / 8)
    return () => window.clearInterval(id)
  }, [playing, call.durationSec])

  const fmtMM = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`

  return (
    <div className="spyne-card p-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="w-11 h-11 rounded-full bg-spyne-brand text-white inline-flex items-center justify-center hover:opacity-90 shadow-sm"
          aria-label={playing ? "Pause" : "Play"}
        >
          <MaterialSymbol name={playing ? "pause" : "play_arrow"} size={22} />
        </button>
        <button
          ref={barsRef}
          type="button"
          onClick={(e) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
            const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
            setPos(Math.round(call.durationSec * ratio))
          }}
          className="flex-1 flex items-end gap-px h-12 cursor-pointer"
          aria-label="Scrub"
        >
          {bars.map((h, i) => {
            const filled = i / bars.length < progress
            return (
              <span
                key={i}
                className="flex-1 rounded-sm transition-colors"
                style={{
                  height: `${h}%`,
                  background: filled ? "var(--spyne-brand)" : "var(--spyne-border-strong)",
                }}
              />
            )
          })}
        </button>
        <div className="text-right shrink-0 tabular-nums">
          <div className="text-[13px] font-bold text-spyne-text-primary leading-tight">{fmtMM(pos)}</div>
          <div className="text-[10.5px] text-spyne-text-muted">of {fmtMM(call.durationSec)}</div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ATOMS
// ─────────────────────────────────────────────────────────────

function MiniStat({ icon, label, value, color }: { icon: string; label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-spyne-border bg-spyne-surface px-3 py-2.5">
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.06em] text-spyne-text-muted">
        <MaterialSymbol name={icon} size={11} />
        {label}
      </div>
      <div className="mt-1 text-[14px] font-bold capitalize" style={{ color: color ?? "var(--spyne-text-primary)" }}>
        {value}
      </div>
    </div>
  )
}

function ActivityRow({ icon, label, time, success }: { icon: string; label: string; time?: string; success?: boolean }) {
  return (
    <li className="flex items-center gap-2">
      <span className="inline-flex w-4" style={{ color: success ? "var(--spyne-success)" : "var(--spyne-text-muted)" }}>
        <MaterialSymbol name={icon} size={14} />
      </span>
      <span className="text-spyne-text-secondary">{label}</span>
      {time && <span className="ml-auto font-mono tabular-nums text-spyne-text-muted text-[11.5px]">{time}</span>}
    </li>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-spyne-brand-subtle bg-spyne-brand-subtle/40 px-2.5 py-1 text-[11.5px] font-semibold text-spyne-brand">
      {label}
      <button type="button" onClick={onRemove} className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-spyne-brand/20" aria-label={`Remove ${label}`}>
        <MaterialSymbol name="close" size={11} />
      </button>
    </span>
  )
}

function SortHeader({ label, active, dir, onClick, className, disabled }: { label: string; active: boolean; dir: SortDir; onClick: () => void; className?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1 px-4 py-2.5",
        !disabled && "cursor-pointer hover:text-spyne-text-secondary",
        active && "text-spyne-brand",
        className
      )}
    >
      {label}
      {!disabled && (
        <MaterialSymbol
          name={active ? (dir === "asc" ? "arrow_upward" : "arrow_downward") : "unfold_more"}
          size={11}
          className={cn(active ? "text-spyne-brand" : "text-spyne-text-subtle")}
        />
      )}
    </button>
  )
}

function QueryResolvedPill({ status }: { status: "resolved" | "not_resolved" | "abandoned" }) {
  const m = QUERY_RESOLVED_META[status]
  const cls = m.tone === "success" ? "bg-spyne-success-subtle text-spyne-success"
            : m.tone === "error"   ? "bg-spyne-error-subtle   text-spyne-error"
            :                        "bg-spyne-surface-hover  text-spyne-text-muted"
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-bold uppercase tracking-wide", cls)}>
      <MaterialSymbol name={m.icon} size={11} />
      {m.label}
    </span>
  )
}

function ScoreGauge({ value }: { value: number }) {
  // Semi-circle gauge — 0 to 10 → arc 180° rotated to start at 9 o'clock
  const pct = Math.max(0, Math.min(1, value / 10))
  const tone = value >= 8 ? "var(--spyne-success)" : value >= 5 ? "var(--spyne-warning-ink)" : "var(--spyne-error)"
  const size = 52
  const stroke = 6
  const r = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  const C = Math.PI * r // half circumference for a semicircle
  const dashFilled = pct * C
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size / 2 + stroke }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`AI score ${value.toFixed(1)} out of 10`} className="absolute top-0 left-0">
        {/* Track */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="var(--spyne-border-strong)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dashFilled} ${C}`}
        />
      </svg>
      <span
        className="absolute font-bold tabular-nums leading-none"
        style={{ top: size / 2 - 12, left: 0, width: size, textAlign: "center", color: tone, fontSize: 14 }}
      >
        {value.toFixed(1)}
      </span>
    </div>
  )
}

function Pill({ tone, children, icon, compact }: { tone: "success" | "brand" | "info" | "warning" | "error" | "neutral"; children: React.ReactNode; icon?: string; compact?: boolean }) {
  const cls =
    tone === "success" ? "bg-spyne-success-subtle text-spyne-success" :
    tone === "brand"   ? "bg-spyne-brand-subtle text-spyne-brand" :
    tone === "info"    ? "bg-spyne-info-subtle text-spyne-info" :
    tone === "warning" ? "bg-spyne-warning-subtle text-[var(--spyne-warning-ink)]" :
    tone === "error"   ? "bg-spyne-error-subtle text-spyne-error" :
                         "bg-spyne-surface-hover text-spyne-text-muted"
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-md font-bold capitalize",
      compact ? "px-1.5 py-0.5 text-[10.5px]" : "px-2 py-0.5 text-[11px]",
      cls
    )}>
      {icon && <MaterialSymbol name={icon} size={compact ? 10 : 11} />}
      {children}
    </span>
  )
}

function tonalColor(tone: "success" | "warning" | "info" | "error"): string {
  return tone === "success" ? "var(--spyne-success)"
       : tone === "warning" ? "var(--spyne-warning-ink)"
       : tone === "error"   ? "var(--spyne-error)"
       :                       "var(--spyne-info, var(--spyne-text-primary))"
}

// ─────────────────────────────────────────────────────────────
// FORMATTERS + TRANSCRIPT
// ─────────────────────────────────────────────────────────────

function fmtDuration(s: number) {
  const m = Math.floor(s / 60), r = s % 60
  return m > 0 ? `${m}m ${r}s` : `${r}s`
}
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) }
function fmtTime(iso: string) { return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) }
function fmtRelativeTime(iso: string): string {
  const now = Date.now()
  const t = new Date(iso).getTime()
  const diffSec = Math.max(1, Math.round((now - t) / 1000))
  if (diffSec < 60)        return `${diffSec}s ago`
  if (diffSec < 3600)      return `${Math.round(diffSec / 60)}m ago`
  if (diffSec < 86400)     return `${Math.round(diffSec / 3600)}h ago`
  if (diffSec < 86400 * 7) return `${Math.round(diffSec / 86400)}d ago`
  return fmtDate(iso)
}

type TranscriptLine = { kind: "line"; speaker: "agent" | "caller"; name: string; at: string; text: string } | { kind: "transfer"; text: string }

function buildTranscript(c: ReceptionistCallRow): TranscriptLine[] {
  const fmtAt = (s: number) => `0:${s.toString().padStart(2, "0")}`
  const lines: TranscriptLine[] = []
  const openLine = c.isReturningCaller
    ? `Welcome back${c.customerName ? `, ${c.customerName.split(" ")[0]}` : ""}. How can I help today?`
    : "Thanks for calling Spyne Motors, this is Riley. How can I help?"
  lines.push({ kind: "line", speaker: "agent", name: "Riley", at: fmtAt(0), text: openLine })

  const opener = callerOpener(c.intent)
  lines.push({ kind: "line", speaker: "caller", name: "Caller", at: fmtAt(6), text: opener })
  lines.push({ kind: "line", speaker: "agent",  name: "Riley",  at: fmtAt(14), text: agentResponse(c) })

  if (c.outcome === "answered_directly") {
    lines.push({ kind: "line", speaker: "caller", name: "Caller", at: fmtAt(22), text: "Great, that's all I needed. Thanks." })
    lines.push({ kind: "line", speaker: "agent",  name: "Riley",  at: fmtAt(25), text: "You're welcome. Thanks for calling Spyne Motors." })
  } else if (c.outcome !== "abandoned") {
    const transferAt = Math.round(c.durationSec * 0.4)
    lines.push({ kind: "transfer", text: `Transferred to ${c.transferTarget}` })
    lines.push({ kind: "line", speaker: "agent",  name: c.transferTarget, at: fmtAt(transferAt), text: c.transferStatus === "connected" ? "Hi, this is the team — how can I help?" : "(no answer — rolled to voicemail)" })
  } else {
    lines.push({ kind: "line", speaker: "caller", name: "Caller", at: fmtAt(20), text: "(caller hung up)" })
  }

  return lines
}

function callerOpener(intent: string): string {
  switch (intent) {
    case "service_inquiry":         return "Hi, I need to schedule an oil change for my truck."
    case "sales_inquiry":           return "I saw an F-150 on your website — is it still available?"
    case "general_info":            return "What time do you close today?"
    case "parts_inquiry":           return "Do you have brake pads for a 2022 Camry in stock?"
    case "staff_request":           return "Can I speak to Sam in Service?"
    case "after_hours_message":     return "Hi, I know you're closed but I need brake service ASAP."
    case "complaint_or_escalation": return "I'm extremely frustrated — I want to speak with a manager."
    case "finance_inquiry":         return "I'd like a trade-in valuation on my 2020 Tesla."
    default:                        return "Hi, calling about something on your lot."
  }
}
function agentResponse(c: ReceptionistCallRow): string {
  if (c.outcome === "answered_directly") return "We're open Monday to Friday 7am-7pm, Saturday 8am-5pm, and closed Sundays."
  if (c.outcome === "abandoned")          return "I'm sorry, could you repeat that?"
  return `Of course — let me get you to ${c.transferTarget}. One moment.`
}
