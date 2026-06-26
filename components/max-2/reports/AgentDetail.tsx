"use client";

import { useMemo, useState } from "react";
import {
  ActiveCampaign,
  AGENTS,
  AgentData,
  agentById,
  Bucket,
  FollowUp,
  BUCKET_LABELS,
  Card,
  ComingSoon,
  EmptyState,
  DateFilter,
  DeltaPill,
  fmtInt,
  fmtMoneyFull,
  HOUR_LABELS,
  DayTrend,
  QueryBars,
  RAG_STYLE,
  Sankey,
  SectionLabel,
  SplitBar,
  Td,
  Th,
  TrendBars,
} from "./kit";
import { valueForAgent, apptValueForId } from "./liveData";

/* ────────────────────────────────────────────────────────────────────────────
 * Per-agent detailed report, ported from reporting-vini's /reports/agents page and
 * rewired onto the static mock fleet (no backend). The original branched across
 * first-time / onboarding / coming-soon / upsell / live states driven by a scenario
 * context + live fetch; here every rooftop is the live "repeat" scenario, so we keep
 * only the live report body. Backend-only surfaces (upcoming appointments, the
 * appointment drill-down modal, ClickHouse highlights/missed, transfer quality) fall
 * back to their empty / coming-soon states.
 * ──────────────────────────────────────────────────────────────────────────── */

const OUTCOME_COLORS = ["#6366f1", "#813fed", "#10b981", "#f59e0b", "#0ea5e9", "#94a3b8", "#ef4444", "#14b8a6"];

export function AgentDetail({
  agentId,
  department,
  onBack,
}: {
  agentId: string;
  department?: "sales" | "service";
  onBack: () => void;
}) {
  const [bucket, setBucket] = useState<Bucket>("last30");
  const [custom, setCustom] = useState<{ start: string; end: string } | null>(null);
  const [activeId, setActiveId] = useState<string>(agentId);
  const [showDetail, setShowDetail] = useState<boolean>(true);

  const visibleAgents = useMemo<AgentData[]>(() => {
    if (!department) return AGENTS;
    const want = department === "sales" ? "Sales" : "Service";
    return AGENTS.filter((a) => a.dept === want);
  }, [department]);

  const a = useMemo(() => agentById(activeId, visibleAgents), [activeId, visibleAgents]);
  const m = a.metrics;
  const r = a.report;
  const inbound = a.dir === "Inbound";
  const hasStory = !!(r.benchmarks && r.compare);

  // Mock = always the live "repeat" scenario: no window re-scaling, full report.
  const scale = (n: number) => Math.round(n);
  const showDollarValue = m.appointments > 0;
  const periodLabel = custom ? `${custom.start} – ${custom.end}` : BUCKET_LABELS[bucket];
  const turnRate = r.qualifiedPct;

  const sankey = useMemo(() => {
    const total = scale(a.leadFunnel?.contacted ?? r.leadsAttempted);
    const connected = Math.min(total, scale(a.leadFunnel?.connected ?? m.conversations));
    const noConvo = Math.max(0, total - connected);
    const qualified = Math.min(connected, scale(a.leadFunnel?.qualified ?? m.qualified));
    const notQualified = Math.max(0, connected - qualified);
    const booked = Math.min(qualified, scale(a.leadFunnel?.appt ?? m.appointments));
    const nurture = Math.max(0, qualified - booked);
    const columns = [
      [{ id: "total", label: inbound ? "Leads attempted" : "Leads dialed", color: "#813fed" }],
      [
        { id: "connected", label: "Connected", color: "#6366f1" },
        { id: "missed", label: "No conversation", color: "#dc2626" },
      ],
      [
        { id: "qualified", label: "Qualified", color: "#10b981" },
        { id: "notq", label: "Not qualified", color: "#9ca3af" },
      ],
      [
        { id: "booked", label: "Booked", color: "#10b981" },
        { id: "nurture", label: "Nurture", color: "#f59e0b" },
        { id: "lost", label: "Lost / no intent", color: "#9ca3af" },
      ],
    ];
    const links = [
      { from: "total", to: "connected", value: connected },
      { from: "total", to: "missed", value: noConvo },
      { from: "connected", to: "qualified", value: qualified },
      { from: "connected", to: "notq", value: notQualified },
      { from: "qualified", to: "booked", value: booked },
      { from: "qualified", to: "nurture", value: nurture },
      { from: "notq", to: "lost", value: notQualified },
    ];
    return { columns, links };
  }, [a, inbound]);

  return (
    <div className="flex flex-col gap-6 pb-16">
      {/* top bar — back + identity + date filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-3 text-[12px] font-semibold text-[#6b7280] transition-colors hover:bg-[#faf8ff] hover:text-[#813fed]"
          >
            ← Back to report
          </button>
          <div>
            <h1 className="text-[20px] font-extrabold tracking-[-0.02em] text-[#111]">Agent performance</h1>
            <p className="mt-0.5 text-[12px] text-[#6b7280]">ROI, pipeline and quality by agent.</p>
          </div>
        </div>
        <DateFilter
          bucket={bucket}
          custom={custom}
          onPreset={(b) => {
            setBucket(b);
            setCustom(null);
          }}
          onCustom={(rng) => setCustom(rng)}
        />
      </div>

      {/* agent switcher */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {visibleAgents.map((ag) => {
          const selected = ag.id === activeId;
          return (
            <button
              key={ag.id}
              onClick={() => setActiveId(ag.id)}
              className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                selected
                  ? "border-[#813fed] bg-[#faf8ff] shadow-[0_0_0_3px_rgba(129,63,237,0.12)]"
                  : "border-[#e5e7eb] bg-white hover:border-[#c4b5fd] hover:bg-[#faf8ff]"
              }`}
            >
              <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-lg text-[18px] leading-none ${selected ? "bg-white shadow-sm" : "bg-[#f6f1ff]"}`}>
                {ag.icon}
              </span>
              <span className="flex flex-col">
                <span className={`text-[13px] font-bold leading-tight ${selected ? "text-[#111]" : "text-[#374151]"}`}>{ag.name}</span>
                <span className="mt-0.5 text-[11px] leading-none text-[#6b7280]">
                  <b className="tabular-nums text-[#111]">{fmtInt(ag.report.leadsAttempted)}</b> leads attempted
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* ── value created ── */}
      {hasStory && (
        <>
          <section className="rounded-3xl border border-[#cdeede] bg-gradient-to-r from-[#f0fdf6] to-white shadow-sm px-7 py-6">
            {showDollarValue ? (
              <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-4">
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#059669]">
                    Value created · {periodLabel}
                  </p>
                  <p className="mt-1 text-[42px] font-extrabold tabular-nums leading-none text-[#059669]">
                    {fmtMoneyFull(valueForAgent(a.id, scale(m.appointments)))}
                  </p>
                  <p className="mt-2 text-[12px] text-[#6b7280]">
                    <b className="text-[#111]">{fmtInt(scale(m.appointments))} appointments</b> ×{" "}
                    <b className="text-[#111]">{fmtMoneyFull(apptValueForId(a.id))}</b> per appointment
                  </p>
                </div>
                <div className="rounded-2xl border border-[#cdeede] bg-white/70 px-5 py-3.5 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">Value / appointment</p>
                  <p className="mt-0.5 text-[22px] font-extrabold tabular-nums text-[#111]">{fmtMoneyFull(apptValueForId(a.id))}</p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#059669]">
                  Appointments booked · {periodLabel}
                </p>
                <p className="mt-1 text-[42px] font-extrabold tabular-nums leading-none text-[#059669]">{fmtInt(scale(m.appointments))}</p>
                <p className="mt-2 max-w-[520px] text-[12px] text-[#6b7280]">
                  From <b className="text-[#111]">{fmtInt(scale(a.leadFunnel?.connected ?? m.conversations))}</b> conversations ·{" "}
                  <b className="text-[#111]">{fmtInt(scale(a.leadFunnel?.qualified ?? m.qualified))}</b> qualified.
                </p>
              </div>
            )}
          </section>

          <button
            onClick={() => setShowDetail((s) => !s)}
            className="mx-auto mt-1 rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-[12px] font-semibold text-[#6b7280] hover:bg-[#faf8ff] hover:text-[#813fed] transition-colors"
          >
            {showDetail ? "Hide detailed metrics ▴" : "Show detailed metrics ▾"}
          </button>
        </>
      )}

      {(!hasStory || showDetail) && (
        <>
          <SectionLabel hint={periodLabel}>Performance</SectionLabel>

          <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0f0f0] bg-gradient-to-r from-[#faf8ff] to-white px-6 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-white text-[17px] leading-none shadow-sm">{a.icon}</span>
                <div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-[14px] font-bold leading-tight text-[#111]">{r.summary.person}</p>
                    <span className="text-[12px] font-medium text-[#9ca3af]">{a.name}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-tight text-[#9ca3af]">Lead → appointment funnel · {periodLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl bg-white px-4 py-2 shadow-sm ring-1 ring-[#ece6fb]">
                <div className="text-right leading-tight">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[#9ca3af]">Booking rate</p>
                  <DeltaPill delta={r.deltas.abr} />
                </div>
                <p className="text-[28px] font-extrabold tabular-nums leading-none text-[#813fed]">{r.abr}%</p>
              </div>
            </div>

            <div className="px-6 py-6">
              <PerfFunnel
                stages={[
                  { label: inbound ? "Leads attempted" : "Leads dialed", value: scale(r.leadsAttempted), delta: r.deltas.leadsAttempted },
                  { label: "Conversations", value: scale(a.leadFunnel?.connected ?? m.conversations) },
                  { label: "Leads qualified", value: scale(a.leadFunnel?.qualified ?? m.qualified), delta: r.deltas.leadsQualified },
                  { label: "Appointments booked", value: scale(m.appointments), delta: r.deltas.appointments },
                ]}
              />
            </div>

            <div className="grid grid-cols-3 divide-x divide-[#f3f4f6] border-t border-[#f0f0f0] bg-[#fcfcfd]">
              <ActivityStat label={inbound ? "Total calls" : "Calls dispatched"} value={fmtInt(scale(m.calls))} hint={`${fmtInt(scale(m.talkMinutes))} mins talk`} delta={r.deltas.totalCalls} />
              <ActivityStat label="Total SMS" value={fmtInt(scale(m.smsSent))} delta={r.deltas.totalSms} />
              <ActivityStat label="Turn rate" value={`${turnRate}%`} hint="qualified / connected" />
            </div>

            <div className="border-t border-[#f0f0f0] px-6 py-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">Call breakdown</p>
              <div className={`grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 ${inbound ? "lg:grid-cols-6" : "lg:grid-cols-4"}`}>
                {[
                  { label: "During hours", value: Math.max(0, m.calls - m.afterHours) },
                  { label: "After hours", value: m.afterHours },
                  { label: "Connected", value: a.leadFunnel?.connected ?? m.conversations },
                  { label: "Qualified", value: a.leadFunnel?.qualified ?? m.qualified },
                  ...(inbound
                    ? [
                        { label: "Transferred", value: r.callFlow.transferred },
                        { label: "Callbacks", value: r.callFlow.callbacks ?? 0 },
                      ]
                    : []),
                ].map((b) => (
                  <div key={b.label} className="flex flex-col">
                    <span className="text-[18px] font-bold tabular-nums leading-none text-[#111]">{fmtInt(scale(b.value))}</span>
                    <span className="mt-1 text-[11px] text-[#6b7280]">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Card title="Day-on-day" sub="Touched → Qualified → Appointments, per day">
            <DayTrend points={r.dayOnDay} />
          </Card>

          <SectionLabel hint={`${r.qualifiedPct}% qualified`}>Conversations &amp; outcomes</SectionLabel>

          <Card title="Lead journey" sub="How unique leads move: reached → connected → qualified → booked. Ribbon width = leads.">
            <Sankey columns={sankey.columns} links={sankey.links} height={300} fmt={(n) => fmtInt(n)} />
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="Query resolution rate" sub="Share of each topic the agent resolved without a human">
              {r.queries.length ? (
                <QueryBars topics={r.queries} />
              ) : (
                <ComingSoon title="Resolution by topic" note="How often the agent resolves each topic without a human — appears once there's tagged conversation activity in the window." />
              )}
            </Card>
            <Card title="Top objections" sub="What the agent heard most">
              <ComingSoon title="Objections, ranked by how often they come up" note="The concerns customers raise most on calls — price, timing, trade-in value — so your team can prepare for them and sharpen its talk tracks." />
            </Card>
          </div>

          <SectionLabel>{inbound ? "Inbound operations" : "Outbound campaigns"}</SectionLabel>

          {inbound && r.leadsBySource && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className={a.id === "sales_ib" ? "lg:col-span-2" : "lg:col-span-3"}>
                <Card title="Leads by source" sub={`${periodLabel} · interacted → total → booked`} pad={false}>
                  <table className="w-full">
                    <thead className="bg-[#fafafa]">
                      <tr>
                        <Th align="left">Source</Th>
                        <Th align="right">Interacted</Th>
                        <Th align="right">Total leads</Th>
                        <Th align="right">Appts booked</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.leadsBySource.map((s) => (
                        <tr key={s.source} className="border-t border-[#f0f0f0] hover:bg-[#faf8ff] transition-colors">
                          <Td align="left"><span className="text-[12.5px] font-semibold text-[#111]">{s.source}</span></Td>
                          <Td align="right"><span className="text-[12.5px] tabular-nums text-[#374151]">{fmtInt(scale(s.interacted))}</span></Td>
                          <Td align="right"><span className="text-[12.5px] tabular-nums font-semibold text-[#111]">{fmtInt(scale(s.total))}</span></Td>
                          <Td align="right"><span className="text-[12.5px] tabular-nums font-semibold text-[#10b981]">{fmtInt(scale(s.appts))}</span></Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </div>
              {(a.id === "sales_ib" || a.id === "service_ib") && (
                <Card title="Speed to lead" sub="How fast new CRM leads get a first touch">
                  {a.id === "service_ib" ? (
                    <EmptyState icon="⏱️" title="Coming soon" body="Speed-to-lead tracking isn't live for the service inbound agent yet — it'll appear here once enabled." />
                  ) : r.speedToLead && r.speedToLead.medianUnderMin ? (
                    <div className="flex flex-col gap-4">
                      <div>
                        <p className="text-[30px] font-extrabold tabular-nums text-[#813fed] leading-none">{r.speedToLead.avg}</p>
                        <p className="text-[11.5px] text-[#6b7280] mt-1">{r.speedToLead.pctWithin5}% of new leads contacted within 5 min</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <SummaryStat label="Leads touched instantly" value={fmtInt(scale(r.speedToLead.instantlyTouched))} accent="#10b981" />
                        <SummaryStat label="After-hours touched instantly" value={fmtInt(scale(r.speedToLead.afterHoursInstant))} />
                        <SummaryStat label="Appointments booked" value={fmtInt(scale(r.speedToLead.instantAppts))} accent="#813fed" />
                        <SummaryStat label="Instant → appointment" value={`${r.speedToLead.instantApptRate}%`} />
                      </div>
                      <StlOpenFunnel data={r.speedToLead.openFunnel} />
                    </div>
                  ) : (
                    <EmptyState icon="⏱️" title="Coming soon" body="Speed-to-lead tracking appears here once it's enabled for this agent." />
                  )}
                </Card>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="Upcoming appointments" sub="Every booking the agent set, with customer and vehicle" pad={false}>
              <div className="p-6">
                <EmptyState icon="📅" title="Coming soon" body="Upcoming appointments stream in from the live booking feed once it's connected." />
              </div>
            </Card>
            <Card title="Priority follow-ups" sub="Callbacks the agent flagged" pad={false}>
              {r.followUps?.length ? (
                <CallbacksList items={r.followUps} />
              ) : (
                <EmptyState icon="📞" title="No callbacks flagged" body="No follow-ups flagged for this rooftop right now — they'll appear here when the agent flags one." />
              )}
            </Card>
          </div>

          {!inbound && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Card title="Active campaigns" sub="What this agent is working on right now" pad={false}>
                  {r.activeCampaigns?.length ? (
                    <CampaignsTable items={r.activeCampaigns} />
                  ) : (
                    <EmptyState icon="📣" title="No active campaigns" body="This rooftop isn't running any outbound campaigns yet." />
                  )}
                </Card>
              </div>
              <Card title="Outbound outcomes" sub="How outbound conversations ended">
                {r.outcomes?.length ? (
                  <SplitBar segments={r.outcomes.map((o, i) => ({ label: o.label, value: o.value, color: OUTCOME_COLORS[i % OUTCOME_COLORS.length] }))} />
                ) : (
                  <EmptyState icon="📊" title="No outbound activity yet" body="The outbound outcome breakdown appears once this rooftop starts outbound calling." />
                )}
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="Multi-day reply effectiveness" sub="When replies land, relative to the first touch">
              {r.multiDayReply.length ? (
                <>
                  <TrendBars values={r.multiDayReply.map((d) => d.pct)} labels={r.multiDayReply.map((d) => d.day)} height={96} />
                  <p className="mt-3 text-[11px] text-[#6b7280]">{r.multiDayReply[0].pct}% of replies arrive the same day — the rest justify the multi-day cadence.</p>
                </>
              ) : (
                <ComingSoon title="Reply timing" note="When replies land relative to the first touch — appears once this agent has SMS reply activity in the window." />
              )}
            </Card>
            <Card title="Channel mix" sub="Share of contacts by channel">
              <SplitBar
                segments={[
                  { label: "Voice", value: a.channelSplit.voice, color: "#6366f1" },
                  { label: "SMS", value: a.channelSplit.sms, color: "#10b981" },
                ]}
              />
              <p className="mt-4 text-[11.5px] text-[#6b7280]">
                SMS sent: <b className="text-[#111]">{fmtInt(scale(m.smsSent))}</b> · talk time:{" "}
                <b className="text-[#111]">{fmtInt(m.talkMinutes / 60)}h</b>
                {m.afterHours > 0 && (
                  <>
                    {" "}· after-hours captured: <b className="text-[#111]">{fmtInt(scale(m.afterHours))}</b>
                  </>
                )}
              </p>
            </Card>
          </div>

          <SectionLabel>Quality &amp; trend</SectionLabel>

          <Card title="Conversation quality" sub="From live calls — the metrics we can measure today">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <QCell label={a.quality.primaryLabel} value={`${a.quality.primary}%`} />
              <QCell label="Avg handle time" value={a.quality.handleTime} />
              <QCell label="Opt-outs" value={fmtInt(scale(m.optOuts))} />
              <ComingSoon title="CSAT" inline />
              <ComingSoon title="Positive sentiment" inline />
              <ComingSoon title={a.quality.fourthLabel} inline />
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="Time-of-day distribution" sub="When the activity happens (business hours)">
              <TrendBars values={a.hourly} labels={HOUR_LABELS} height={88} />
            </Card>
            <Card title="7-day trend" sub={a.headlineLabel}>
              <TrendBars values={a.trend7} labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]} highlightLast height={88} />
            </Card>
          </div>

          <Card title="Highlights & missed opportunities" sub="Standout moments worth a closer look" pad={false}>
            <div className="px-6 py-5">
              <ComingSoon title="Your wins — and the ones that got away" note="The best moments the agent caught, plus the deals worth a second look, gathered in one place so you can act on them quickly." />
            </div>
          </Card>

          {inbound && (
            <Card title={a.activityTitle} sub={periodLabel} pad={false}>
              <div className="px-6 py-5">
                <ComingSoon title="Why customers are calling" note="A breakdown of call reasons — and how often each one turns into a booking — so you can staff and script for what matters most." />
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

/* ── helpers (ported) ── */
function PerfFunnel({ stages }: { stages: { label: string; value: number; delta?: number }[] }) {
  const max = Math.max(1, stages[0]?.value ?? 1);
  return (
    <div className="flex flex-col gap-2.5">
      {stages.map((s, i) => {
        const pct = Math.max(2, (s.value / max) * 100);
        const prev = i > 0 ? stages[i - 1].value : null;
        const conv = prev && prev > 0 ? Math.round((s.value / prev) * 100) : null;
        const isLast = i === stages.length - 1;
        return (
          <div key={s.label} className="flex items-center gap-3 sm:gap-4">
            <div className="w-[120px] flex-none sm:w-[150px]">
              <p className={`text-[24px] font-extrabold tabular-nums leading-none sm:text-[26px] ${isLast ? "text-[#10b981]" : "text-[#111]"}`}>
                {fmtInt(s.value)}
              </p>
              <p className="mt-1 text-[11px] leading-tight text-[#6b7280]">{s.label}</p>
            </div>
            <div className="w-[40px] flex-none text-right sm:w-[46px]">
              {conv !== null && (
                <span className="rounded-full bg-[#f3eaff] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[#813fed]" title="conversion from the previous step">
                  {conv}%
                </span>
              )}
            </div>
            <div className="flex flex-1 items-center">
              <div
                className="h-8 rounded-lg transition-all"
                style={{
                  width: `${pct}%`,
                  minWidth: 10,
                  background: isLast ? "linear-gradient(90deg,#10b981,#059669)" : "linear-gradient(90deg,#813fed,#6366f1)",
                  opacity: 1 - i * 0.06,
                }}
              />
            </div>
            <div className="w-[92px] flex-none text-right sm:w-[104px]">{s.delta !== undefined && <DeltaPill delta={s.delta} />}</div>
          </div>
        );
      })}
    </div>
  );
}

function ActivityStat({ label, value, hint, delta }: { label: string; value: string; hint?: string; delta?: number }) {
  return (
    <div className="px-6 py-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">{label}</p>
      <p className="mt-1 text-[20px] font-bold tabular-nums leading-none text-[#111]">{value}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
        {delta !== undefined && <DeltaPill delta={delta} />}
        {hint && <span className="text-[10.5px] text-[#6b7280]">{hint}</span>}
      </div>
    </div>
  );
}

function SummaryStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-[#f0f0f0] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">{label}</p>
      <p className="mt-0.5 text-[16px] font-bold tabular-nums" style={{ color: accent ?? "#111" }}>{value}</p>
    </div>
  );
}

function StlOpenFunnel({ data }: { data?: { stlLeadsHandled: number; stlAppts: number; stlRate: number; followupLeadsHandled: number; followupAppts: number; followupRate: number } }) {
  return (
    <div className="border-t border-[#f0f0f3] pt-4">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">
        Leads handled → appointments booked <span className="font-semibold normal-case text-[#c4c4cc]">· all-time</span>
      </p>
      {data ? (
        <div className="grid grid-cols-2 gap-3">
          <SummaryStat label="Via speed-to-lead" value={`${fmtInt(data.stlAppts)} / ${fmtInt(data.stlLeadsHandled)}`} accent="#813fed" />
          <SummaryStat label="Via follow-ups" value={`${fmtInt(data.followupAppts)} / ${fmtInt(data.followupLeadsHandled)}`} accent="#10b981" />
          <SummaryStat label="STL booked rate" value={`${data.stlRate}%`} />
          <SummaryStat label="Follow-up booked rate" value={`${data.followupRate}%`} />
        </div>
      ) : (
        <p className="text-[11.5px] text-[#9ca3af]">Coming soon — appointments split by speed-to-lead vs follow-up.</p>
      )}
    </div>
  );
}

function QCell({ label, value, status }: { label: string; value: string; status?: "green" | "amber" | "red" }) {
  return (
    <div className="rounded-xl border border-[#f0f0f0] px-4 py-3">
      <div className="flex items-center gap-1.5">
        {status && <span className="h-2 w-2 rounded-full" style={{ background: RAG_STYLE[status].dot }} />}
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9ca3af]">{label}</p>
      </div>
      <p className="mt-1 text-[18px] font-bold tabular-nums text-[#111]">{value}</p>
    </div>
  );
}

function CallbacksList({ items }: { items: FollowUp[] }) {
  return (
    <div className="max-h-[320px] divide-y divide-[#f3f4f6] overflow-y-auto">
      {items.map((f, i) => (
        <div key={i} className="flex items-center justify-between gap-3 px-6 py-3">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-[#111]">{f.customer || "—"}</p>
            <p className="truncate text-[11px] text-[#6b7280]">{f.intent}</p>
          </div>
          <div className="flex-none text-right">
            <PriorityPill priority={f.priority} />
            <p className="mt-0.5 text-[10.5px] text-[#9ca3af]">{f.due}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function PriorityPill({ priority }: { priority: string }) {
  const v = (priority || "").toUpperCase();
  const c = v.startsWith("H") ? { bg: "#fee2e2", fg: "#991b1b" } : v.startsWith("M") ? { bg: "#fef3c7", fg: "#92400e" } : { bg: "#f3f4f6", fg: "#6b7280" };
  return <span className="rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide" style={{ background: c.bg, color: c.fg }}>{priority || "—"}</span>;
}

function CampaignsTable({ items }: { items: ActiveCampaign[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-[#f0f0f0]">
          <tr>
            <Th>Campaign</Th>
            <Th align="right">Enrolled</Th>
            <Th align="right">Appts</Th>
            <Th align="right">Appt rate</Th>
            <Th align="right">Warm</Th>
            <Th align="right">Opt-outs</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((c, i) => (
            <tr key={i} className="border-b border-[#f7f7f9] last:border-0">
              <Td>
                <p className="text-[12.5px] font-semibold text-[#111]">{c.name}</p>
                <p className="text-[10.5px] text-[#9ca3af]">{c.useCase}</p>
              </Td>
              <Td align="right"><span className="text-[12.5px] tabular-nums text-[#111]">{fmtInt(c.enrolled)}</span></Td>
              <Td align="right"><span className="text-[12.5px] tabular-nums text-[#111]">{fmtInt(c.appts)}</span></Td>
              <Td align="right"><span className="text-[12.5px] font-semibold tabular-nums text-[#10b981]">{c.apptRate}%</span></Td>
              <Td align="right"><span className="text-[12.5px] tabular-nums text-[#6b7280]">{fmtInt(c.warmLeads)}</span></Td>
              <Td align="right"><span className="text-[12.5px] tabular-nums text-[#6b7280]">{fmtInt(c.optOuts)}</span></Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
