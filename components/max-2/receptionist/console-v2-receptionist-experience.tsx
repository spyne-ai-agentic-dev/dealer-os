"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import "@/styles/console-v2-sales.css"
import SecondaryNav from "@/components/max-2/sales/console-v2/components/SecondaryNav"
import MetricsBar from "@/components/max-2/sales/console-v2/components/MetricsBar"
import { ServiceTopIntentsTable, type ServiceTopIntentRow } from "@/components/max-2/service/service-top-intents-table"
import { dateRangeOptions, dealerData } from "@/components/max-2/sales/console-v2/mockData"
import { MaterialSymbol } from "@/components/max-2/material-symbol"
import { max2Classes, spyneComponentClasses, spyneSalesLayout } from "@/lib/design-system/max-2"
import { cn } from "@/lib/utils"
import {
  getReceptionistOverviewData,
  receptionistAgentData,
  receptionistFollowUps,
  receptionistCalls,
  knowledgeSuggestions,
  dataHealthIssues,
  type ReceptionistFollowUpItem,
} from "./receptionist-data"
import { ReceptionistAgentCard } from "./receptionist-agent-card"
import { ReceptionistRoutingPanel } from "./receptionist-routing-panel"
import { ActionItemsConsole as ReceptionistActionItems } from "./action-items"
import { ReceptionistCallsTable } from "./receptionist-calls-table"
import { ReceptionistDataHealth } from "./receptionist-data-health"
import { ReceptionistKnowledge } from "./receptionist-knowledge"

export function ConsoleV2ReceptionistExperience() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams.get("tab") ?? "overview"
  const [activePage, setActivePage] = useState<string>(tabParam)

  useEffect(() => {
    setActivePage(searchParams.get("tab") ?? "overview")
  }, [searchParams])

  function handlePageChange(page: string) {
    setActivePage(page)
    router.push(page === "overview" ? "/max-2/receptionist" : `/max-2/receptionist?tab=${page}`, { scroll: false })
  }

  const openActionItems       = receptionistFollowUps.filter((f) => f.status === "open").length
  const knowledgeGaps         = knowledgeSuggestions.length
  const dataHealthIssueCount  = dataHealthIssues.length

  const badgeOverrides = {
    "data-health":  dataHealthIssueCount > 0 ? dataHealthIssueCount : null,
    "action-items": openActionItems      > 0 ? openActionItems      : null,
    "knowledge":    knowledgeGaps        > 0 ? knowledgeGaps        : null,
  }

  return (
    <div className="console-v2-sales-root relative min-h-[calc(100dvh-4rem)] w-full min-w-0 bg-spyne-page">
      <SecondaryNav activePage={activePage} embedded onPageChange={handlePageChange} department="receptionist" badgeOverrides={badgeOverrides} />
      <main className="min-w-0 transition-all duration-200">
        <div className={max2Classes.moduleSecondaryNavPageBody}>
          {activePage === "overview"       && <ReceptionistOverviewPage onNavigate={handlePageChange} dataHealthIssues={dataHealthIssueCount} />}
          {activePage === "data-health"    && <ReceptionistDataHealth />}
          {activePage === "calls"          && <ReceptionistCallsTable calls={receptionistCalls} />}
          {activePage === "action-items"   && <ReceptionistActionItems />}
          {activePage === "knowledge"      && <ReceptionistKnowledge />}
        </div>
      </main>
    </div>
  )
}

// ============= OVERVIEW PAGE =============
function ReceptionistOverviewPage({ onNavigate, dataHealthIssues }: { onNavigate: (page: string) => void; dataHealthIssues: number }) {
  const [dateRange, setDateRange] = useState("Last 30 days")
  const overview = getReceptionistOverviewData(dateRange)

  // Map receptionist rows to ServiceTopIntentRow shape (routed → resolved)
  const intentRows: ServiceTopIntentRow[] = overview.topIntents.map((r) => ({
    intent: r.intent,
    calls: r.calls,
    resolved: r.routed,
    appts: r.appts,
    ratePct: r.ratePct,
    tone: (r.tone === "danger" ? "warning" : r.tone) as ServiceTopIntentRow["tone"],
  }))

  // Caller follow-ups only — config gaps are admin/system tasks surfaced in Data Health.
  const openItems = receptionistFollowUps.filter((f) => f.status === "open" && f.type !== "config_gap")
  const urgentItems = openItems.filter((f) => f.priority === "Urgent" || f.priority === "High")

  return (
    <div className={spyneSalesLayout.pageStack}>
      <div
        className={cn(
          "sticky z-[30] -mx-max2-page bg-spyne-page px-max2-page pt-4 pb-3",
          "top-[6rem] lg:top-10",
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className={max2Classes.pageTitle}>Hello Lakshya, Welcome back</h1>
            <p className={max2Classes.pageDescription}>Receptionist overview · {dateRange}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <ReceptionistAgentChip />
            <DateRangeSelect value={dateRange} onChange={setDateRange} />
          </div>
        </div>
      </div>

      <NeedsAttentionStrip
        openItems={openItems.length}
        urgentItems={urgentItems.length}
        dataHealthIssues={dataHealthIssues}
        knowledgeGaps={knowledgeSuggestions.length}
        onNavigate={onNavigate}
      />

      <MetricsBar metrics={overview.metricsBar} />

      <div className={cn("grid grid-cols-1 xl:grid-cols-[1.6fr_1fr]", spyneSalesLayout.sectionGap)}>
        <ServiceTopIntentsTable rows={intentRows} />
        <ReceptionistRoutingPanel
          rateLabel={overview.routingDistribution.rateLabel}
          rateCaption={overview.routingDistribution.rateCaption}
          deltaLabel={overview.routingDistribution.deltaLabel}
          segments={overview.routingDistribution.segments}
        />
      </div>

      <div className={cn(spyneSalesLayout.overviewAgentRow, spyneSalesLayout.sectionGap)}>
        <ReceptionistAgentCard agent={receptionistAgentData} />
        <PriorityFollowUpsCard
          items={urgentItems}
          totalOpen={openItems.length}
          onViewAll={() => onNavigate("action-items")}
        />
        <RecentCallsCard
          calls={receptionistCalls.slice(0, 5)}
          total={receptionistCalls.length}
          onViewAll={() => onNavigate("calls")}
        />
      </div>
    </div>
  )
}

function NeedsAttentionStrip({ openItems, urgentItems, dataHealthIssues, knowledgeGaps, onNavigate }: {
  openItems: number
  urgentItems: number
  dataHealthIssues: number
  knowledgeGaps: number
  onNavigate: (page: string) => void
}) {
  type Tile = { tone: "error" | "warning" | "brand" | "neutral"; icon: string; label: string; value: string; sub: string; cta: string; page: string }
  const tiles: Tile[] = []

  if (urgentItems > 0) tiles.push({
    tone: "error", icon: "priority_high",
    label: "Urgent action items", value: String(urgentItems),
    sub: `of ${openItems} total open`,
    cta: "Review",
    page: "action-items",
  })
  else if (openItems > 0) tiles.push({
    tone: "warning", icon: "checklist",
    label: "Open action items", value: String(openItems),
    sub: "callbacks, escalations, voicemails",
    cta: "Review",
    page: "action-items",
  })

  if (dataHealthIssues > 0) tiles.push({
    tone: "warning", icon: "warning",
    label: "Data health issues", value: String(dataHealthIssues),
    sub: "config or routing flags",
    cta: "Diagnose",
    page: "data-health",
  })

  if (knowledgeGaps > 0) tiles.push({
    tone: "brand", icon: "auto_awesome",
    label: "Knowledge gaps", value: String(knowledgeGaps),
    sub: "questions Riley couldn't answer",
    cta: "Resolve",
    page: "knowledge",
  })

  if (tiles.length === 0) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {tiles.map((t, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onNavigate(t.page)}
          className={cn(
            "group spyne-card flex items-center gap-4 p-4 text-left transition-colors",
            t.tone === "error"   && "bg-spyne-error-subtle/40 border-spyne-error-subtle hover:bg-spyne-error-subtle/60",
            t.tone === "warning" && "bg-spyne-warning-subtle/40 border-spyne-warning-subtle hover:bg-spyne-warning-subtle/60",
            t.tone === "brand"   && "bg-spyne-brand-subtle/40 border-spyne-brand-subtle hover:bg-spyne-brand-subtle/60",
          )}
        >
          <div className={cn(
            "shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
            t.tone === "error"   && "bg-spyne-error-subtle text-spyne-error",
            t.tone === "warning" && "bg-spyne-warning-subtle text-[var(--spyne-warning-ink)]",
            t.tone === "brand"   && "bg-spyne-brand-subtle text-spyne-brand",
          )}>
            <MaterialSymbol name={t.icon} size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className={cn(
                "text-[22px] font-bold tabular-nums leading-none",
                t.tone === "error"   && "text-spyne-error",
                t.tone === "warning" && "text-[var(--spyne-warning-ink)]",
                t.tone === "brand"   && "text-spyne-brand",
              )}>{t.value}</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-spyne-text-muted">{t.label}</span>
            </div>
            <div className="text-[12px] text-spyne-text-muted mt-1">{t.sub}</div>
          </div>
          <span className={cn(
            "shrink-0 inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[12px] font-semibold transition-transform group-hover:translate-x-0.5",
            t.tone === "error"   && "bg-spyne-error  text-white",
            t.tone === "warning" && "bg-[var(--spyne-warning-ink)] text-white",
            t.tone === "brand"   && "bg-spyne-brand  text-white",
          )}>
            {t.cta}
            <MaterialSymbol name="arrow_forward" size={13} />
          </span>
        </button>
      ))}
    </div>
  )
}

function ReceptionistAgentChip() {
  return (
    <div className="flex items-center gap-2 rounded-full bg-spyne-brand-subtle pl-1 pr-3 py-1">
      <div
        className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold text-white"
        style={{ background: "linear-gradient(135deg, var(--spyne-brand), color-mix(in srgb, var(--spyne-brand) 70%, black))" }}
      >
        R
      </div>
      <span className="text-[13px] font-semibold text-spyne-brand">Riley · Inbound</span>
    </div>
  )
}

function DateRangeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  const options = (dateRangeOptions as string[]).filter((o) => o !== "Custom range")

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-spyne-border bg-spyne-surface px-3 py-2 text-[13px] font-semibold text-spyne-text-primary hover:bg-spyne-surface-hover"
      >
        {value}
        <MaterialSymbol name="expand_more" size={14} className="text-spyne-text-muted" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-30 min-w-[160px] rounded-lg border border-spyne-border bg-spyne-surface py-1.5 shadow-lg">
          {options.map((o: string) => (
            <button
              key={o}
              onClick={() => { onChange(o); setOpen(false) }}
              className={cn(
                "w-full px-3.5 py-2 text-left text-[13px] hover:bg-spyne-surface-hover",
                value === o && "bg-spyne-brand-subtle font-semibold text-spyne-brand"
              )}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PriorityFollowUpsCard({ items, totalOpen, onViewAll }: { items: ReceptionistFollowUpItem[]; totalOpen: number; onViewAll: () => void }) {
  return (
    <div className="spyne-card flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
        <div className="flex items-center gap-1.5">
          <h3 className={cn(spyneComponentClasses.cardTitle, "m-0")}>Priority follow-ups</h3>
          <span className={cn(
            "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
            items.length > 0 ? "bg-spyne-error text-white" : "bg-spyne-surface-hover text-spyne-text-muted"
          )}>
            {items.length}
          </span>
        </div>
        <span className="text-[11px] font-semibold text-spyne-text-muted">of {totalOpen} open</span>
      </div>
      <div className="flex-1 flex flex-col gap-3 px-4">
        {items.length === 0 ? (
          <div className="py-6 text-center text-[12px] text-spyne-text-muted">No urgent items right now.</div>
        ) : items.slice(0, 4).map((item) => (
          <div key={item.id} className="flex items-start gap-2.5 pb-3 last:pb-0 border-b border-spyne-border last:border-b-0">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{ background: "var(--spyne-brand)" }}
            >
              {(item.callerName ?? item.callerPhone).slice(-2)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-spyne-text-primary truncate">{item.callerName ?? item.callerPhone}</div>
              <div className="text-[11px] text-spyne-text-muted line-clamp-1 mt-0.5">{item.task}</div>
            </div>
            <span
              className={cn(
                "shrink-0 rounded px-2 py-0.5 text-[10px] font-bold",
                item.priority === "Urgent" ? "bg-spyne-error-subtle text-spyne-error" : "bg-spyne-warning-subtle text-[var(--spyne-warning-ink)]"
              )}
            >
              {item.priority}
            </span>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onViewAll}
        className="mt-2 border-t border-spyne-border px-4 py-2.5 text-[12px] font-semibold text-spyne-brand hover:bg-spyne-brand-subtle/40 flex items-center justify-center gap-1"
      >
        View all {totalOpen} action items
        <MaterialSymbol name="arrow_forward" size={13} />
      </button>
    </div>
  )
}

function RecentCallsCard({ calls, total, onViewAll }: { calls: typeof receptionistCalls; total: number; onViewAll: () => void }) {
  return (
    <div className="spyne-card flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
        <h3 className={cn(spyneComponentClasses.cardTitle, "m-0")}>Recent calls</h3>
        <span className="text-[11px] font-semibold text-spyne-text-muted">{total} total</span>
      </div>
      <div className="flex-1 flex flex-col gap-3 px-4 pb-1">
        {calls.map((c) => {
          const m = c.startedAt.match(/T(\d{2}):(\d{2})/)
          const time = m ? `${(+m[1] % 12) || 12}:${m[2]} ${(+m[1]) >= 12 ? "PM" : "AM"}` : ""
          return (
            <button
              key={c.id}
              type="button"
              onClick={onViewAll}
              className="flex items-start gap-3 text-[13px] -mx-2 px-2 py-1.5 rounded-md hover:bg-spyne-surface-hover transition-colors text-left"
            >
              <span className="w-14 shrink-0 tabular-nums text-[11px] font-medium text-spyne-text-muted pt-0.5">{time}</span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-spyne-text-primary truncate">{c.customerName ?? c.callerPhone}</div>
                <div className="text-[11px] text-spyne-text-muted line-clamp-1 mt-0.5">
                  {c.intentTitle} · {c.transferTarget === "—" ? "Answered directly" : `→ ${c.transferTarget}`}
                </div>
              </div>
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={onViewAll}
        className="mt-2 border-t border-spyne-border px-4 py-2.5 text-[12px] font-semibold text-spyne-brand hover:bg-spyne-brand-subtle/40 flex items-center justify-center gap-1"
      >
        View all calls
        <MaterialSymbol name="arrow_forward" size={13} />
      </button>
    </div>
  )
}
