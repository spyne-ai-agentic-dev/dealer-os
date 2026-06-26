"use client"

import { useParams } from "next/navigation"
import { notFound } from "next/navigation"
import {
  ConsoleV2SalesExperience,
  type SalesPage,
} from "@/components/max-2/sales/console-v2-sales-experience"

/** Top-level tabs that map directly to a single route segment. */
const TOP_LEVEL: SalesPage[] = ["data-health", "campaigns", "action-items", "appointments", "customers", "onboarding"]

/**
 * Optional catch-all so every Sales tab has a real URL while the console shell
 * stays mounted across tabs (param change, not a remount):
 *
 *   /max-2/sales                       → overview
 *   /max-2/sales/data-health           → data health
 *   /max-2/sales/campaigns             → campaigns
 *   /max-2/sales/action-items          → action items
 *   /max-2/sales/appointments          → appointments
 *   /max-2/sales/customers             → leads list
 *   /max-2/sales/customers/:id         → customer profile
 */
export default function SalesTabPage() {
  const params = useParams<{ tab?: string | string[] }>()
  const raw = params?.tab
  const segments = Array.isArray(raw) ? raw : raw ? [raw] : []
  const [first, second] = segments

  let page: SalesPage = "overview"
  let routeId: string | null = null

  if (!first) {
    page = "overview"
  } else if (first === "customers") {
    page = second ? "customer-profile" : "customers"
    routeId = second ?? null
  } else if ((TOP_LEVEL as string[]).includes(first)) {
    page = first as SalesPage
  } else {
    // Unknown segment under /max-2/sales — surface a 404 rather than silently
    // dumping the user on the overview.
    notFound()
  }

  return <ConsoleV2SalesExperience page={page} routeId={routeId} />
}
