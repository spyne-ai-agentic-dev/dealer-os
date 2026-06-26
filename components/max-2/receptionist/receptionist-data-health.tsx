"use client"

import { MaterialSymbol } from "@/components/max-2/material-symbol"
import { max2Classes, spyneComponentClasses, spyneSalesLayout } from "@/lib/design-system/max-2"
import { SectionLabel } from "@/components/max-2/sales/console-v2/shared"
import { cn } from "@/lib/utils"
import {
  dataHealthIssues as ACTIVE_ISSUES,
  routingTargetsHealth as ROUTING_TARGETS,
  dataHealthRecentEvents as RECENT_EVENTS,
  dataHealthStats,
  type HealthSeverity,
  type RoutingTargetHealth,
} from "./receptionist-data"

type Severity = HealthSeverity
type Target = RoutingTargetHealth

export function ReceptionistDataHealth() {
  const errCount  = ACTIVE_ISSUES.filter((i) => i.severity === "err").length
  const warnCount = ACTIVE_ISSUES.filter((i) => i.severity === "warn").length
  const totalIssues = errCount + warnCount

  const reachableTargets = ROUTING_TARGETS.filter((t) => t.status === "ok").length
  const totalTargets     = ROUTING_TARGETS.length

  // Group targets: problem ones first, then healthy
  const problemTargets  = ROUTING_TARGETS.filter((t) => t.status !== "ok")
  const healthyTargets  = ROUTING_TARGETS.filter((t) => t.status === "ok")

  return (
    <div className={spyneSalesLayout.pageStack}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className={max2Classes.pageTitle}>Data Health</h1>
          <p className={max2Classes.pageDescription}>
            Is Riley working right? What needs your attention? Where to go to fix it.
          </p>
        </div>
      </div>

      <HealthHero
        totalIssues={totalIssues}
        errCount={errCount}
        warnCount={warnCount}
        reachable={reachableTargets}
        totalTargets={totalTargets}
        callsToday={dataHealthStats.callsToday}
        uptime={dataHealthStats.uptime}
      />

      {/* Active issues */}
      <div className="flex flex-col gap-2.5">
        <SectionLabel glyph="report" text="What needs your attention" hint={`${totalIssues} ${totalIssues === 1 ? "active issue" : "active issues"}`} />
        {ACTIVE_ISSUES.length === 0 ? (
          <div className="spyne-card py-12 text-center">
            <MaterialSymbol name="check_circle" size={32} className="text-spyne-success mb-2" />
            <div className="text-[14px] font-semibold">All clear.</div>
            <div className="text-[12px] text-spyne-text-muted mt-1">No issues flagged on your config.</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {ACTIVE_ISSUES.map((i) => (
              <div
                key={i.id}
                className="spyne-card-interactive flex items-start gap-3 p-4"
                style={{ borderLeft: `3px solid ${i.severity === "err" ? "var(--spyne-error)" : "var(--spyne-warning-ink)"}` }}
              >
                <StatusDot status={i.severity} />
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold mb-0.5">{i.title}</div>
                  <p className="text-[13px] text-spyne-text-muted">{i.detail}</p>
                </div>
                <a href={i.action.href} className={cn(spyneComponentClasses.btnSecondaryMd, "shrink-0 flex items-center gap-1.5")}>
                  {i.action.label} <MaterialSymbol name="arrow_forward" size={12} />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Routing target health */}
      <div className="flex flex-col gap-2.5">
        <SectionLabel glyph="account_tree" text="Routing target health" hint={`${reachableTargets} of ${totalTargets} reachable`} />
        <div className="spyne-card overflow-hidden">
          {problemTargets.length > 0 && (
            <div className="border-b border-spyne-border bg-spyne-error-subtle/30 px-5 py-2 text-[10px] font-bold uppercase tracking-[0.06em] text-spyne-error">
              Needs attention
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-y divide-spyne-border">
            {problemTargets.map((t) => <TargetRow key={t.name} target={t} />)}
          </div>
          {problemTargets.length > 0 && (
            <div className="border-y border-spyne-border bg-spyne-surface-hover px-5 py-2 text-[10px] font-bold uppercase tracking-[0.06em] text-spyne-text-muted">
              Healthy
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-y divide-spyne-border">
            {healthyTargets.map((t) => <TargetRow key={t.name} target={t} />)}
          </div>
        </div>
      </div>

      {/* Recent events */}
      <div className="flex flex-col gap-2.5">
        <SectionLabel glyph="history" text="Recent events" hint="last 7 days" />
        <div className="spyne-card overflow-hidden">
          {RECENT_EVENTS.map((e) => (
            <div key={e.id} className="px-5 py-3 border-b border-spyne-border last:border-b-0 flex items-start gap-3">
              <StatusDot status={e.severity} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold">{e.title}</div>
                <div className="text-[12px] text-spyne-text-muted">{e.detail}</div>
              </div>
              <div className="text-[11px] text-spyne-text-subtle shrink-0">{e.when}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function HealthHero({ totalIssues, errCount, reachable, totalTargets, callsToday, uptime }: {
  totalIssues: number
  errCount: number
  warnCount: number
  reachable: number
  totalTargets: number
  callsToday: number
  uptime: string
}) {
  const breaching = errCount > 0
  const warning   = !breaching && totalIssues > 0
  const tone = breaching ? "err" : warning ? "warn" : "ok"

  const bg = tone === "err"  ? "var(--spyne-error-subtle)"  : tone === "warn" ? "var(--spyne-warning-subtle)" : "var(--spyne-success-subtle)"
  const fg = tone === "err"  ? "var(--spyne-error)"         : tone === "warn" ? "var(--spyne-warning-ink)"    : "var(--spyne-success)"
  const headline = tone === "err"
    ? `${errCount} issue${errCount === 1 ? "" : "s"} need${errCount === 1 ? "s" : ""} fixing`
    : tone === "warn"
      ? `${totalIssues} warning${totalIssues === 1 ? "" : "s"} to review`
      : "Riley is live and answering calls"
  const sub = tone === "ok"
    ? "Last call: 12 minutes ago · Live since June 1, 2026"
    : "Things Riley flagged that need attention."

  return (
    <div
      className="spyne-animate-fade-in flex flex-wrap items-center gap-x-6 gap-y-4 rounded-2xl px-5 py-4"
      style={{ background: bg, border: `1px solid ${fg}33` }}
    >
      <div className="flex items-center gap-4">
        <span
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl relative"
          style={{ background: bg, color: fg, boxShadow: `inset 0 0 0 1px ${fg}55` }}
        >
          <MaterialSymbol name={tone === "ok" ? "check_circle" : tone === "warn" ? "warning" : "report"} size={24} />
          {tone === "ok" && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-spyne-success border-2 border-white animate-pulse" />}
        </span>
        <div className="min-w-0">
          <p className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: "var(--spyne-text-muted)" }}>
            {tone === "ok" ? "All systems healthy" : "Health status"}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-[20px] font-bold leading-tight" style={{ color: fg }}>{headline}</span>
          </div>
          <p className="mt-0.5 text-[12px]" style={{ color: "var(--spyne-text-muted)" }}>{sub}</p>
        </div>
      </div>

      <div className="ml-auto flex items-stretch gap-5">
        <HeroStat n={totalIssues} label="Active issues" tone={totalIssues > 0 ? fg : "var(--spyne-text-primary)"} />
        <span className="w-px self-stretch" style={{ background: "var(--spyne-border)" }} />
        <HeroStat n={`${reachable}/${totalTargets}`} label="Targets reachable" tone={reachable === totalTargets ? "var(--spyne-success)" : "var(--spyne-warning-ink)"} />
        <span className="w-px self-stretch" style={{ background: "var(--spyne-border)" }} />
        <HeroStat n={callsToday} label="Calls today" tone="var(--spyne-text-primary)" />
        <span className="w-px self-stretch" style={{ background: "var(--spyne-border)" }} />
        <HeroStat n={uptime} label="Uptime 24h" tone="var(--spyne-success)" />
      </div>
    </div>
  )
}

function HeroStat({ n, label, tone }: { n: number | string; label: string; tone: string }) {
  return (
    <div className="flex flex-col justify-center">
      <span className="text-[22px] font-bold leading-none tabular-nums" style={{ color: tone }}>{n}</span>
      <span className="mt-1 text-[9.5px] font-bold uppercase tracking-wide" style={{ color: "var(--spyne-text-muted)" }}>{label}</span>
    </div>
  )
}

function TargetRow({ target }: { target: Target }) {
  const icon = target.type === "ai_agent" ? "smart_toy" : target.type === "extension" ? "call" : "voicemail"
  return (
    <div className="px-5 py-3 flex items-center gap-3">
      <StatusDot status={target.status} />
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-spyne-surface-hover text-spyne-text-muted shrink-0">
        <MaterialSymbol name={icon} size={14} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold">{target.name}</div>
        <div className="text-[11px] text-spyne-text-muted">{target.detail}</div>
      </div>
      {target.status === "err" && (
        <a href="/max-2/receptionist?tab=action-items" className="text-[11px] font-semibold text-spyne-brand hover:opacity-80 shrink-0">
          Open ticket →
        </a>
      )}
    </div>
  )
}

function StatusDot({ status }: { status: Severity }) {
  const bg = status === "err" ? "var(--spyne-error)" : status === "warn" ? "var(--spyne-warning-ink)" : "var(--spyne-success)"
  const icon = status === "err" ? "close" : status === "warn" ? "priority_high" : "check"
  return (
    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: bg }}>
      <MaterialSymbol name={icon} size={12} className="text-white" />
    </span>
  )
}
