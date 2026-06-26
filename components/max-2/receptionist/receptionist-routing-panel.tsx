"use client"

import { spyneComponentClasses } from "@/lib/design-system/max-2"
import { cn } from "@/lib/utils"

type Tone = "primary" | "success" | "warning" | "info" | "neutral"

const TONE_COLOR: Record<Tone, string> = {
  primary: "var(--spyne-brand)",
  success: "var(--spyne-success)",
  warning: "var(--spyne-warning, var(--spyne-warning-ink))",
  info:    "var(--spyne-info)",
  neutral: "var(--spyne-text-muted)",
}

export function ReceptionistRoutingPanel({
  rateLabel,
  rateCaption,
  deltaLabel,
  segments,
  className,
}: {
  rateLabel: string
  rateCaption: string
  deltaLabel: string
  segments: { label: string; value: number; tone: Tone }[]
  className?: string
}) {
  const total = segments.reduce((acc, s) => acc + s.value, 0) || 1
  const topSegment = [...segments].sort((a, b) => b.value - a.value)[0]

  // Geometry — single donut, computed once.
  const size = 168
  const stroke = 22
  const r = (size - stroke) / 2
  const C = 2 * Math.PI * r
  const cx = size / 2
  const cy = size / 2

  // Compute each segment's stroke-dasharray + offset so we can render in one SVG.
  let cursor = 0
  const arcs = segments.map((s) => {
    const portion = s.value / total
    const dash = portion * C
    const arc = {
      label: s.label,
      tone: s.tone,
      value: s.value,
      portion,
      strokeDasharray: `${dash} ${C - dash}`,
      strokeDashoffset: -cursor,
    }
    cursor += dash
    return arc
  })

  return (
    <div className={cn("spyne-card flex h-full min-h-0 flex-col gap-4 p-4", className)}>
      <div className="flex items-center justify-between gap-1.5">
        <h3 className={cn(spyneComponentClasses.cardTitle, "m-0")}>Where calls went</h3>
        <span className="text-[11px] font-semibold text-spyne-text-muted tabular-nums">{total} calls</span>
      </div>

      <div className="flex items-center gap-5">
        {/* Donut chart */}
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Call routing breakdown">
            {/* Track */}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--spyne-page)" strokeWidth={stroke} />
            {/* Segments — rotated so the first segment starts at 12 o'clock */}
            <g transform={`rotate(-90 ${cx} ${cy})`}>
              {arcs.map((a) => (
                <circle
                  key={a.label}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={TONE_COLOR[a.tone]}
                  strokeWidth={stroke}
                  strokeDasharray={a.strokeDasharray}
                  strokeDashoffset={a.strokeDashoffset}
                  strokeLinecap="butt"
                >
                  <title>{`${a.label} · ${a.value} (${Math.round(a.portion * 100)}%)`}</title>
                </circle>
              ))}
            </g>
          </svg>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[28px] font-bold leading-none tabular-nums text-spyne-text-primary">{total}</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-spyne-text-muted mt-1">calls</span>
            {topSegment && (
              <span className="text-[10px] text-spyne-text-muted mt-1.5">
                top: <span className="font-semibold text-spyne-text-primary">{topSegment.label.split(" ")[0]}</span>
              </span>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          {segments.map((s) => {
            const pct = total ? Math.round((s.value / total) * 100) : 0
            return (
              <div key={s.label} className="flex items-center gap-2.5 text-[12.5px] py-0.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: TONE_COLOR[s.tone] }} />
                <span className="flex-1 min-w-0 truncate text-spyne-text-primary font-medium">{s.label}</span>
                <span className="tabular-nums font-bold text-spyne-text-primary">{s.value}</span>
                <span className="tabular-nums text-[11px] text-spyne-text-muted w-9 text-right">{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="border-t border-spyne-border pt-3 -mx-1 px-1 text-[11px] text-spyne-text-muted">
        <span className="font-semibold text-spyne-text-secondary">{rateLabel}</span>
        {rateCaption && <span> · {rateCaption}</span>}
        {deltaLabel && <span> · {deltaLabel}</span>}
      </div>
    </div>
  )
}
