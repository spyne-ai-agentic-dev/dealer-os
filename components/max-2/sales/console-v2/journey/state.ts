/**
 * Onboarding / value journey — the 0→end-state story.
 *
 * One derived enum drives the Overview: new → connecting → analyzing → ready →
 * active. `active` renders the existing console verbatim; earlier stages each
 * render ONE focused surface so density is earned, not dumped. Per the judged
 * journey spec (stakeholder ask: "show how a user goes 0 → final state").
 */

export type Stage = "new" | "connecting" | "analyzing" | "ready" | "active";

export const STAGES: Stage[] = ["new", "connecting", "analyzing", "ready", "active"];

export const STAGE_META: Record<Stage, { label: string; caption: string }> = {
  new: { label: "Welcome", caption: "Connect your data" },
  connecting: { label: "Connecting", caption: "First sync + identity resolve" },
  analyzing: { label: "Analyzing", caption: "Reading your data" },
  ready: { label: "Opportunities", caption: "First-time experience" },
  active: { label: "Running", caption: "Live console" },
};

/** All tabs are unlocked — no stage gating. */
export function lockedTabsForStage(_stage: Stage): string[] {
  return [];
}

export interface ConnectStep {
  id: string;
  category: "CRM" | "DMS" | "Service CRM" | "IMS" | "Website";
  vendor: string;
  glyph: string; // lucide name
  blurb: string;
  unlocks: string;
  valueK: number; // pipeline $ this source unlocks, in $K
  required?: boolean;
}

export const CONNECT_STEPS: ConnectStep[] = [
  { id: "crm", category: "CRM", vendor: "VinSolutions", glyph: "Contact", blurb: "Leads + every interaction.", unlocks: "Speed-to-lead · re-engagement", valueK: 84, required: true },
  { id: "dms", category: "DMS", vendor: "CDK Global", glyph: "Database", blurb: "Deals, equity, ownership.", unlocks: "Equity mining · lease-end", valueK: 96 },
  { id: "service", category: "Service CRM", vendor: "Tekion Service", glyph: "Wrench", blurb: "Service ROs + declined work.", unlocks: "Service-to-sales", valueK: 32 },
  { id: "ims", category: "IMS", vendor: "vAuto", glyph: "Boxes", blurb: "Live lot inventory.", unlocks: "Inventory matching · STL accuracy", valueK: 18 },
  { id: "web", category: "Website", vendor: "ADF lead feed", glyph: "Globe", blurb: "Real-time website leads.", unlocks: "Sub-2-min speed-to-lead", valueK: 24 },
];

export const TOTAL_PIPELINE_K = CONNECT_STEPS.reduce((s, c) => s + c.valueK, 0);

export interface Opportunity {
  id: string;
  title: string;
  detail: string;
  stakeK: number;
  sourceLabel: string;
  needs?: string; // a connector category that, if not connected, locks this
  prompt: string;
}

/** Ranked campaign opportunities VINI surfaces from the dealer's own data. */
export const OPPORTUNITIES: Opportunity[] = [
  { id: "tahoe", title: "Aging Tahoe LT — protect $2,400 margin", detail: "67 days on the lot · 2 matched shoppers who looked at 3-row SUVs. Move it before it costs more.", stakeK: 2.4, sourceLabel: "IMS + CRM", prompt: "Create a campaign to move the 2022 Chevrolet Tahoe LT that's been on the lot 67 days — reach shoppers who looked at similar 3-row SUVs with a limited-time price adjustment. Voice + SMS." },
  { id: "equity", title: "Equity mining — 240 owners with >$5K equity", detail: "Daily-driver vehicles now worth more than the payoff. Frame the trade-up while rates are favorable.", stakeK: 96, sourceLabel: "DMS + Black Book", needs: "DMS", prompt: "Mine equity from customers with more than $5K positive equity and offer an upgrade. Frame the trade value as an estimate. Voice + SMS, 5 touches over 21 days." },
  { id: "lease", title: "Lease-end — 92 maturing in 60–90 days", detail: "Buy-out, trade, or walk. Lead with the residual-vs-market gap where there's positive equity.", stakeK: 58, sourceLabel: "DMS", needs: "DMS", prompt: "Outbound to customers whose lease matures in the next 60–90 days. Offer buy-out, trade, or walk. Voice + SMS, 5 touches over 21 days." },
  { id: "noshow", title: "No-show recovery — 34 missed last week", detail: "Customers who booked but didn't show convert well on a same-week nudge.", stakeK: 28, sourceLabel: "CRM + Appointments", prompt: "Follow up with customers who had an appointment last week but didn't show. Empathetic, two new slots. Voice + SMS, 3 touches over 5 days." },
  { id: "service", title: "Service-to-sales — declined-work owners", detail: "Owners who declined recommended service and are equity-positive — pivot to an upgrade.", stakeK: 32, sourceLabel: "Service CRM + DMS", needs: "Service CRM", prompt: "Re-engage customers who declined recommended service in the last 60 days and are equity-positive — pivot to an upgrade conversation. SMS + voice." },
];

export const OPPORTUNITY_TOTAL_K = OPPORTUNITIES.reduce((s, o) => s + o.stakeK, 0);
