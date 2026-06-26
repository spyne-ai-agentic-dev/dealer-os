"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import "@/styles/console-v2-sales.css"
import SecondaryNav from "@/components/max-2/sales/console-v2/components/SecondaryNav"
import UpcomingAppointments from "@/components/max-2/sales/console-v2/components/UpcomingAppointments"
import PriorityFollowUps, {
  type ServicePriorityFollowUpItem,
} from "@/components/max-2/sales/console-v2/components/PriorityFollowUps"
import MetricsBar from "@/components/max-2/sales/console-v2/components/MetricsBar"
import ActivityChart from "@/components/max-2/sales/console-v2/components/ActivityChart"
import { ActionItemsConsole } from "@/components/max-2/sales/console-v2/action-items"
import AppointmentsPage from "@/components/max-2/sales/console-v2/components/AppointmentsPage"
import { ReportsOverview } from "@/components/max-2/reports/ReportsOverview"
import CustomerListingPage from "@/components/max-2/sales/console-v2/components/CustomerListingPage"
import CustomerProfilePage from "@/components/max-2/sales/console-v2/components/CustomerProfilePage"
import CampaignsPage from "@/components/max-2/sales/console-v2/components/CampaignsPage"
import OutboundCampaignsCard from "@/components/max-2/sales/console-v2/components/OutboundCampaignsCard"
import ServiceAgentOverviewCard from "@/components/max-2/service/service-agent-overview-card"
import { ServiceShowRatePanel } from "@/components/max-2/service/service-show-rate-panel"
import { ServiceTopIntentsTable, type ServiceTopIntentRow } from "@/components/max-2/service/service-top-intents-table"
import {
  serviceAgentData,
  serviceOutboundAgentData,
  appointmentsData,
  servicePriorityFollowUpsData,
  dateRangeOptions,
  getServiceOverviewData,
  getServiceOutboundOverviewData,
  outboundCampaignsData,
  serviceCampaignsData,
  serviceOutboundPipelineData,
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

export function ConsoleV2ServiceExperience() {
  const { sidebarCollapsed } = useMax2Ui()
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams.get("tab") ?? "overview"
  const [activePage, setActivePage] = useState<string>(tabParam)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

  useEffect(() => {
    const tab = searchParams.get("tab") ?? "overview"
    setActivePage(tab)
  }, [searchParams])

  function handlePageChange(page: string) {
    setActivePage(page)
    const url = page === "overview" ? "/max-2/service" : `/max-2/service?tab=${page}`
    router.push(url, { scroll: false })
  }

  return (
    <div className="console-v2-sales-root relative min-h-[calc(100dvh-4rem)] w-full min-w-0 bg-spyne-page">
      <SecondaryNav activePage={activePage} embedded onPageChange={handlePageChange} department="service" />

      <main className="min-w-0 transition-all duration-200">
        <div className={max2Classes.moduleSecondaryNavPageBody}>
          {activePage === "overview" && <ServiceOverviewPage onNavigate={handlePageChange} />}
          {activePage === "campaigns" && (
            <CampaignsPage
              data={serviceCampaignsData}
              department="service"
              outboundData={serviceOutboundPipelineData}
              agent={serviceAgentData}
              prefillVehicles={null}
              onClearPrefill={() => {}}
              lotData={null}
            />
          )}
          {activePage === "action-items" && <ActionItemsConsole />}
          {activePage === "reports" && <ReportsOverview department="service" />}
          {activePage === "appointments" && <AppointmentsPage department="service" />}
          {activePage === "customers" && (
            <CustomerListingPage
              department="service"
              onViewProfile={(id: string) => {
                setSelectedCustomerId(id)
                handlePageChange("customer-profile")
              }}
              onNavigate={handlePageChange}
            />
          )}
          {activePage === "customer-profile" && (
            <CustomerProfilePage
              customerId={selectedCustomerId}
              department="service"
              onBack={() => handlePageChange("customers")}
              onNavigate={handlePageChange}
            />
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

function ServiceAgentToggle({
  activeAgent,
  onSwitch,
}: {
  activeAgent: string
  onSwitch: (id: string) => void
}) {
  const agents = [
    { id: "inbound", data: serviceAgentData },
    { id: "outbound", data: serviceOutboundAgentData },
  ]

  return (
    <SpyneSegmentedControl aria-label="Active service agent">
      {agents.map(({ id, data }) => {
        const active = activeAgent === id
        const isOnline = data.status === "online"
        return (
          <SpyneSegmentedButton key={id} active={active} onClick={() => onSwitch(id)}>
            <span className="relative inline-flex shrink-0">
              {data.photo ? (
                <img
                  src={data.photo}
                  alt={data.name}
                  className="h-5 w-5 rounded-full object-cover object-top"
                  style={{ border: isOnline ? "1.5px solid var(--spyne-success)" : "1.5px solid var(--spyne-border)" }}
                />
              ) : (
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold"
                  style={{
                    background: "var(--spyne-brand-subtle)",
                    color: "var(--spyne-brand)",
                    border: isOnline ? "1.5px solid var(--spyne-success)" : "1.5px solid var(--spyne-border)",
                  }}
                >
                  {data.name.charAt(0)}
                </span>
              )}
              <span
                className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full"
                style={{
                  background: isOnline ? "var(--spyne-success)" : "var(--spyne-text-muted)",
                  border: "1px solid var(--spyne-surface)",
                }}
              />
            </span>
            {data.name} · {id.charAt(0).toUpperCase() + id.slice(1)}
          </SpyneSegmentedButton>
        )
      })}
    </SpyneSegmentedControl>
  )
}

function ServiceOverviewPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [activeAgent, setActiveAgent] = useState("inbound")
  const [dateRange, setDateRange] = useState("Last 30 days")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")

  const isOutbound = activeAgent === "outbound"
  const agentData = isOutbound ? serviceOutboundAgentData : serviceAgentData
  const inboundOverview = getServiceOverviewData(dateRange)
  const outboundOverview = getServiceOutboundOverviewData(dateRange)
  const metricsBar = isOutbound ? outboundOverview.metricsBar : inboundOverview.metricsBar
  const activityChart = isOutbound ? outboundOverview.activityChart : inboundOverview.activityChart
  const inboundTopIntents = inboundOverview.topIntents
  const inboundShowRate = inboundOverview.showRate

  const customLabel = customStart && customEnd ? `${customStart} – ${customEnd}` : ""
  const periodLabel = dateRange === "Custom range" && customLabel ? customLabel : dateRange

  function handleDateChange(range: string, start: string, end: string) {
    setDateRange(range)
    setCustomStart(start)
    setCustomEnd(end)
  }

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
            <h1 className={max2Classes.pageTitle}>Hello {dealerData.userName}, Welcome back</h1>
            <p className={max2Classes.pageDescription}>
              Service overview · {periodLabel}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <ServiceAgentToggle activeAgent={activeAgent} onSwitch={setActiveAgent} />
            <DateRangeFilter value={dateRange} onChange={handleDateChange} customLabel={customLabel} />
          </div>
        </div>
      </div>

      <MetricsBar metrics={metricsBar} />

      {isOutbound ? (
        <OutboundCampaignsCard data={outboundCampaignsData} onViewCampaign={() => onNavigate?.("campaigns")} />
      ) : (
        <div className={cn("grid grid-cols-1 xl:grid-cols-[1.6fr_1fr]", spyneSalesLayout.sectionGap)}>
          {inboundTopIntents ? (
            <ServiceTopIntentsTable rows={inboundTopIntents as ServiceTopIntentRow[]} />
          ) : null}
          {inboundShowRate ? (
            <ServiceShowRatePanel
              rateLabel={inboundShowRate.rateLabel}
              rateCaption={inboundShowRate.rateCaption}
              deltaLabel={inboundShowRate.deltaLabel}
              segments={inboundShowRate.segments}
            />
          ) : null}
        </div>
      )}

      <div className={cn(spyneSalesLayout.overviewAgentRow, spyneSalesLayout.sectionGap)}>
        <ServiceAgentOverviewCard agent={agentData} />
        <UpcomingAppointments appointments={appointmentsData} variant="service" />
        <PriorityFollowUps
          variant="service"
          items={servicePriorityFollowUpsData as ServicePriorityFollowUpItem[]}
          urgentCount={5}
        />
      </div>

      <ActivityChart data={activityChart} agentType={activeAgent} department="service" />
    </div>
  )
}
