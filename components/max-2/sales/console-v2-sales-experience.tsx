"use client"

import * as React from "react"
import { useState, useRef, useEffect, useCallback, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import "@/styles/console-v2-sales.css"
import SecondaryNav from "@/components/max-2/sales/console-v2/components/SecondaryNav"
import UpcomingAppointments from "@/components/max-2/sales/console-v2/components/UpcomingAppointments"
import PriorityFollowUps from "@/components/max-2/sales/console-v2/components/PriorityFollowUps"
import MetricsBar from "@/components/max-2/sales/console-v2/components/MetricsBar"
import SpeedToLeadPanel from "@/components/max-2/sales/console-v2/components/SpeedToLeadPanel"
import ActivityChart from "@/components/max-2/sales/console-v2/components/ActivityChart"
import ViniInsightsStrip from "@/components/max-2/sales/console-v2/components/ViniInsightsStrip"
import ViniDailyBrief from "@/components/max-2/sales/console-v2/components/ViniDailyBrief"
import AppointmentsPage from "@/components/max-2/sales/console-v2/components/AppointmentsPage"
import CustomerListingPage from "@/components/max-2/sales/console-v2/components/CustomerListingPage"
import CustomerProfilePage from "@/components/max-2/sales/console-v2/components/CustomerProfilePage"
import CampaignsPage from "@/components/max-2/sales/console-v2/components/CampaignsPage"
import LeadsBySourceCard from "@/components/max-2/sales/console-v2/components/LeadsBySourceCard"
import OutboundCampaignsCard from "@/components/max-2/sales/console-v2/components/OutboundCampaignsCard"
import CallbacksFollowups from "@/components/max-2/sales/console-v2/components/CallbacksFollowups"
import FollowUpSequencesStrip from "@/components/max-2/sales/console-v2/components/FollowUpSequencesStrip"
import CallHandlingPanel from "@/components/max-2/sales/console-v2/components/CallHandlingPanel"
import LeadIntelligenceBoard from "@/components/max-2/sales/console-v2/components/LeadIntelligenceBoard"
import { ActionItemsConsole } from "@/components/max-2/sales/console-v2/action-items"
import { ReportsOverview } from "@/components/max-2/reports/ReportsOverview"
import { SalesOverviewPage } from "@/components/max-2/sales/console-v2/components/SalesOverviewPage"
import {
  salesAgentData,
  salesOutboundAgentData,
  appointmentsData,
  priorityFollowUpsData,
  dateRangeOptions,
  getOverviewData,
  getOutboundOverviewData,
  leadsBySourceData,
  outboundCampaignsData,
  callbacksData,
  followUpSequencesData,
  callHandlingData,
  leadIntelligenceData,
  campaignsData,
  outboundAgentData,
  lotInventoryData,
  dealerData,
} from "@/components/max-2/sales/console-v2/mockData"
import { useMax2Ui } from "@/components/max-2/max-2-ui-context"
import {
  SpyneFilterSelectChevron,
  SpyneFilterSelectWrap,
  SpyneSegmentedButton,
  SpyneSegmentedControl,
  SpyneSegmentedStatusDot,
} from "@/components/max-2/spyne-toolbar-controls"
import { max2Classes, spyneComponentClasses, spyneSalesLayout } from "@/lib/design-system/max-2"
import { cn } from "@/lib/utils"

/** Base path for the Sales console. */
export const SALES_BASE = "/max-2/sales"

/** The tabs that own a top-level route segment under {@link SALES_BASE}. */
export type SalesPage =
  | "overview"
  | "reports"
  | "campaigns"
  | "action-items"
  | "appointments"
  | "customers"
  | "customer-profile"

/** Map an active page (+ optional customer id) to its URL. */
export function pathForSalesPage(page: SalesPage, id?: string | null): string {
  switch (page) {
    case "overview":
      return SALES_BASE
    case "customer-profile":
      return id ? `${SALES_BASE}/customers/${id}` : `${SALES_BASE}/customers`
    default:
      return `${SALES_BASE}/${page}`
  }

}

export function ConsoleV2SalesExperience({
  page = "overview",
  routeId = null,
}: {
  /** Active page, derived from the URL by the route segment. */
  page?: SalesPage
  /** Second URL segment — currently the customer id for the profile page. */
  routeId?: string | null
}) {
  const { sidebarCollapsed } = useMax2Ui()
  const router = useRouter()

  // A prompt handed from a campaign CTA → opens the campaign builder pre-filled
  // when the Campaigns tab mounts.
  const [campaignPrefillPrompt, setCampaignPrefillPrompt] = useState("")

  // Every tab is a real route now — navigation pushes the URL instead of
  // flipping local state, so deep links, back/forward, and refresh all work.
  const go = (next: SalesPage, id?: string | null) => router.push(pathForSalesPage(next, id))

  // Drilled-in sub-pages keep their parent tab lit in the secondary nav.
  const navPage = page === "customer-profile" ? "customers" : page

  return (
    <div className="console-v2-sales-root relative min-h-[calc(100dvh-4rem)] w-full min-w-0 bg-spyne-page">
      <SecondaryNav activePage={navPage} embedded onPageChange={(p: SalesPage) => go(p)} />

      <main className="min-w-0 transition-all duration-200">
        <div className="px-max2-page py-6">
          {page === "overview" && (
            <SalesOverviewPage onNavigate={(p: string) => go(p as SalesPage)} />
          )}
          {page === "reports" && <ReportsOverview department="sales" />}
          {page === "campaigns" && (
            <CampaignsPage
              data={campaignsData}
              outboundData={outboundAgentData}
              agent={salesAgentData}
              prefillVehicles={null}
              onClearPrefill={() => {}}
              lotData={lotInventoryData}
              prefillPrompt={campaignPrefillPrompt}
              onClearPrefillPrompt={() => setCampaignPrefillPrompt("")}
            />
          )}
          {page === "action-items" && <ActionItemsConsole />}
          {page === "appointments" && <AppointmentsPage />}
          {page === "customers" && (
            <CustomerListingPage onViewProfile={(id: string) => go("customer-profile", id)} />
          )}
          {page === "customer-profile" && (
            <CustomerProfilePage customerId={routeId} onBack={() => go("customers")} />
          )}
        </div>
      </main>
    </div>
  )
}

function DateRangeFilter({
  value,
  onChange,
  customLabel,
}: {
  value: string
  onChange: (range: string, start: string, end: string) => void
  customLabel: string
}) {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [tempStart, setTempStart] = useState("")
  const [tempEnd, setTempEnd] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setPopoverOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value
    if (v === "Custom range") {
      setTempStart("")
      setTempEnd("")
      setPopoverOpen(true)
    } else {
      setPopoverOpen(false)
    }
    onChange(v, "", "")
  }

  function handleApply() {
    if (tempStart && tempEnd) {
      onChange("Custom range", tempStart, tempEnd)
      setPopoverOpen(false)
    }
  }

  function handleCancel() {
    setPopoverOpen(false)
    if (value === "Custom range" && !customLabel) onChange("Last 30 days", "", "")
  }

  return (
    <div ref={ref} className="relative">
      <SpyneFilterSelectWrap>
        <select
          value={value}
          onChange={handleSelectChange}
          className={cn(spyneComponentClasses.filterSelect, "min-w-[10.5rem] cursor-pointer")}
          aria-label="Date range"
        >
          {dateRangeOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt === "Custom range" && customLabel ? customLabel : opt}
            </option>
          ))}
        </select>
        <SpyneFilterSelectChevron />
      </SpyneFilterSelectWrap>

      {popoverOpen && (
        <div
          className={cn(
            "absolute right-0 z-[100] w-64 rounded-[12px] border border-spyne-border bg-spyne-surface p-4 shadow-lg",
            "top-[calc(100%+6px)]",
          )}
        >
          <p className="spyne-label mb-3 font-semibold text-spyne-text-primary">Custom date range</p>
          <div className="mb-4 flex flex-col gap-2">
            <div>
              <label className="spyne-caption mb-1 block text-spyne-text-secondary">From</label>
              <input
                type="date"
                value={tempStart}
                onChange={(e) => setTempStart(e.target.value)}
                className="spyne-input w-full cursor-pointer text-xs"
              />
            </div>
            <div>
              <label className="spyne-caption mb-1 block text-spyne-text-secondary">To</label>
              <input
                type="date"
                value={tempEnd}
                min={tempStart || undefined}
                onChange={(e) => setTempEnd(e.target.value)}
                className="spyne-input w-full cursor-pointer text-xs"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleCancel} className="spyne-btn-ghost h-8 flex-1 justify-center text-xs">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className={cn(
                "spyne-btn-primary h-8 flex-1 justify-center text-xs",
                !(tempStart && tempEnd) && "pointer-events-none opacity-40",
              )}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AgentToggle({
  activeAgent,
  onSwitch,
}: {
  activeAgent: string
  onSwitch: (id: string) => void
}) {
  const agents = [
    { id: "inbound", data: salesAgentData },
    { id: "outbound", data: salesOutboundAgentData },
  ]

  return (
    <SpyneSegmentedControl aria-label="Active agent">
      {agents.map(({ id, data }) => {
        const active = activeAgent === id
        return (
          <SpyneSegmentedButton key={id} active={active} onClick={() => onSwitch(id)}>
            <SpyneSegmentedStatusDot live={data.status === "online"} />
            {data.name} · {id.charAt(0).toUpperCase() + id.slice(1)}
          </SpyneSegmentedButton>
        )
      })}
    </SpyneSegmentedControl>
  )
}

function OverviewPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [activeAgent, setActiveAgent] = useState("inbound")
  const [dateRange, setDateRange] = useState("Last 30 days")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")

  const isOutbound = activeAgent === "outbound"
  const inboundOverview = getOverviewData(dateRange)
  const outboundOverview = getOutboundOverviewData(dateRange)
  const metricsBar = isOutbound ? outboundOverview.metricsBar : inboundOverview.metricsBar
  const activityChart = isOutbound ? outboundOverview.activityChart : inboundOverview.activityChart

  // The dealer's bottom line — lead with revenue/cars/appointments, not the 7-wide
  // operational wall. Fall back to the first 4 if labels don't match this dataset.
  const HERO_METRIC_LABELS = ["Revenue Influenced", "Cars Sold", "Appointments Booked", "Leads Qualified"]
  const heroMetrics = (() => {
    const picked = HERO_METRIC_LABELS
      .map((l) => metricsBar.find((m: { label?: string }) => m.label === l))
      .filter(Boolean) as typeof metricsBar
    return picked.length >= 3 ? picked : metricsBar.slice(0, 4)
  })()

  const customLabel = customStart && customEnd ? `${customStart} – ${customEnd}` : ""
  const periodLabel = dateRange === "Custom range" && customLabel ? customLabel : dateRange

  function handleDateChange(range: string, start: string, end: string) {
    setDateRange(range)
    setCustomStart(start)
    setCustomEnd(end)
  }

  // ── VINI Daily Brief data ─────────────────────────────────────────
  // Derived from the same mock surfaces the rest of the page reads, so the
  // hero stays honest about what's below it.
  const apptCount = (appointmentsData?.today?.length ?? 0) + (appointmentsData?.tomorrow?.length ?? 0)
  const followUpCount =
    (priorityFollowUpsData?.hot?.length ?? 0) +
    (priorityFollowUpsData?.warm?.length ?? 0) +
    (priorityFollowUpsData?.todaysCallbacks?.length ?? 0)
  const liveCampaignCount = outboundCampaignsData?.campaigns?.length ?? 0

  const briefPriority = isOutbound
    ? {
        headline: `${liveCampaignCount} campaigns are live and dispatching now`,
        detail: "Two are beating their response benchmark — scale the winners while they're hot.",
        cta: "Review campaigns",
        target: "campaigns",
      }
    : {
        headline: `${followUpCount} high-priority follow-ups are slipping`,
        detail: "These leads are cooling fastest — VINI ordered them by decay risk. Clear the top of the queue first.",
        cta: "Open the queue",
        target: "action-items",
      }

  const briefFunnel = isOutbound
    ? [
        { label: "Calls", value: "312" },
        { label: "Leads", value: "148" },
        { label: "Appts", value: String(apptCount || 41) },
        { label: "Deals", value: "12" },
      ]
    : [
        { label: "Calls", value: "204" },
        { label: "Leads", value: "121" },
        { label: "Appts", value: String(apptCount || 38) },
        { label: "Deals", value: "9" },
      ]

  const briefRoi = {
    value: isOutbound ? "$61.4K" : "$48.2K",
    deltaLabel: isOutbound ? "18% vs last period" : "12% vs last period",
    deltaDir: "up" as const,
  }

  const briefActionItems = {
    count: followUpCount + (isOutbound ? 0 : 2),
    label: "follow-ups + missed callbacks",
  }

  const briefAgentHealth = {
    status: "green" as const,
    label: "Qual rate 61% · CSAT 4.6 · transfers clean",
  }

  return (
    <div className={spyneSalesLayout.pageStack}>
      <div
        className={cn(
          "sticky z-[30] -mx-max2-page bg-spyne-page px-max2-page pt-6 pb-3 -mt-6",
          "top-[6rem] lg:top-10",
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className={max2Classes.pageTitle}>Sales</h1>
            <p className={max2Classes.pageDescription}>{isOutbound ? "Outbound" : "Inbound"} · {periodLabel}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <AgentToggle activeAgent={activeAgent} onSwitch={setActiveAgent} />
            <DateRangeFilter value={dateRange} onChange={handleDateChange} customLabel={customLabel} />
          </div>
        </div>
      </div>

      <ViniDailyBrief
        userName={dealerData.userName}
        periodLabel={periodLabel}
        topPriority={briefPriority}
        funnel={briefFunnel}
        roi={briefRoi}
        actionItems={briefActionItems}
        agentHealth={briefAgentHealth}
        onNavigate={(page: string) => onNavigate?.(page)}
      />

      {/* Bottom line — the 4 outcomes a dealer cares about, not the 7-wide wall */}
      <MetricsBar metrics={heroMetrics} />

      {/* Needs your attention */}
      <OverviewSection title="Needs your attention" hint="ordered by what's cooling fastest">
        <div className={cn("grid grid-cols-1 lg:grid-cols-2", spyneSalesLayout.sectionGap)}>
          <PriorityFollowUps followUps={priorityFollowUpsData} />
          <UpcomingAppointments appointments={appointmentsData} />
        </div>
      </OverviewSection>

      {/* Pipeline & performance */}
      <OverviewSection title="Pipeline & performance" hint={isOutbound ? "your live campaigns" : "where VINI is winning"}>
        {isOutbound ? (
          <OutboundCampaignsCard data={outboundCampaignsData} onViewCampaign={() => onNavigate?.("campaigns")} />
        ) : (
          <div className={cn("grid grid-cols-1 xl:grid-cols-[1.6fr_1fr]", spyneSalesLayout.sectionGap)}>
            <LeadIntelligenceBoard data={leadIntelligenceData} />
            <SpeedToLeadPanel data={inboundOverview.speedToLead} />
          </div>
        )}
      </OverviewSection>

      {/* Activity */}
      <OverviewSection title="Activity" hint="touchpoints over the period">
        <ActivityChart data={activityChart} agentType={activeAgent} />
      </OverviewSection>
    </div>
  )
}

/** A labeled, breathable zone — gives the overview a clear reading rhythm
 * (eyebrow → content) instead of a flat wall of stacked cards. */
function OverviewSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <h2 className="text-[13px] font-bold uppercase tracking-wide" style={{ color: "var(--spyne-text-secondary)" }}>{title}</h2>
        {hint && <span className="text-[11px]" style={{ color: "var(--spyne-text-muted)" }}>{hint}</span>}
      </div>
      {children}
    </section>
  )
}
