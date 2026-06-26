/* No-op analytics shim for the ported reporting UI.
 *
 * The source repo wired these events to Vercel Web Analytics. Inside dealer-os we
 * don't carry that dependency, so `track` is a no-op that preserves the call sites
 * (and their type-checked event shapes) without emitting anything. */

export type ReportTab = "overview" | "agents" | "campaigns";

export function track(_event: string, _props?: Record<string, unknown>): void {
  // intentionally empty
}
