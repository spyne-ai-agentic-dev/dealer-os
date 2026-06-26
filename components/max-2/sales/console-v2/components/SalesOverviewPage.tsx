"use client"

import { useState } from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { MaterialSymbol } from "@/components/max-2/material-symbol"
import { max2Classes, spyneComponentClasses, spyneSalesLayout } from "@/lib/design-system/max-2"
import { cn } from "@/lib/utils"
import {
  SpyneFilterSelectChevron,
  SpyneFilterSelectWrap,
  SpyneSegmentedButton,
  SpyneSegmentedControl,
  SpyneSegmentedStatusDot,
} from "@/components/max-2/spyne-toolbar-controls"
import {
  getOverviewData,
  getOutboundOverviewData,
  salesAgentData,
  salesOutboundAgentData,
  priorityFollowUpsData,
  dateRangeOptions,
  dealerData,
} from "@/components/max-2/sales/console-v2/mockData"

// ── Static mock data for new overview sections ─────────────────────────────

const CALL_TYPES = [
  { label: "Appointment Scheduled", count: 544, pct: 44 },
  { label: "Lead Qualified",        count: 310, pct: 25 },
  { label: "General Inquiry",       count: 95,  pct: 8  },
  { label: "Callback Requested",    count: 92,  pct: 7  },
  { label: "Others",                count: 177, pct: 14 },
]

const DROP_OFF_REASONS = [
  { label: "Successfully Handled",   pct: 54, color: "var(--spyne-success)" },
  { label: "Preferred a Human",      pct: 17, color: "var(--spyne-text-muted)" },
  { label: "Lead Disconnected",      pct: 14, color: "var(--spyne-warning)" },
  { label: "No Response",            pct: 8,  color: "var(--spyne-error)" },
  { label: "Others",                 pct: 7,  color: "var(--spyne-border)" },
]

const CHANNELS = [
  { label: "Phone",  value: 1185, flag: "📞" },
  { label: "SMS",    value: 33,   flag: "💬" },
]

const ALERTS = [
  { id: "a1", icon: "warning",      iconColor: "#F59E0B", label: "5 Leads Uncontacted",  sub: "over 4 hours old" },
  { id: "a2", icon: "loop",         iconColor: "#EF4444", label: "2 Looped Calls",        sub: "need review" },
  { id: "a3", icon: "notifications",iconColor: "#4600F2", label: "3 Callbacks Due",       sub: "in the next hour" },
]

const ACTIVITY_FEED = [
  { time: "9:41 AM",  label: "Appointment Booked",   count: 5,  name: "Jessica Parker"    },
  { time: "9:24 AM",  label: "No Action",             count: 4,  name: "Tommy Lee"         },
  { time: "9:06 AM",  label: "Lead Transferred",      count: 8,  name: "Brian Benstock"    },
  { time: "8:57 AM",  label: "Appt Request",          count: null, name: "Maria Garcia"    },
  { time: "8:40 AM",  label: "Appointment Booked",    count: 10, name: "David Chen"        },
  { time: "8:21 AM",  label: "No Action",             count: 3,  name: "Sarah Reynolds"    },
  { time: "8:05 AM",  label: "Appointment Booked",    count: 10, name: "Alex Torres"       },
  { time: "7:55 AM",  label: "Appt Request",          count: null, name: "Casey Kim"       },
]

// ── Sub-components ─────────────────────────────────────────────────────────

function KpiCard({ label, value, delta, deltaDir, note }: {
  label: string; value: string; delta?: string; deltaDir?: string; note?: string
}) {
  const up = deltaDir === "up"
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-spyne-border bg-spyne-surface px-4 py-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--spyne-text-muted)" }}>
        {label}
      </span>
      <div className="flex items-end gap-2">
        <span className="text-[22px] font-bold leading-none tracking-tight" style={{ color: "var(--spyne-text-primary)" }}>
          {value}
        </span>
        {delta && (
          <span
            className="mb-0.5 text-[11px] font-semibold"
            style={{ color: up ? "var(--spyne-success-text)" : "var(--spyne-error)" }}
          >
            {up ? "↑" : "↓"} {delta}
          </span>
        )}
      </div>
      {note && (
        <span className="text-[11px]" style={{ color: "var(--spyne-text-muted)" }}>{note}</span>
      )}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-lg px-3 py-2 shadow-lg text-[11px]"
      style={{ background: "var(--spyne-text-primary)", color: "#fff" }}
    >
      <div className="font-bold mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value}</div>
      ))}
    </div>
  )
}

function CallDistributionChart({ data }: { data: any }) {
  const chartData = (data?.daily?.days ?? []).map((day: string, i: number) => ({
    day,
    "Leads Interacted": data?.daily?.metrics?.leadsInteracted?.data?.[i] ?? 0,
    "Leads Qualified":  data?.daily?.metrics?.leadsQualified?.data?.[i] ?? 0,
    "Appts Booked":     data?.daily?.metrics?.appointments?.data?.[i] ?? 0,
  }))

  const slice = chartData.slice(-14)

  return (
    <div className="spyne-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className={spyneComponentClasses.cardTitle}>Activity Distribution</div>
        <div className="flex items-center gap-4 text-[11px]" style={{ color: "var(--spyne-text-muted)" }}>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-5 rounded-full" style={{ background: "#4600F2" }} />
            Leads Interacted
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-5 rounded-full" style={{ background: "#22d3ee" }} />
            Leads Qualified
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-5 rounded-full" style={{ background: "#34d399" }} />
            Appts Booked
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={slice} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="colorLI" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4600F2" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#4600F2" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorLQ" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorAB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34d399" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--spyne-border)" />
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--spyne-text-muted)", fontFamily: "inherit" }} axisLine={false} tickLine={false} interval={2} />
          <YAxis tick={{ fontSize: 10, fill: "var(--spyne-text-muted)", fontFamily: "inherit" }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="Leads Interacted" stroke="#4600F2" strokeWidth={2} fill="url(#colorLI)" dot={false} />
          <Area type="monotone" dataKey="Leads Qualified"  stroke="#22d3ee" strokeWidth={2} fill="url(#colorLQ)" dot={false} />
          <Area type="monotone" dataKey="Appts Booked"     stroke="#34d399" strokeWidth={2} fill="url(#colorAB)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-3 flex items-center gap-6 border-t border-spyne-border pt-3">
        {[
          { label: "Total Leads", value: "1,218" },
          { label: "VINI Handled", value: "679" },
          { label: "Human Transfers", value: "539" },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="text-[11px]" style={{ color: "var(--spyne-text-muted)" }}>{label}</span>
            <span className="text-[15px] font-bold" style={{ color: "var(--spyne-text-primary)" }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FeaturedCalls() {
  const [filter, setFilter] = useState<"all" | "hot" | "callbacks">("all")

  const allLeads = [
    ...priorityFollowUpsData.todaysCallbacks.map((l) => ({ ...l, bucket: "callbacks" as const, status: "Appointment Scheduled", statusColor: "#16a34a" })),
    ...priorityFollowUpsData.hot.slice(0, 2).map((l) => ({ ...l, bucket: "hot" as const, status: "Needs Attention", statusColor: "#EF4444" })),
    ...priorityFollowUpsData.warm.map((l) => ({ ...l, bucket: "all" as const, status: "Follow-Up Needed", statusColor: "#F59E0B" })),
  ]

  const visible = allLeads.filter((l) => filter === "all" || l.bucket === filter)

  return (
    <div className="spyne-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className={spyneComponentClasses.cardTitle}>Featured Leads</div>
        <div className="flex gap-1">
          {(["all", "hot", "callbacks"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors"
              style={{
                background: filter === f ? "var(--spyne-primary-soft)" : "transparent",
                color: filter === f ? "var(--spyne-primary)" : "var(--spyne-text-muted)",
                border: "1px solid",
                borderColor: filter === f ? "var(--spyne-primary)" : "var(--spyne-border)",
              }}
            >
              {f === "all" ? "All" : f === "hot" ? "Hot" : "Callbacks"}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col divide-y divide-spyne-border">
        {visible.map((lead) => (
          <div key={lead.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white", lead.color)}>
              {lead.initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold" style={{ color: "var(--spyne-text-primary)" }}>{lead.name}</span>
                <span className="text-[11px]" style={{ color: "var(--spyne-text-muted)" }}>{lead.timeAgo}</span>
              </div>
              <p className="truncate text-[12px]" style={{ color: "var(--spyne-text-secondary)" }}>{lead.message}</p>
            </div>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
              style={{ background: `${lead.statusColor}18`, color: lead.statusColor }}
            >
              {lead.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CallTypesPanel() {
  return (
    <div className="spyne-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className={spyneComponentClasses.cardTitle}>Lead Types</div>
        <button className="text-[11px] font-medium" style={{ color: "var(--spyne-primary)" }}>View All</button>
      </div>
      <div className="flex flex-col gap-2">
        {CALL_TYPES.map(({ label, count, pct }) => (
          <div key={label} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[12px]">
              <span style={{ color: "var(--spyne-text-secondary)" }}>{label}</span>
              <span className="font-semibold" style={{ color: "var(--spyne-text-primary)" }}>{count.toLocaleString()}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--spyne-border)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: "var(--spyne-primary)" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DropOffPanel() {
  return (
    <div className="spyne-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className={spyneComponentClasses.cardTitle}>Reason for Drop-Off</div>
        <button className="text-[11px] font-medium" style={{ color: "var(--spyne-primary)" }}>View All</button>
      </div>
      <div className="flex flex-col gap-2.5">
        {DROP_OFF_REASONS.map(({ label, pct, color }) => (
          <div key={label} className="flex items-center gap-2.5">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: `${color}22` }}>
              <div className="h-2 w-2 rounded-full" style={{ background: color }} />
            </div>
            <span className="min-w-0 flex-1 text-[12px]" style={{ color: "var(--spyne-text-secondary)" }}>{label}</span>
            <span className="text-[12px] font-semibold" style={{ color: "var(--spyne-text-primary)" }}>{pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChannelPanel() {
  return (
    <div className="spyne-card p-4">
      <div className={cn(spyneComponentClasses.cardTitle, "mb-3")}>Lead Channels</div>
      <div className="flex flex-col gap-3">
        {CHANNELS.map(({ label, value, flag }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">{flag}</span>
              <span className="text-[12px]" style={{ color: "var(--spyne-text-secondary)" }}>{label}</span>
            </div>
            <span className="text-[20px] font-bold" style={{ color: "var(--spyne-text-primary)" }}>{value.toLocaleString()}</span>
          </div>
        ))}
        <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--spyne-border)" }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.round(CHANNELS[0].value / (CHANNELS[0].value + CHANNELS[1].value) * 100)}%`, background: "var(--spyne-primary)" }}
          />
        </div>
        <p className="text-[11px]" style={{ color: "var(--spyne-text-muted)" }}>
          {Math.round(CHANNELS[0].value / (CHANNELS[0].value + CHANNELS[1].value) * 100)}% of leads via Phone
        </p>
      </div>
    </div>
  )
}

function AlertsPanel() {
  return (
    <div className="spyne-card p-4">
      <div className={cn(spyneComponentClasses.cardTitle, "mb-3")}>Alerts</div>
      <div className="flex flex-col gap-2">
        {ALERTS.map(({ id, icon, iconColor, label, sub }) => (
          <div key={id} className="flex items-start gap-2.5 rounded-lg p-2" style={{ background: "var(--spyne-page)" }}>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: `${iconColor}18` }}>
              <MaterialSymbol name={icon} size={14} style={{ color: iconColor }} />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold" style={{ color: "var(--spyne-text-primary)" }}>{label}</p>
              <p className="text-[11px]" style={{ color: "var(--spyne-text-muted)" }}>{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ActivityFeedPanel() {
  return (
    <div className="spyne-card flex flex-col p-4">
      <div className={cn(spyneComponentClasses.cardTitle, "mb-3")}>Activity Feed</div>
      <div className="flex flex-col gap-1 overflow-y-auto">
        {ACTIVITY_FEED.map(({ time, label, count, name }, i) => (
          <div key={i} className="flex items-start gap-2 py-1.5 border-b border-spyne-border last:border-0">
            <span className="mt-0.5 shrink-0 text-[10px]" style={{ color: "var(--spyne-text-muted)", minWidth: 48 }}>{time}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium" style={{ color: "var(--spyne-text-primary)" }}>
                {label}{count != null ? ` (${count})` : ""}
              </p>
              <p className="text-[11px]" style={{ color: "var(--spyne-text-muted)" }}>{name}</p>
            </div>
            <MaterialSymbol name="chevron_right" size={14} style={{ color: "var(--spyne-text-muted)" }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────

export function SalesOverviewPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [activeAgent, setActiveAgent] = useState<"inbound" | "outbound">("inbound")
  const [dateRange, setDateRange] = useState("Last 30 days")

  const isOutbound = activeAgent === "outbound"
  const overview = isOutbound ? getOutboundOverviewData(dateRange) : getOverviewData(dateRange)

  const KPI_LABELS = isOutbound
    ? ["Revenue Influenced", "Appointments Booked", "Response Rate", "Re-engagements"]
    : ["Revenue Influenced", "Appointments Booked", "Leads Qualified", "After Hours Leads Engaged"]

  const heroMetrics = KPI_LABELS
    .map((l) => overview.metricsBar.find((m: any) => m.label === l))
    .filter(Boolean) as typeof overview.metricsBar

  const agentData = isOutbound ? salesOutboundAgentData : salesAgentData

  return (
    <div className={spyneSalesLayout.pageStack}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className={cn("sticky z-[30] -mx-max2-page bg-spyne-page px-max2-page pt-6 pb-3 -mt-6", "top-[6rem] lg:top-10")}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className={max2Classes.pageTitle}>Welcome back, {dealerData.userName}!</h1>
            <p className={max2Classes.pageDescription}>Here's what's moving across your sales agents today.</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <SpyneSegmentedControl aria-label="Active agent">
              {(["inbound", "outbound"] as const).map((id) => {
                const data = id === "inbound" ? salesAgentData : salesOutboundAgentData
                return (
                  <SpyneSegmentedButton key={id} active={activeAgent === id} onClick={() => setActiveAgent(id)}>
                    <SpyneSegmentedStatusDot live={data.status === "online"} />
                    {data.name} · {id.charAt(0).toUpperCase() + id.slice(1)}
                  </SpyneSegmentedButton>
                )
              })}
            </SpyneSegmentedControl>
            <SpyneFilterSelectWrap>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className={cn(spyneComponentClasses.filterSelect, "min-w-[9rem] cursor-pointer")}
                aria-label="Date range"
              >
                {dateRangeOptions.map((o: string) => <option key={o} value={o}>{o}</option>)}
              </select>
              <SpyneFilterSelectChevron />
            </SpyneFilterSelectWrap>
          </div>
        </div>
      </div>

      {/* ── Agent banner ─────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-xl p-4 text-white"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #4600F2 100%)" }}
      >
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #22d3ee 0%, transparent 70%)" }}
        />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <MaterialSymbol name="smart_toy" size={20} style={{ color: "#c7d2fe" }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold">VINI Sales Agent</span>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">Live</span>
              </div>
              <p className="text-[11.5px] text-white/70">
                {agentData.name} is handling your {isOutbound ? "outbound campaigns" : "inbound leads"} — {isOutbound ? "4 campaigns active" : "23 leads in follow-up"} right now.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => onNavigate?.(isOutbound ? "campaigns" : "action-items")}
              className="rounded-lg bg-white/15 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-white/25"
            >
              {isOutbound ? "View Campaigns" : "View Queue"}
            </button>
            <button
              onClick={() => onNavigate?.("appointments")}
              className="rounded-lg bg-white px-3 py-1.5 text-[12px] font-semibold transition-colors hover:bg-white/90"
              style={{ color: "#4600F2" }}
            >
              Appointments
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI strip ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {heroMetrics.map((m: any) => (
          <KpiCard key={m.label} label={m.label} value={m.value} delta={m.delta} deltaDir={m.deltaDir} note={m.note} />
        ))}
      </div>

      {/* ── Details: main + right sidebar ────────────────────────────────── */}
      <div className="flex gap-4">

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <CallDistributionChart data={overview.activityChart} />
          <FeaturedCalls />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <CallTypesPanel />
            <DropOffPanel />
            <ChannelPanel />
          </div>
        </div>

        {/* Right sidebar */}
        <div className="flex w-64 shrink-0 flex-col gap-4 xl:w-72">
          <AlertsPanel />
          <ActivityFeedPanel />
        </div>
      </div>
    </div>
  )
}
