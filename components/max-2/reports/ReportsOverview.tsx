"use client";

import { useMemo, useState } from "react";
import {
  Bucket,
  BUCKET_LABELS,
  Card,
  ComingSoon,
  DateFilter,
  fmtInt,
  fmtMoney,
  fmtMoneyFull,
  type ActiveCampaign,
  InlineBar,
  RAG_STYLE,
  SectionLabel,
  Sparkline,
  StepFunnel,
} from "./kit";
import { AGENTS, type AgentData } from "./data";
import { aggregateFleet, fleetValue, valueForAgent, blendedApptValue } from "./liveData";
import { AgentDetail } from "./AgentDetail";

/* ────────────────────────────────────────────────────────────────────────────
 * Overview reporting surface, ported from the standalone reporting-vini app and
 * rewired to run entirely on the static mock fleet in ./data (no backend). The
 * original page fetched a materialized Supabase aggregate; here we seed straight
 * from AGENTS so the report renders fully populated inside the dealer-os console.
 *
 * `department` scopes the fleet to one side of the house (the console's Sales and
 * Service tabs each show their own agents); omit it for the whole-dealership view.
 * ──────────────────────────────────────────────────────────────────────────── */

const EXPECTED_BOOK_RATE = 0.3;

const AGENT_COLOR: Record<string, string> = {
  sales_ib: "#6366f1",
  sales_ob: "#813fed",
  service_ib: "#10b981",
  service_ob: "#f59e0b",
};

export function ReportsOverview({ department }: { department?: "sales" | "service" }) {
  const [bucket, setBucket] = useState<Bucket>("last30");
  const [custom, setCustom] = useState<{ start: string; end: string } | null>(null);
  // When set, the overview hands off to the per-agent detailed report (the "who drove it"
  // leaderboard rows drill in). Back returns to the overview, same tab — no routing.
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const periodLabel = custom ? `${custom.start} – ${custom.end}` : BUCKET_LABELS[bucket];

  // Scope the mock fleet to the active department (Sales / Service tab) or show all.
  const agents = useMemo<AgentData[]>(() => {
    if (!department) return AGENTS;
    const want = department === "sales" ? "Sales" : "Service";
    return AGENTS.filter((a) => a.dept === want);
  }, [department]);

  const fleet = useMemo(() => aggregateFleet(agents, {}), [agents]);

  const valueCreated = fleetValue(agents);
  const apptValueBlended = blendedApptValue(agents);
  const showDollarValue = fleet.appointments > 0;

  const ranked = useMemo(
    () => [...agents].sort((a, b) => b.metrics.appointments - a.metrics.appointments),
    [agents],
  );
  const maxAppts = useMemo(() => Math.max(1, ...agents.map((a) => a.metrics.appointments)), [agents]);

  const campaigns = useMemo<ActiveCampaign[]>(() => {
    const all = agents.flatMap((a) => a.report.activeCampaigns ?? []);
    return [...all].sort((a, b) => b.appts - a.appts);
  }, [agents]);

  const money = useMemo(() => {
    const byBucket = new Map<string, { label: string; leads: number }>();
    for (const a of agents)
      for (const m of a.report.moneyOnTable ?? []) {
        const e = byBucket.get(m.bucket) ?? { label: m.label, leads: 0 };
        e.leads += m.leads;
        byBucket.set(m.bucket, e);
      }
    const buckets = [...byBucket.values()].sort((x, y) => y.leads - x.leads);
    return { total: buckets.reduce((s, b) => s + b.leads, 0), buckets };
  }, [agents]);

  const title = department === "sales" ? "Sales report" : department === "service" ? "Service report" : "Overview";

  if (selectedAgent) {
    return <AgentDetail agentId={selectedAgent} department={department} onBack={() => setSelectedAgent(null)} />;
  }

  return (
    <div className="flex flex-col gap-9 pb-16">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-[-0.02em] text-[#111]">{title}</h1>
          <p className="mt-0.5 text-[12.5px] text-[#6b7280]">
            Your control-tower report — every agent, call and appointment in one place.
          </p>
        </div>
        <DateFilter
          bucket={bucket}
          custom={custom}
          onPreset={(b) => {
            setBucket(b);
            setCustom(null);
          }}
          onCustom={(r) => setCustom(r)}
        />
      </div>

      {/* ─────────── 1 · Value created — the live headline ─────────── */}
      <section className="overflow-hidden rounded-[28px] border border-[#ddd0fb] bg-gradient-to-br from-[#1c1033] via-[#2a1656] to-[#3a1d6e] text-white shadow-[0_20px_60px_-24px_rgba(58,29,110,0.7)]">
        <div className="flex flex-col gap-7 px-9 pt-8 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            {showDollarValue ? (
              <>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#c4b5fd]">
                  Value created · {periodLabel}
                </p>
                <div className="mt-3 flex items-end gap-4">
                  <span className="text-[64px] font-black leading-[0.9] tracking-[-0.03em] text-white">
                    {fmtMoneyFull(valueCreated)}
                  </span>
                </div>
                <p className="mt-3 max-w-[560px] text-[14px] leading-snug text-[#d6cdf0]">
                  From <b className="text-white">{fmtInt(fleet.appointments)} appointments</b> booked across your live
                  agents, at <b className="text-white">{fmtMoneyFull(apptValueBlended)}</b> per appointment (blended).
                </p>
              </>
            ) : (
              <>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#c4b5fd]">
                  Appointments booked · {periodLabel}
                </p>
                <div className="mt-3 flex items-end gap-4">
                  <span className="text-[64px] font-black leading-[0.9] tracking-[-0.03em] text-white">
                    {fmtInt(fleet.appointments)}
                  </span>
                  <span className="pb-2.5 text-[15px] font-semibold text-[#c4b5fd]">booked this period</span>
                </div>
                <p className="mt-3 max-w-[560px] text-[14px] leading-snug text-[#d6cdf0]">
                  From <b className="text-white">{fmtInt(fleet.conversations)} conversations</b> across your live agents,
                  with <b className="text-white">{fmtInt(fleet.qualified)} qualified</b>.
                </p>
              </>
            )}
          </div>
          <DeltaBadge label="appointments vs prior" delta={fleet.deltas.appointments} />
        </div>
        <div className="grid grid-cols-2 divide-x divide-white/10 border-t border-white/10 bg-black/15 sm:grid-cols-4">
          <HeroTile label="Appointments" value={fmtInt(fleet.appointments)} delta={fleet.deltas.appointments} />
          <HeroTile label="Conversations" value={fmtInt(fleet.conversations)} delta={fleet.deltas.conversations} />
          <HeroTile label="Calls handled" value={fmtInt(fleet.calls)} delta={fleet.deltas.calls} />
          <HeroTile label="After-hours captured" value={fmtInt(fleet.afterHours)} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ComingSoon title="Attributed revenue $" inline />
        <ComingSoon title="Deals & ROs closed" inline />
        <ComingSoon title="Run cost & ROI" inline />
      </div>

      {/* ─────────── 2 · Who drove it — ranked by appointments ─────────── */}
      <div className="flex flex-col gap-3.5">
        <SectionLabel hint="click an agent for the full report">Who drove it</SectionLabel>
        <div className="flex flex-col gap-2.5">
          {ranked.map((a, i) => (
            <button
              key={a.id}
              onClick={() => setSelectedAgent(a.id)}
              className="group flex items-center gap-4 rounded-2xl border border-[#e9e9ee] bg-white px-5 py-4 text-left shadow-sm transition-all hover:border-[#c4b5fd] hover:shadow-md"
            >
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[#f3eaff] text-[12px] font-extrabold text-[#813fed]">
                {i + 1}
              </span>
              <span className="text-[22px] leading-none">{a.icon}</span>
              <div className="w-[150px] flex-none">
                <p className="text-[13.5px] font-bold text-[#111]">{a.name}</p>
                <p className="text-[10.5px] font-medium uppercase tracking-wide text-[#9ca3af]">
                  {a.dept} · {a.dir}
                </p>
              </div>
              <div className="hidden flex-1 items-center justify-around gap-4 md:flex">
                <MicroStat label="Leads" value={fmtInt(a.report.leadsAttempted)} />
                <MicroStat label="Connect" value={`${a.metrics.connectRate}%`} />
                <MicroStat label="Appts" value={fmtInt(a.metrics.appointments)} />
                <span className="hidden lg:inline">
                  <Sparkline values={a.trend7} color={AGENT_COLOR[a.id]} width={70} height={26} />
                </span>
              </div>
              <div className="w-[170px] flex-none">
                <div className="flex items-baseline justify-between">
                  <span className="text-[19px] font-extrabold tabular-nums text-[#10b981]">
                    {showDollarValue ? fmtMoney(valueForAgent(a.id, a.metrics.appointments)) : fmtInt(a.metrics.appointments)}
                  </span>
                  <span className="text-[10px] text-[#9ca3af]">{showDollarValue ? "value" : "appts"}</span>
                </div>
                <div className="mt-1.5">
                  <InlineBar pct={(a.metrics.appointments / maxAppts) * 100} color={AGENT_COLOR[a.id]} />
                </div>
              </div>
              <span className="text-[15px] font-bold text-[#d8caff] group-hover:text-[#813fed]">→</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─────────── 3 · What's working · what to fix ─────────── */}
      <div className="flex flex-col gap-3.5">
        <SectionLabel hint="where revenue is won and lost">What&apos;s working · what to fix</SectionLabel>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Top campaigns" sub="Your outbound campaigns, ranked by appointments booked">
            {campaigns.length ? (
              <div className="flex flex-col gap-2.5">
                {campaigns.slice(0, 6).map((c, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-semibold text-[#111]">{c.name}</p>
                      <p className="truncate text-[10.5px] text-[#9ca3af]">
                        {c.useCase || "—"} · {fmtInt(c.enrolled)} enrolled
                      </p>
                    </div>
                    <div className="flex-none text-right">
                      <p className="text-[13px] font-bold tabular-nums text-[#10b981]">{fmtInt(c.appts)} appts</p>
                      <p className="text-[10.5px] text-[#9ca3af]">{c.apptRate}% booking rate</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ComingSoon
                title="Performance by campaign"
                note="Which outreach campaigns drive the most conversations and appointments — so you can put your budget where it pays off."
              />
            )}
          </Card>
          <Card title="Money on the table" sub="Revenue you could still win back">
            {money.total ? (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-[30px] font-extrabold tabular-nums text-[#813fed] leading-none">
                    {fmtInt(money.total)}
                  </p>
                  <p className="text-[11.5px] text-[#6b7280] mt-1">
                    recoverable leads we engaged but that haven&apos;t booked
                    {apptValueBlended ? (
                      <>
                        {" "}
                        · ~<b className="text-[#111]">{fmtMoneyFull(money.total * apptValueBlended * EXPECTED_BOOK_RATE)}</b>{" "}
                        at a {Math.round(EXPECTED_BOOK_RATE * 100)}% recovery rate
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-col gap-2.5">
                  {money.buckets.map((b, i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <p className="truncate text-[12.5px] font-semibold text-[#111]">{b.label}</p>
                      <p className="flex-none text-[13px] font-bold tabular-nums text-[#813fed]">{fmtInt(b.leads)} leads</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <ComingSoon
                title="Revenue you can still recover"
                note="An estimate of the revenue within reach — leads worth re-engaging and the follow-ups most likely to close."
              />
            )}
          </Card>
        </div>
      </div>

      {/* ─────────── 4 · The pipeline ─────────── */}
      <div className="flex flex-col gap-3.5">
        <SectionLabel hint={periodLabel}>The pipeline — whole dealership</SectionLabel>
        <Card
          title="Outreach → conversation → qualified → appointment"
          sub="Each step is the unique leads that reached that stage; the pill is conversion from the step before"
        >
          <StepFunnel stages={fleet.funnel} />
          <div className="mt-5 grid grid-cols-2 gap-2.5 border-t border-[#f3f4f6] pt-4 sm:grid-cols-4">
            <ContextChip
              label={fleet.answerRateInbound != null ? "Inbound answer rate" : "Connect rate (IB+OB)"}
              value={`${fleet.answerRateInbound ?? fleet.connectRate}%`}
            />
            <ContextChip label="After-hours captured" value={fmtInt(fleet.afterHours)} accent="#10b981" />
            <ContextChip label="Talk time" value={`${fmtInt(fleet.talkMinutes / 60)}h`} />
            <ComingSoon title="Show rate" inline />
          </div>
        </Card>
      </div>

      {/* ─────────── 5 · Can you trust it ─────────── */}
      <div className="flex flex-col gap-3.5">
        <SectionLabel hint="audit-grade hygiene you can show">Can you trust it</SectionLabel>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Conversation quality" sub="Fleet-level, call-weighted across your live agents">
            {(() => {
              const rate = fleet.answerRateInbound ?? fleet.connectRate;
              const label = fleet.answerRateInbound != null ? "Inbound answer rate" : "Connect rate (blended IB+OB)";
              const status = rate >= 50 ? "green" : rate >= 25 ? "amber" : "red";
              return <QualityCell label={label} value={`${rate}%`} status={status} />;
            })()}
            <div className="mt-3">
              <ComingSoon title="CSAT & sentiment" note="Per-conversation satisfaction and sentiment land here once call transcripts are scored." />
            </div>
          </Card>
          <Card title="Data health" sub="How complete the customer data your agents work from is">
            <ComingSoon
              title="Customer data quality"
              note="How complete your records are — phone, email, equity, and consent coverage — because cleaner data means more reach and sharper targeting."
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ── hero sub-tile (dark band) ── */
function HeroTile({ label, value, delta, invert }: { label: string; value: string; delta?: number | null; invert?: boolean }) {
  const isNew = delta === null;
  const has = delta !== undefined;
  const d = delta ?? 0;
  const isGood = invert ? d < 0 : d > 0;
  const up = d > 0;
  return (
    <div className="px-6 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#a99fce]">{label}</p>
      <p className="mt-1 text-[22px] font-extrabold tabular-nums leading-none text-white">{value}</p>
      {has &&
        (isNew ? (
          <span className="mt-1.5 inline-block text-[10.5px] font-semibold text-[#5eead4]">New</span>
        ) : (
          <span
            className="mt-1.5 inline-block text-[10.5px] font-semibold"
            style={{ color: d === 0 ? "#a99fce" : isGood ? "#5eead4" : "#fca5a5" }}
          >
            {d === 0 ? "0%" : `${up ? "▲" : "▼"} ${Math.abs(d)}%`} vs prior
          </span>
        ))}
    </div>
  );
}

function DeltaBadge({ label, delta }: { label: string; delta: number | null }) {
  if (delta === null) {
    return (
      <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-right backdrop-blur-sm">
        <p className="text-[20px] font-extrabold tabular-nums leading-none text-[#5eead4]">New</p>
        <p className="mt-1 text-[10.5px] text-[#c4b5fd]">{label}</p>
      </div>
    );
  }
  const up = delta >= 0;
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-right backdrop-blur-sm">
      <p className="text-[20px] font-extrabold tabular-nums leading-none" style={{ color: up ? "#5eead4" : "#fca5a5" }}>
        {up ? "▲" : "▼"} {Math.abs(delta)}%
      </p>
      <p className="mt-1 text-[10.5px] text-[#c4b5fd]">{label}</p>
    </div>
  );
}

function MicroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[13.5px] font-bold tabular-nums text-[#111]">{value}</p>
      <p className="text-[9.5px] font-medium uppercase tracking-wide text-[#9ca3af]">{label}</p>
    </div>
  );
}

function ContextChip({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-[#fafafa] px-3.5 py-2.5">
      <span className="text-[11.5px] text-[#6b7280]">{label}</span>
      <span className="text-[14px] font-bold tabular-nums" style={{ color: accent ?? "#111" }}>
        {value}
      </span>
    </div>
  );
}

function QualityCell({ label, value, status }: { label: string; value: string; status: "green" | "amber" | "red" }) {
  return (
    <div className="rounded-xl border border-[#f0f0f0] px-3.5 py-3">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: RAG_STYLE[status].dot }} />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">{label}</p>
      </div>
      <p className="mt-1 text-[17px] font-bold tabular-nums text-[#111]">{value}</p>
    </div>
  );
}
