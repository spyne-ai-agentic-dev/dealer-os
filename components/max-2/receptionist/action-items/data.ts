/**
 * Receptionist Action Items — same data shape as Sales ActionItemsConsole, so the
 * Sales ActionItemsConsole.jsx (copied in this folder) renders without any logic
 * changes. The only divergence is content: receptionist callers/users/items
 * instead of sales-floor data.
 */

export const NOW_ISO = new Date().toISOString();
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600000).toISOString();

export type Channel = "call" | "sms" | "chat" | "email" | "hitl_takeover" | "hitl_warm_transfer";
export type Dept = "sales" | "service" | "both" | "compliance";
export type IntentId =
  | "pricing_quote" | "recall_response" | "callback_request" | "status_update"
  | "appointment_inquiry" | "service_intent" | "vehicle_inquiry" | "trade_in_inquiry"
  | "complaint" | "sms_takeover" | "specific_salesperson" | "compliance_alert"
  | "no_show" | "general_info";
export type ActionItemStatus = "pending" | "completed" | "incorrect";
export type IncorrectReason = "wrong_intent" | "not_a_task" | "customer_did_not_say_this" | "duplicate_of_existing" | "other";
export type ResolutionType = "appointment_booked" | "info_provided" | "customer_unreachable" | "dnc" | "other";

export interface IntentMeta { id: IntentId; display_name: string; dept: Dept; typical_resolution: string; sla_hours: number; }

export interface ActionItem {
  action_item_id: string;
  customer_id: string;
  customer_name?: string;
  source_channel: Channel;
  intent_id: IntentId;
  is_primary_intent_of_source: boolean;
  intent_recap: string;
  source_message: string;
  created_at: string;
  created_by_ai: boolean;
  status: ActionItemStatus;
  assignee_user_id?: string;
  closed_at?: string;
  resolution_note?: string;
  resolution_type?: ResolutionType;
  incorrect_reason?: IncorrectReason;
  repeat_caller_count: number;
  last_observed_at: string;
  escalation_reason?: "aged_past_sla" | "repeat_caller_threshold" | "compliance_flagged";
}

// Receptionist-flavored taxonomy — same IntentId shape, dealer-relevant labels & SLAs.
export const INTENT_TAXONOMY: Record<IntentId, IntentMeta> = {
  callback_request:     { id: "callback_request",     display_name: "Callback request",   dept: "both",       typical_resolution: "Call the customer back within SLA",       sla_hours: 4 },
  recall_response:      { id: "recall_response",      display_name: "Recall inquiry",     dept: "service",    typical_resolution: "VIN-verify and book service appointment", sla_hours: 4 },
  service_intent:       { id: "service_intent",       display_name: "Service request",    dept: "service",    typical_resolution: "Reach out, qualify, book service",        sla_hours: 8 },
  vehicle_inquiry:      { id: "vehicle_inquiry",      display_name: "Vehicle inquiry",    dept: "sales",      typical_resolution: "Salesperson follows up with stock info",  sla_hours: 24 },
  pricing_quote:        { id: "pricing_quote",        display_name: "Pricing or quote",   dept: "both",       typical_resolution: "Advisor sends quote",                     sla_hours: 24 },
  trade_in_inquiry:     { id: "trade_in_inquiry",     display_name: "Trade-in inquiry",   dept: "sales",      typical_resolution: "Trade desk provides offer",               sla_hours: 24 },
  appointment_inquiry:  { id: "appointment_inquiry",  display_name: "Appointment",        dept: "both",       typical_resolution: "Confirm slot, book",                       sla_hours: 24 },
  status_update:        { id: "status_update",        display_name: "Status update",      dept: "service",    typical_resolution: "Look up RO, reply with status",           sla_hours: 8 },
  complaint:            { id: "complaint",            display_name: "Complaint",          dept: "both",       typical_resolution: "Manager to handle",                       sla_hours: 4 },
  specific_salesperson: { id: "specific_salesperson", display_name: "Named adviser",      dept: "sales",      typical_resolution: "Route to named adviser",                  sla_hours: 24 },
  compliance_alert:     { id: "compliance_alert",     display_name: "Config alert",       dept: "compliance", typical_resolution: "Spyne admin to review",                   sla_hours: 4 },
  no_show:              { id: "no_show",              display_name: "No-show",            dept: "service",    typical_resolution: "BDC follows up to reschedule",            sla_hours: 8 },
  sms_takeover:         { id: "sms_takeover",         display_name: "SMS takeover",       dept: "both",       typical_resolution: "Human continues thread",                  sla_hours: 4 },
  general_info:         { id: "general_info",         display_name: "General info",       dept: "both",       typical_resolution: "Closes in-call unless unresolved",        sla_hours: 48 },
};

export const DEPT_BADGE: Record<Dept, string> = {
  sales: "spyne-badge-info", service: "spyne-badge-success", both: "spyne-badge-neutral", compliance: "spyne-badge-error",
};
export const DEPT_LABEL: Record<Dept, string> = {
  sales: "Sales", service: "Service", both: "Sales + Service", compliance: "Admin",
};

export const RESOLUTION_TYPES: { value: ResolutionType; label: string; glyph: string }[] = [
  { value: "appointment_booked",   label: "Appointment booked",     glyph: "event_available" },
  { value: "info_provided",        label: "Info provided",          glyph: "info" },
  { value: "customer_unreachable", label: "Customer unreachable",   glyph: "phone_missed" },
  { value: "dnc",                  label: "DNC",                    glyph: "do_not_disturb_on" },
  { value: "other",                label: "Other",                  glyph: "more_horiz" },
];

export const RESOLUTION_TYPE_LABEL: Record<ResolutionType, string> =
  Object.fromEntries(RESOLUTION_TYPES.map((r) => [r.value, r.label])) as Record<ResolutionType, string>;
export const RESOLUTION_TYPE_GLYPH: Record<ResolutionType, string> =
  Object.fromEntries(RESOLUTION_TYPES.map((r) => [r.value, r.glyph])) as Record<ResolutionType, string>;

export const CHANNEL_META: Record<Channel, { label: string; symbol: string }> = {
  call: { label: "Call", symbol: "call" },
  sms: { label: "SMS", symbol: "sms" },
  chat: { label: "Chat", symbol: "chat" },
  email: { label: "Email", symbol: "mail" },
  hitl_takeover: { label: "Human takeover", symbol: "support_agent" },
  hitl_warm_transfer: { label: "Warm transfer", symbol: "swap_calls" },
};

// Receptionist callers — keyed by short slug.
export const CUSTOMERS: Record<string, { name: string; phone: string }> = {
  "c-katie-brown":     { name: "Katie Brown",     phone: "(877) 410-2019" },
  "c-hamilton":        { name: "Hamilton",        phone: "(254) 212-3960" },
  "c-marcus-lee-jr":   { name: "Marcus Lee Jr.",  phone: "(415) 720-5520" },
  "c-sofia-mendes":    { name: "Sofia Mendes",    phone: "(713) 480-2204" },
  "c-renee-park":      { name: "Renee Park",      phone: "(602) 555-3311" },
  "c-derek-ohara":     { name: "Derek O'Hara",    phone: "(281) 443-0089" },
  "c-avery-sutton":    { name: "Avery Sutton",    phone: "(404) 322-0098" },
  "c-anon-1132":       { name: "Unknown caller",  phone: "(113) 213-2333" },
  "c-anon-1353":       { name: "Unknown caller",  phone: "(353) 454-5555" },
  "c-anon-1987":       { name: "Unknown caller",  phone: "(987) 555-0102" },
  "c-anon-1312":       { name: "Unknown caller",  phone: "(312) 555-8844" },
  "c-system-admin":    { name: "System / admin",  phone: "—" },
};

// Receptionist users available for assignment.
export const USERS: Record<string, { name: string; initials: string }> = {
  "u-sam":     { name: "Sam Patel",        initials: "SP" },
  "u-dawn":    { name: "Dawn Reyes",       initials: "DR" },
  "u-marcus":  { name: "Marcus Lee",       initials: "ML" },
  "u-priya":   { name: "Priya Singh",      initials: "PS" },
  "u-brian":   { name: "Brian Cole",       initials: "BC" },
  "u-elena":   { name: "Elena Cruz",       initials: "EC" },
  "u-admin":   { name: "Spyne Admin",      initials: "SA" },
  vini_agent:  { name: "Riley (AI)",       initials: "AI" },
};

export const CURRENT_USER_ID = "u-priya";

/** Cumulative metrics shown in the manager strip. */
export const CLEARED_TODAY = 8;
export const RESOLVED_TOTAL = 142;

export const ACTION_ITEMS: ActionItem[] = [
  // Pending — across the dealership today
  { action_item_id: "ai-r-001", customer_id: "c-katie-brown",    customer_name: "Katie Brown",     source_channel: "call", intent_id: "complaint",            is_primary_intent_of_source: true,  intent_recap: "Customer is escalating — third call this week, wants a manager urgently.",                source_message: "I'm extremely frustrated — I want to speak with a manager. This is the third time I'm calling.",                                created_at: hoursAgo(6),    created_by_ai: true,  status: "pending", assignee_user_id: "u-dawn",   repeat_caller_count: 3,  last_observed_at: hoursAgo(1), escalation_reason: "repeat_caller_threshold" },
  { action_item_id: "ai-r-002", customer_id: "c-anon-1132",                                       source_channel: "call", intent_id: "service_intent",       is_primary_intent_of_source: true,  intent_recap: "After-hours brake-service callback — caller asked for AM follow-up.",                       source_message: "Hi, I know you're closed but I need brake service ASAP — please call me back tomorrow morning.",                                created_at: hoursAgo(10),   created_by_ai: true,  status: "pending", assignee_user_id: "u-sam",    repeat_caller_count: 0,  last_observed_at: hoursAgo(10) },
  { action_item_id: "ai-r-003", customer_id: "c-anon-1353",                                       source_channel: "call", intent_id: "callback_request",     is_primary_intent_of_source: true,  intent_recap: "Failed transfer to Sam — caller agreed to Tuesday-10am callback.",                          source_message: "Can you have Sam call me back? I'd like Tuesday morning around 10.",                                                              created_at: hoursAgo(28),   created_by_ai: true,  status: "pending", assignee_user_id: "u-sam",    repeat_caller_count: 0,  last_observed_at: hoursAgo(28), escalation_reason: "aged_past_sla" },
  { action_item_id: "ai-r-004", customer_id: "c-system-admin",                                    source_channel: "call", intent_id: "compliance_alert",     is_primary_intent_of_source: true,  intent_recap: "Parts ext. 204 unreachable on 5 of 7 transfer attempts — routing target failing.",         source_message: "—",                                                                                                                                  created_at: hoursAgo(72),   created_by_ai: true,  status: "pending", assignee_user_id: "u-admin",  repeat_caller_count: 0,  last_observed_at: hoursAgo(1),  escalation_reason: "compliance_flagged" },
  { action_item_id: "ai-r-005", customer_id: "c-hamilton",     customer_name: "Hamilton",         source_channel: "call", intent_id: "callback_request",     is_primary_intent_of_source: true,  intent_recap: "F-150 lease inquiry — caller wants a Tuesday-morning callback to discuss options.",        source_message: "I saw an F-150 on your website — can someone call me back Tuesday morning to discuss lease options?",                              created_at: hoursAgo(26),   created_by_ai: true,  status: "pending", assignee_user_id: "u-elena",  repeat_caller_count: 2,  last_observed_at: hoursAgo(2) },
  { action_item_id: "ai-r-006", customer_id: "c-anon-1987",                                       source_channel: "call", intent_id: "vehicle_inquiry",      is_primary_intent_of_source: true,  intent_recap: "Voicemail about a 2024 F-150 on the lot — no name given, callback requested.",             source_message: "Hi, calling about a 2024 F-150 you have on the lot. Please call back.",                                                            created_at: hoursAgo(11),   created_by_ai: true,  status: "pending",                                 repeat_caller_count: 0,  last_observed_at: hoursAgo(11) },
  { action_item_id: "ai-r-007", customer_id: "c-hamilton",     customer_name: "Hamilton",         source_channel: "call", intent_id: "callback_request",     is_primary_intent_of_source: false, intent_recap: "Follow-up F-150 inquiry — Emily unavailable, voicemail captured.",                          source_message: "I'm following up on the F-150 I asked about Monday — any update?",                                                                  created_at: hoursAgo(56),   created_by_ai: true,  status: "pending", assignee_user_id: "u-elena",  repeat_caller_count: 2,  last_observed_at: hoursAgo(56) },
  { action_item_id: "ai-r-008", customer_id: "c-anon-1312",                                       source_channel: "call", intent_id: "trade_in_inquiry",     is_primary_intent_of_source: true,  intent_recap: "After-hours trade-in evaluation request — Thu morning callback.",                            source_message: "I'd like a trade-in valuation on my 2022 Q5 — please call me back Thursday morning.",                                                created_at: hoursAgo(20),   created_by_ai: true,  status: "pending",                                 repeat_caller_count: 0,  last_observed_at: hoursAgo(20) },
  { action_item_id: "ai-r-009", customer_id: "c-derek-ohara",  customer_name: "Derek O'Hara",     source_channel: "call", intent_id: "pricing_quote",        is_primary_intent_of_source: true,  intent_recap: "Mustang GT lease quote — caller qualified, advisor follow-up needed.",                       source_message: "Looking for a Mustang GT lease quote — 36 months, low miles.",                                                                      created_at: hoursAgo(50),   created_by_ai: true,  status: "pending", assignee_user_id: "u-elena",  repeat_caller_count: 0,  last_observed_at: hoursAgo(50) },
  { action_item_id: "ai-r-010", customer_id: "c-avery-sutton", customer_name: "Avery Sutton",     source_channel: "call", intent_id: "complaint",            is_primary_intent_of_source: true,  intent_recap: "Repeat-issue caller — Explorer leak; Riley flagged sentiment as upset.",                     source_message: "My Explorer is still leaking — this is the third time I've had to come back for the same thing.",                                  created_at: hoursAgo(3),    created_by_ai: true,  status: "pending", assignee_user_id: "u-sam",    repeat_caller_count: 3,  last_observed_at: hoursAgo(3),  escalation_reason: "repeat_caller_threshold" },

  // Resolved
  { action_item_id: "ai-r-100", customer_id: "c-marcus-lee-jr", customer_name: "Marcus Lee Jr.", source_channel: "call", intent_id: "trade_in_inquiry",     is_primary_intent_of_source: true,  intent_recap: "Trade-in valuation request — Marcus follow-up.",                                           source_message: "Need a trade-in valuation on my 2020 Tesla Model 3 — call me back this afternoon.",                                                created_at: hoursAgo(34),   created_by_ai: true,  status: "completed", assignee_user_id: "u-marcus", closed_at: hoursAgo(8),  resolution_type: "info_provided",      resolution_note: "Called back, offered $24,800. Customer considering.",                  repeat_caller_count: 0,  last_observed_at: hoursAgo(34) },
  { action_item_id: "ai-r-101", customer_id: "c-sofia-mendes",  customer_name: "Sofia Mendes",   source_channel: "call", intent_id: "recall_response",      is_primary_intent_of_source: true,  intent_recap: "Bronco airbag recall — VIN-verify and book service.",                                       source_message: "Need to know if my Bronco is part of the airbag recall — please call me back.",                                                    created_at: hoursAgo(48),   created_by_ai: true,  status: "completed", assignee_user_id: "u-priya",  closed_at: hoursAgo(32), resolution_type: "appointment_booked", resolution_note: "VIN verified — booked Thu 11am for recall 23S38.",                     repeat_caller_count: 0,  last_observed_at: hoursAgo(48) },
  { action_item_id: "ai-r-102", customer_id: "c-renee-park",    customer_name: "Renee Park",     source_channel: "call", intent_id: "service_intent",       is_primary_intent_of_source: true,  intent_recap: "Tire-rotation slot for Saturday.",                                                          source_message: "Need a tire rotation Saturday morning, loaner not needed.",                                                                         created_at: hoursAgo(60),   created_by_ai: true,  status: "completed", assignee_user_id: "vini_agent", closed_at: hoursAgo(58), resolution_type: "appointment_booked", resolution_note: "Auto-resolved by Riley — Saturday 9am tire rotation booked.",          repeat_caller_count: 0,  last_observed_at: hoursAgo(60) },
];

/* ── Helpers ─────────────────────────────────────────────────────── */

const NOW_MS = Date.now();

export function ageMinutes(item: ActionItem): number {
  return Math.floor((NOW_MS - new Date(item.created_at).getTime()) / 60000);
}

export function ageLabel(mins: number): string {
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) { const r = mins % 60; return r > 0 ? `${h}h ${r}m ago` : `${h}h ago`; }
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : `${Math.floor(d / 7)}w ago`;
}

export function isPastSla(item: ActionItem): boolean {
  if (item.status !== "pending") return false;
  return ageMinutes(item) >= INTENT_TAXONOMY[item.intent_id].sla_hours * 60;
}

export function slaBurnRatio(item: ActionItem): number {
  const slaMins = Math.max(1, INTENT_TAXONOMY[item.intent_id].sla_hours * 60);
  return ageMinutes(item) / slaMins;
}

export function deptOf(item: ActionItem): Dept {
  return INTENT_TAXONOMY[item.intent_id].dept;
}
