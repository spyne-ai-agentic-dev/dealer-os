// Receptionist mock data — mirrors the shape of service mock data so the same primitives render it.
// Swap to API calls when the backend is wired.

export type ReceptionistTopIntentTone = "success" | "primary" | "warning" | "danger"

export interface ReceptionistTopIntentRow {
  intent: string
  calls: number
  routed: number
  appts: number
  ratePct: number
  tone: ReceptionistTopIntentTone
}

export interface ReceptionistMetric {
  label: string
  value: string
  sub: string
  highlight: boolean
}

export interface ReceptionistOverview {
  metricsBar: ReceptionistMetric[]
  topIntents: ReceptionistTopIntentRow[]
  routingDistribution: {
    rateLabel: string
    rateCaption: string
    deltaLabel: string
    segments: { label: string; value: number; tone: "primary" | "success" | "warning" | "info" | "neutral" }[]
  }
}

// Multipliers anchored to "Last 30 days" = 1.0
const PERIOD_MULTIPLIERS: Record<string, number> = {
  "Last 7 days":  0.24,
  "Last 14 days": 0.48,
  "Last 30 days": 1.0,
  "This month":   0.92,  // ~partial month
  "Last month":   1.05,
}

export function getReceptionistOverviewData(dateRange: string): ReceptionistOverview {
  const m = PERIOD_MULTIPLIERS[dateRange] ?? 1.0
  const s = (n: number) => Math.round(n * m)
  // Reconciled numbers — destinations + answered + abandoned = total calls
  const calls            = Math.max(1, s(142))
  const abandoned        = s(13)
  const answeredDirectly = s(11)
  const routedSales      = s(56)
  const routedService    = s(48)
  const routedParts      = s(10)
  const routedFinance    = s(4)
  const successfullyHandled = calls - abandoned
  const afterHoursCaptured  = s(24)

  return {
    metricsBar: [
      { label: "Calls handled",         value: calls.toLocaleString(), sub: "+18% vs last period",                            highlight: false },
      { label: "Successfully handled",  value: `${Math.round((successfullyHandled / calls) * 100)}%`, sub: `${successfullyHandled} of ${calls} calls connected or answered`, highlight: false },
      { label: "After-hours captured",  value: afterHoursCaptured.toString(), sub: "calls Riley saved overnight",            highlight: false },
      { label: "Awaiting your action",  value: "6",                    sub: "callbacks + escalations to handle",              highlight: true  },
    ],
    topIntents: [
      { intent: "Service inquiry",   calls: s(48), routed: s(46), appts: s(12), ratePct: 96, tone: "success" },
      { intent: "Sales inquiry",     calls: s(36), routed: s(33), appts: s(8),  ratePct: 92, tone: "success" },
      { intent: "General info",      calls: s(19), routed: 0,     appts: 0,     ratePct: 100, tone: "success" },
      { intent: "Parts inquiry",     calls: s(14), routed: s(12), appts: 0,     ratePct: 86, tone: "primary" },
      { intent: "Staff request",     calls: s(9),  routed: s(7),  appts: 0,     ratePct: 78, tone: "warning" },
      { intent: "After-hours msg",   calls: s(7),  routed: s(7),  appts: 0,     ratePct: 100, tone: "success" },
      { intent: "Complaint / Esc.",  calls: s(4),  routed: s(4),  appts: 0,     ratePct: 100, tone: "success" },
    ],
    routingDistribution: {
      rateLabel: `${Math.round((successfullyHandled / calls) * 100)}%`,
      rateCaption: "Successfully handled",
      deltaLabel: "↑ 5% above last month",
      segments: [
        { label: "Routed to Sales (Emily)",   value: routedSales,      tone: "primary" },
        { label: "Routed to Service (Eric)",  value: routedService,    tone: "success" },
        { label: "Routed to Parts ext.",      value: routedParts,      tone: "warning" },
        { label: "Routed to Finance ext.",    value: routedFinance,    tone: "info" },
        { label: "Answered directly",         value: answeredDirectly, tone: "neutral" },
        { label: "Abandoned",                 value: abandoned,        tone: "neutral" },
      ],
    },
  }
}

// ============= AGENT =============
export const receptionistAgentData = {
  name: "Riley",
  role: "Receptionist AI · Inbound",
  status: "Live",
  liveSince: "June 1, 2026",
  todayCalls: 9,
  todayRouted: 7,
  lastCallRelative: "3 min ago",
  avatarLetter: "R",
}

// ============= ACTION ITEMS / FOLLOW-UPS =============
export type ReceptionistFollowUpType =
  | "after_hours_message"
  | "failed_transfer"
  | "voicemail"
  | "callback_scheduled"
  | "manager_escalation"
  | "config_gap"

export type ReceptionistResolutionType =
  | "callback_made" | "appointment_booked" | "info_provided" | "customer_unreachable" | "not_actionable" | "other"

export type ReceptionistIncorrectReason =
  | "wrong_intent" | "not_a_task" | "duplicate" | "spam_call" | "other"

export interface ReceptionistFollowUpItem {
  id: string
  task: string
  sourceMessage?: string   // what the caller actually said (1-line)
  callerName?: string
  callerPhone: string
  dueDate: string
  createdAt: string        // ISO — used for period filtering
  completedAt?: string     // ISO — set when marked done; used for "Done today" filter
  type: ReceptionistFollowUpType
  sourceIntent: string
  priority: "Urgent" | "High" | "Normal"
  status: "open" | "completed" | "dismissed"
  assignedTo?: string      // user id from RECEPTIONIST_USERS
  outcome?: string         // last logged resolution outcome (typed label)
  resolutionType?: ReceptionistResolutionType
  resolutionNote?: string
  incorrectReason?: ReceptionistIncorrectReason
}

// User dropdown for assignment in Action Items
export const RECEPTIONIST_USERS: Record<string, { name: string; initials: string }> = {
  "u-sam":   { name: "Sam Patel",    initials: "SP" },
  "u-dawn":  { name: "Dawn Reyes",   initials: "DR" },
  "u-marcus":{ name: "Marcus Lee",   initials: "ML" },
  "u-priya": { name: "Priya Singh",  initials: "PS" },
  "u-brian": { name: "Brian Cole",   initials: "BC" },
  "u-elena": { name: "Elena Cruz",   initials: "EC" },
  "u-admin": { name: "Spyne Admin",  initials: "SA" },
}

export const RECEPTIONIST_CURRENT_USER_ID = "u-priya"

// Resolution types in display order — used by the Resolve picker + Resolved tab badge
export const RECEPTIONIST_RESOLUTION_TYPES: { value: ReceptionistResolutionType; label: string; glyph: string }[] = [
  { value: "callback_made",        label: "Callback made",         glyph: "phone_callback" },
  { value: "appointment_booked",   label: "Appointment booked",    glyph: "event_available" },
  { value: "info_provided",        label: "Info provided",         glyph: "info" },
  { value: "customer_unreachable", label: "Customer unreachable",  glyph: "phone_missed" },
  { value: "not_actionable",       label: "Not actionable",        glyph: "block" },
  { value: "other",                label: "Other",                 glyph: "more_horiz" },
]

export const RECEPTIONIST_INCORRECT_REASONS: { value: ReceptionistIncorrectReason; label: string }[] = [
  { value: "wrong_intent",  label: "Wrong intent" },
  { value: "not_a_task",    label: "Not a task" },
  { value: "duplicate",     label: "Duplicate" },
  { value: "spam_call",     label: "Spam / robocall" },
  { value: "other",         label: "Other" },
]

export const receptionistFollowUps: ReceptionistFollowUpItem[] = [
  { id: "ai-001", task: "Call back for brake service quote",                              sourceMessage: "Hi, I know you're closed but I need brake service ASAP — please call me back tomorrow morning.",                                callerPhone: "+11321323333",                                  dueDate: "Today",     createdAt: "2026-06-25T08:12:00Z", type: "after_hours_message", sourceIntent: "service_inquiry",         priority: "Normal", status: "open", assignedTo: "u-sam" },
  { id: "ai-002", task: "Callback Tue 10am — failed transfer to Sam",                     sourceMessage: "Can you have Sam call me back? I'd like Tuesday morning around 10.",                                                          callerPhone: "+13534545555",                                  dueDate: "Tomorrow", createdAt: "2026-06-24T14:30:00Z", type: "failed_transfer",     sourceIntent: "staff_request",           priority: "Normal", status: "open", assignedTo: "u-sam" },
  { id: "ai-003", task: "Parts ext. 204 unreachable on 5 attempts — admin action",        sourceMessage: undefined,                                                                                                                       callerPhone: "—",                                             dueDate: "Today",     createdAt: "2026-06-22T11:00:00Z", type: "config_gap",          sourceIntent: "—",                       priority: "High",   status: "open", assignedTo: "u-admin" },
  { id: "ai-004", task: "Manager escalation — Katie Brown complaint",                     sourceMessage: "I'm extremely frustrated — I want to speak with a manager. This is the third time I'm calling.",                            callerName: "Katie Brown", callerPhone: "+18774102019",       dueDate: "Today",     createdAt: "2026-06-25T11:55:00Z", type: "manager_escalation",  sourceIntent: "complaint_or_escalation", priority: "Urgent", status: "open", assignedTo: "u-dawn" },
  { id: "ai-005", task: "Callback Tue 10am — F-150 lease inquiry",                        sourceMessage: "I saw an F-150 on your website — can someone call me back Tuesday morning to discuss lease options?",                       callerName: "Hamilton",    callerPhone: "+12542123960",       dueDate: "Tomorrow", createdAt: "2026-06-24T15:45:00Z", type: "callback_scheduled",  sourceIntent: "sales_inquiry",           priority: "Normal", status: "open", assignedTo: "u-elena" },
  { id: "ai-006", task: "Voicemail — F-150 question, no name given",                      sourceMessage: "Hi, calling about a 2024 F-150 you have on the lot. Please call back.",                                                     callerPhone: "+19875550102",                                  dueDate: "Today",     createdAt: "2026-06-25T07:30:00Z", type: "voicemail",           sourceIntent: "sales_inquiry",           priority: "Normal", status: "open", assignedTo: "u-elena" },
  // A couple of already-completed items so the Resolved tab isn't empty
  { id: "ai-100", task: "Callback for trade-in eval — Marcus follow-up",                  sourceMessage: "Need a trade-in valuation on my 2020 Tesla Model 3 — call me back this afternoon.",                                          callerName: "Marcus Lee Jr.", callerPhone: "+14157205520",   dueDate: "Done",      createdAt: "2026-06-24T09:45:00Z", completedAt: "2026-06-25T15:30:00Z", type: "callback_scheduled", sourceIntent: "finance_inquiry",     priority: "Normal", status: "completed", assignedTo: "u-marcus", resolutionType: "callback_made",      resolutionNote: "Called back, offered $24,800. Customer considering." },
  { id: "ai-101", task: "Voicemail — recall question on Bronco",                          sourceMessage: "Need to know if my Bronco is part of the airbag recall — please call me back.",                                              callerName: "Sofia Mendes",   callerPhone: "+17134802204",   dueDate: "Done",      createdAt: "2026-06-23T18:22:00Z", completedAt: "2026-06-25T10:00:00Z", type: "voicemail",          sourceIntent: "service_inquiry",     priority: "High",   status: "completed", assignedTo: "u-priya",  resolutionType: "appointment_booked", resolutionNote: "VIN verified — booked Thu 11am for recall 23S38." },
]

// ============= CALLS =============
export type CallSentiment = "happy" | "neutral" | "upset"
export type CallLeadStatus = "appointment_booked" | "hot_lead" | "existing_customer" | "info_only" | "no_action"

export interface ReceptionistCallRow {
  id: string
  customerName?: string
  callerPhone: string
  startedAt: string
  durationSec: number
  speedToAnswerSec: number          // how fast Riley picked up — typically 1-2s
  intent: string
  intentTitle: string
  outcome: string
  transferTarget: string
  transferStatus: "connected" | "voicemail" | "message_taken" | "info_provided" | "abandoned"
  agent: string
  isReturningCaller: boolean
  sentiment: CallSentiment
  leadStatus: CallLeadStatus
  tags: string[]                    // e.g. ["F-150", "Recall", "Hot lead"]
  vehicleContext?: string           // e.g. "2023 F-150 · RO 8842"
  summary: string                   // 1-line AI summary inline on the row
  aiScore: number                   // 0–10 conversation-quality score (one decimal)
  queryResolved: "resolved" | "not_resolved" | "abandoned"
}

export const receptionistCalls: ReceptionistCallRow[] = [
  { id: "CALL-001", customerName: "Piyush Gambhir",   callerPhone: "+15204025088", startedAt: "2026-06-25T17:33:00Z", durationSec: 102, speedToAnswerSec: 1, intent: "service_inquiry",         intentTitle: "Oil change inquiry",                 outcome: "routed_to_ai_agent", transferTarget: "Eric (Service Inbound AI)",  transferStatus: "connected",     agent: "Riley", isReturningCaller: true,  sentiment: "happy",   leadStatus: "appointment_booked", tags: ["Service", "Oil change", "Same-day"],     vehicleContext: "2022 F-150 · RO 8842",                summary: "Asked for next available oil-change slot. Riley booked Thu 9 AM with Service.", aiScore: 9.4, queryResolved: "resolved" },
  { id: "CALL-002",                                    callerPhone: "+12162022537", startedAt: "2026-06-25T16:12:00Z", durationSec: 58,  speedToAnswerSec: 1, intent: "general_info",            intentTitle: "Asked for address & hours",          outcome: "answered_directly",   transferTarget: "—",                          transferStatus: "info_provided", agent: "Riley", isReturningCaller: false, sentiment: "neutral", leadStatus: "info_only",          tags: ["Hours"],                                 summary: "Caller asked weekend hours; Riley answered from knowledge base.", aiScore: 8.8, queryResolved: "resolved" },
  { id: "CALL-003", customerName: "Hamilton",          callerPhone: "+12542123960", startedAt: "2026-06-25T15:45:00Z", durationSec: 134, speedToAnswerSec: 2, intent: "sales_inquiry",           intentTitle: "F-150 availability",                 outcome: "routed_to_ai_agent", transferTarget: "Emily (Sales Inbound AI)",   transferStatus: "connected",     agent: "Riley", isReturningCaller: true,  sentiment: "happy",   leadStatus: "hot_lead",           tags: ["Sales", "F-150", "Hot lead"],            vehicleContext: "Existing owner: 2018 F-150",          summary: "Asked about XLT F-150 stock; Riley routed to Emily who confirmed 2 in stock.", aiScore: 9.2, queryResolved: "resolved" },
  { id: "CALL-004",                                    callerPhone: "+13534545555", startedAt: "2026-06-25T14:30:00Z", durationSec: 72,  speedToAnswerSec: 1, intent: "staff_request",           intentTitle: "Asked for Sam in Service",           outcome: "routed_to_staff",    transferTarget: "Sam Patel (Ext. 215)",       transferStatus: "voicemail",     agent: "Riley", isReturningCaller: false, sentiment: "neutral", leadStatus: "no_action",          tags: ["Service", "Callback needed"],            summary: "Caller asked for Sam; Riley transferred but Sam was unavailable. Voicemail captured.", aiScore: 7.4, queryResolved: "resolved" },
  { id: "CALL-005",                                    callerPhone: "+11321323333", startedAt: "2026-06-24T21:18:00Z", durationSec: 63,  speedToAnswerSec: 1, intent: "after_hours_message",     intentTitle: "Brake service — after hours",        outcome: "message_taken",       transferTarget: "Service mailbox",            transferStatus: "message_taken", agent: "Riley", isReturningCaller: false, sentiment: "neutral", leadStatus: "no_action",          tags: ["After-hours", "Service", "Brake"],       summary: "After-hours brake-service request; Riley captured callback details for Service.", aiScore: 8.5, queryResolved: "resolved" },
  { id: "CALL-006", customerName: "Vanshika Rao",      callerPhone: "+19108222231", startedAt: "2026-06-24T18:45:00Z", durationSec: 47,  speedToAnswerSec: 1, intent: "parts_inquiry",           intentTitle: "Brake pads availability",            outcome: "routed_to_dept",     transferTarget: "Parts (Ext. 204)",           transferStatus: "connected",     agent: "Riley", isReturningCaller: false, sentiment: "happy",   leadStatus: "existing_customer",  tags: ["Parts", "Brake pads"],                   summary: "Asked for brake-pad availability for 2022 Camry; Riley confirmed stock & routed to Parts.", aiScore: 9.1, queryResolved: "resolved" },
  { id: "CALL-007", customerName: "Katie Brown",       callerPhone: "+18774102019", startedAt: "2026-06-24T11:55:00Z", durationSec: 96,  speedToAnswerSec: 2, intent: "complaint_or_escalation", intentTitle: "Complaint — wanted manager",          outcome: "routed_to_staff",    transferTarget: "Dawn Reyes (Sales Mgr)",     transferStatus: "connected",     agent: "Riley", isReturningCaller: true,  sentiment: "upset",   leadStatus: "no_action",          tags: ["Escalation", "Complaint"],               vehicleContext: "2024 Mustang · 3rd call this week",   summary: "Frustrated caller; Riley routed to manager Dawn within 12s.", aiScore: 6.8, queryResolved: "not_resolved" },
  { id: "CALL-008",                                    callerPhone: "+12342344444", startedAt: "2026-06-24T10:12:00Z", durationSec: 32,  speedToAnswerSec: 1, intent: "abandoned",               intentTitle: "Hung up before intent",              outcome: "abandoned",           transferTarget: "—",                          transferStatus: "abandoned",     agent: "Riley", isReturningCaller: false, sentiment: "neutral", leadStatus: "no_action",          tags: ["Abandoned"],                             summary: "Caller hung up after 32s before stating intent. Missed-call SMS auto-sent.", aiScore: 3.2, queryResolved: "abandoned" },
  { id: "CALL-009", customerName: "Marcus Lee Jr.",    callerPhone: "+14157205520", startedAt: "2026-06-24T09:45:00Z", durationSec: 215, speedToAnswerSec: 1, intent: "finance_inquiry",         intentTitle: "Trade-in valuation question",        outcome: "routed_to_dept",     transferTarget: "Finance (Ext. 312)",         transferStatus: "connected",     agent: "Riley", isReturningCaller: false, sentiment: "happy",   leadStatus: "hot_lead",           tags: ["Finance", "Trade-in", "Hot lead"],       vehicleContext: "2020 Tesla Model 3 · trade-in",        summary: "Trade-in valuation question; Riley collected VIN & routed to Marcus in Finance.", aiScore: 9.6, queryResolved: "resolved" },
  { id: "CALL-010", customerName: "Sofia Mendes",      callerPhone: "+17134802204", startedAt: "2026-06-24T08:22:00Z", durationSec: 88,  speedToAnswerSec: 1, intent: "service_inquiry",         intentTitle: "Recall question — Bronco airbag",    outcome: "routed_to_dept",     transferTarget: "Service (Ext. 200)",         transferStatus: "connected",     agent: "Riley", isReturningCaller: true,  sentiment: "neutral", leadStatus: "appointment_booked", tags: ["Service", "Recall", "Bronco"],           vehicleContext: "2022 Bronco · open recall 23S38",     summary: "Customer asked about airbag recall 23S38; Riley confirmed VIN match & booked.", aiScore: 9.0, queryResolved: "resolved" },
  { id: "CALL-011",                                    callerPhone: "+19515551200", startedAt: "2026-06-23T19:50:00Z", durationSec: 41,  speedToAnswerSec: 1, intent: "general_info",            intentTitle: "Spanish — preguntando horario",      outcome: "answered_directly",   transferTarget: "—",                          transferStatus: "info_provided", agent: "Riley", isReturningCaller: false, sentiment: "happy",   leadStatus: "info_only",          tags: ["Spanish", "Hours"],                      summary: "Spanish-speaking caller asked dealership hours; Riley answered in Spanish.", aiScore: 9.3, queryResolved: "resolved" },
  { id: "CALL-012", customerName: "Derek O'Hara",      callerPhone: "+12814430089", startedAt: "2026-06-23T16:08:00Z", durationSec: 156, speedToAnswerSec: 2, intent: "sales_inquiry",           intentTitle: "Mustang GT lease quote",             outcome: "routed_to_ai_agent", transferTarget: "Emily (Sales Inbound AI)",   transferStatus: "connected",     agent: "Riley", isReturningCaller: false, sentiment: "happy",   leadStatus: "hot_lead",           tags: ["Sales", "Mustang", "Lease", "Hot lead"], summary: "Lease quote for Mustang GT; Riley qualified budget then routed to Emily.", aiScore: 9.5, queryResolved: "resolved" },
  { id: "CALL-013",                                    callerPhone: "+18324820009", startedAt: "2026-06-23T14:01:00Z", durationSec: 38,  speedToAnswerSec: 1, intent: "abandoned",               intentTitle: "Hung up — IVR confusion",            outcome: "abandoned",           transferTarget: "—",                          transferStatus: "abandoned",     agent: "Riley", isReturningCaller: false, sentiment: "upset",   leadStatus: "no_action",          tags: ["Abandoned"],                             summary: "Caller said 'wrong number' & hung up; Riley couldn't recover.", aiScore: 2.5, queryResolved: "abandoned" },
  { id: "CALL-014", customerName: "Renee Park",        callerPhone: "+16025553311", startedAt: "2026-06-23T11:30:00Z", durationSec: 121, speedToAnswerSec: 1, intent: "service_inquiry",         intentTitle: "Tire rotation appt",                 outcome: "routed_to_dept",     transferTarget: "Service (Ext. 200)",         transferStatus: "connected",     agent: "Riley", isReturningCaller: true,  sentiment: "happy",   leadStatus: "appointment_booked", tags: ["Service", "Tires"],                      vehicleContext: "2021 Edge · 32k mi",                  summary: "Booked Saturday tire-rotation slot; loaner declined.", aiScore: 9.2, queryResolved: "resolved" },
  { id: "CALL-015", customerName: "Hamilton",          callerPhone: "+12542123960", startedAt: "2026-06-23T10:00:00Z", durationSec: 84,  speedToAnswerSec: 1, intent: "sales_inquiry",           intentTitle: "Follow-up on F-150 stock",           outcome: "routed_to_ai_agent", transferTarget: "Emily (Sales Inbound AI)",   transferStatus: "voicemail",     agent: "Riley", isReturningCaller: true,  sentiment: "neutral", leadStatus: "hot_lead",           tags: ["Sales", "F-150", "Follow-up"],           vehicleContext: "Existing owner: 2018 F-150",          summary: "Follow-up F-150 inquiry; Emily unavailable — voicemail captured.", aiScore: 7.9, queryResolved: "not_resolved" },
  { id: "CALL-016",                                    callerPhone: "+13125558844", startedAt: "2026-06-22T20:15:00Z", durationSec: 54,  speedToAnswerSec: 1, intent: "after_hours_message",     intentTitle: "After-hours — trade-in eval",        outcome: "message_taken",       transferTarget: "Sales mailbox",              transferStatus: "message_taken", agent: "Riley", isReturningCaller: false, sentiment: "neutral", leadStatus: "hot_lead",           tags: ["After-hours", "Trade-in"],               summary: "After-hours trade-in eval request; callback Thu morning.", aiScore: 8.6, queryResolved: "resolved" },
  { id: "CALL-017", customerName: "Avery Sutton",      callerPhone: "+14043220098", startedAt: "2026-06-22T15:48:00Z", durationSec: 178, speedToAnswerSec: 2, intent: "complaint_or_escalation", intentTitle: "Repeat issue — vehicle still leaks", outcome: "routed_to_staff",    transferTarget: "Sam Patel (Ext. 215)",       transferStatus: "connected",     agent: "Riley", isReturningCaller: true,  sentiment: "upset",   leadStatus: "no_action",          tags: ["Escalation", "Service", "Repeat"],       vehicleContext: "2019 Explorer · 3 ROs in 60d",        summary: "Repeat-issue caller — Riley flagged sentiment 'upset' & escalated to Sam.", aiScore: 6.2, queryResolved: "not_resolved" },
  { id: "CALL-018",                                    callerPhone: "+19725550021", startedAt: "2026-06-22T12:20:00Z", durationSec: 49,  speedToAnswerSec: 1, intent: "parts_inquiry",           intentTitle: "Wiper blade fitment",                outcome: "answered_directly",   transferTarget: "—",                          transferStatus: "info_provided", agent: "Riley", isReturningCaller: false, sentiment: "happy",   leadStatus: "info_only",          tags: ["Parts"],                                 summary: "Wiper fitment for 2020 Escape; Riley answered from knowledge — no transfer.", aiScore: 9.1, queryResolved: "resolved" },
  { id: "CALL-019", customerName: "Theo Carlson",      callerPhone: "+15012220056", startedAt: "2026-06-22T09:05:00Z", durationSec: 198, speedToAnswerSec: 2, intent: "finance_inquiry",         intentTitle: "Refinance options",                  outcome: "routed_to_dept",     transferTarget: "Finance (Ext. 312)",         transferStatus: "connected",     agent: "Riley", isReturningCaller: false, sentiment: "happy",   leadStatus: "hot_lead",           tags: ["Finance", "Refi"],                       vehicleContext: "2023 Bronco · 18mo into loan",        summary: "Refinance question; Riley collected payoff details & routed to Marcus.", aiScore: 9.4, queryResolved: "resolved" },
  { id: "CALL-020", customerName: "Priya Singh",       callerPhone: "+17075550098", startedAt: "2026-06-21T17:35:00Z", durationSec: 67,  speedToAnswerSec: 1, intent: "staff_request",           intentTitle: "Asked for Priya in Service",         outcome: "routed_to_staff",    transferTarget: "Priya Singh (Ext. 216)",     transferStatus: "connected",     agent: "Riley", isReturningCaller: true,  sentiment: "happy",   leadStatus: "existing_customer",  tags: ["Service", "Sticky-routed"],              vehicleContext: "Loyal customer · 6 visits",            summary: "Sticky-routed to Priya as preferred service advisor.", aiScore: 9.7, queryResolved: "resolved" },
]

// ============= PERIOD HELPERS =============
// Map the date-range label used everywhere in the receptionist module to a
// cutoff Date. Anything with a timestamp >= cutoff is "in the period."
export function periodCutoff(label: string, now: Date = new Date(Date.parse("2026-06-25T18:00:00Z"))): Date {
  const day = 24 * 60 * 60 * 1000
  switch (label) {
    case "Last 7 days":   return new Date(now.getTime() - 7 * day)
    case "Last 14 days":  return new Date(now.getTime() - 14 * day)
    case "Last 30 days":  return new Date(now.getTime() - 30 * day)
    case "This month": {
      const d = new Date(now); d.setUTCDate(1); d.setUTCHours(0, 0, 0, 0); return d
    }
    case "Last month": {
      const d = new Date(now); d.setUTCMonth(d.getUTCMonth() - 1); d.setUTCDate(1); d.setUTCHours(0, 0, 0, 0); return d
    }
    default:              return new Date(0)
  }
}

// True if the given ISO timestamp is "today" relative to `now`. Used for
// "Done today" tab semantics.
export function isToday(iso: string | undefined, now: Date = new Date(Date.parse("2026-06-25T18:00:00Z"))): boolean {
  if (!iso) return false
  const d = new Date(iso)
  return d.getUTCFullYear() === now.getUTCFullYear()
    && d.getUTCMonth()    === now.getUTCMonth()
    && d.getUTCDate()     === now.getUTCDate()
}

// ============= DATA HEALTH =============
export type HealthSeverity = "err" | "warn" | "ok"

export interface DataHealthIssue {
  id: string
  severity: HealthSeverity
  title: string
  detail: string
  action: { label: string; href: string }
}

export const dataHealthIssues: DataHealthIssue[] = [
  {
    id: "i1",
    severity: "err",
    title: "Parts dept extension unreachable",
    detail: "Ext. 204 has failed on 5 of the last 7 transfer attempts. Calls are rolling to voicemail.",
    action: { label: "View call logs", href: "/max-2/receptionist?tab=calls" },
  },
  {
    id: "i2",
    severity: "warn",
    title: "Parts department has no backup target",
    detail: "If the only target fails, calls have nowhere else to go. Reach out to your Spyne admin to add a fallback.",
    action: { label: "Open action items", href: "/max-2/receptionist?tab=action-items" },
  },
]

export interface RoutingTargetHealth {
  name: string
  type: "ai_agent" | "extension" | "voicemail"
  status: HealthSeverity
  detail: string
}

export const routingTargetsHealth: RoutingTargetHealth[] = [
  { name: "Sales Inbound AI · Emily",   type: "ai_agent",  status: "ok",  detail: "24/7 · responsive" },
  { name: "Service Inbound AI · Eric",  type: "ai_agent",  status: "ok",  detail: "24/7 · responsive" },
  { name: "Sales dept · Ext. 100",      type: "extension", status: "ok",  detail: "Reachable during hours" },
  { name: "Service dept · Ext. 200",    type: "extension", status: "ok",  detail: "Reachable during hours" },
  { name: "Parts dept · Ext. 204",      type: "extension", status: "err", detail: "5 of last 7 attempts failed" },
  { name: "Finance dept · Ext. 312",    type: "extension", status: "ok",  detail: "Reachable during hours" },
  { name: "Sales voicemail",            type: "voicemail", status: "ok",  detail: "Always reachable" },
  { name: "Service voicemail",          type: "voicemail", status: "ok",  detail: "Always reachable" },
]

export interface DataHealthEvent {
  id: string
  severity: HealthSeverity
  title: string
  detail: string
  when: string
}

export const dataHealthRecentEvents: DataHealthEvent[] = [
  { id: "r1", severity: "ok",   title: "Knowledge updated",          detail: "FAQ added: 'Do you take Apple Pay for service?'", when: "Today · 2:14 PM" },
  { id: "r2", severity: "ok",   title: "Bulletin posted",            detail: "Closing at 4pm today for staff training",         when: "Yesterday" },
  { id: "r3", severity: "warn", title: "Parts ext. 204 unreachable", detail: "Issue auto-detected · still open",                when: "4 hours ago" },
]

// Single source of truth for the Data Health page-level stats. callsToday is
// computed from `receptionistCalls`; uptime is operational telemetry we keep
// here so the badge in the shell stays in sync with the page.
export const dataHealthStats = {
  uptime: "99.7%",
  get callsToday() {
    const now = new Date(Date.parse("2026-06-25T18:00:00Z"))
    return receptionistCalls.filter((c) => isToday(c.startedAt, now)).length
  },
}

// ============= ROUTING CONFIG =============
export interface RoutingTarget {
  type: "ai_agent" | "extension" | "voicemail"
  label: string
  reference: string
  available: "24/7" | "dept_hours" | "always"
  status: "active" | "warning" | "error"
}

export interface RoutingDepartment {
  id: string
  name: string
  description: string
  hours: string
  targets: RoutingTarget[]
}

export const receptionistRoutingConfig = {
  dealership: {
    name: "Spyne Motors",
    address: "2300 Auto Center Dr, Houston, TX 77043",
    hours: "Mon-Fri 7am-7pm  •  Sat 8am-5pm  •  Sun Closed",
    languages: ["English", "Spanish"],
    generalInfo: "Free parking. Spanish-speaking staff in Sales. Closed federal holidays. Loaner vehicles available with appointment.",
  },
  departments: [
    { id: "sales", name: "Sales", description: "New & used vehicles, trade-ins", hours: "Mon-Sat 7am-7pm",
      targets: [
        { type: "ai_agent",  label: "Sales Inbound AI",  reference: "Emily",      available: "24/7",        status: "active" },
        { type: "extension", label: "Sales dept",        reference: "Ext. 100",   available: "dept_hours",  status: "active" },
        { type: "voicemail", label: "Sales voicemail",   reference: "VM-SALES",   available: "always",      status: "active" },
      ] },
    { id: "service", name: "Service", description: "Repair, maintenance, recalls", hours: "Mon-Fri 7am-6pm  •  Sat 8am-4pm",
      targets: [
        { type: "ai_agent",  label: "Service Inbound AI", reference: "Eric",      available: "24/7",        status: "active" },
        { type: "extension", label: "Service dept",       reference: "Ext. 200",  available: "dept_hours",  status: "active" },
        { type: "voicemail", label: "Service voicemail",  reference: "VM-SERVICE", available: "always",     status: "active" },
      ] },
    { id: "parts", name: "Parts", description: "Parts inquiries, accessories", hours: "Mon-Fri 8am-5pm",
      targets: [
        { type: "extension", label: "Parts dept",         reference: "Ext. 204",  available: "dept_hours",  status: "warning" },
      ] },
    { id: "finance", name: "Finance", description: "F&I, financing applications", hours: "Mon-Sat 9am-6pm",
      targets: [
        { type: "extension", label: "Finance dept",       reference: "Ext. 312",  available: "dept_hours",  status: "active" },
        { type: "voicemail", label: "Finance voicemail",  reference: "VM-FIN",    available: "always",      status: "active" },
      ] },
  ] as RoutingDepartment[],
  staff: [
    { id: "s-1", name: "Sam Patel",   role: "Service Advisor",   department: "Service", extension: "Ext. 215", languages: ["EN","ES"], sticky: 12 },
    { id: "s-2", name: "Dawn Reyes",  role: "Sales Manager",     department: "Sales",   extension: "Ext. 102", languages: ["EN","ES"], sticky: 4  },
    { id: "s-3", name: "Marcus Lee",  role: "Finance Director",  department: "Finance", extension: "Ext. 312", languages: ["EN"],      sticky: 0  },
    { id: "s-4", name: "Priya Singh", role: "Service Advisor",   department: "Service", extension: "Ext. 216", languages: ["EN","HI"], sticky: 18 },
    { id: "s-5", name: "Brian Cole",  role: "Parts Specialist",  department: "Parts",   extension: "Ext. 204", languages: ["EN"],      sticky: 0  },
    { id: "s-6", name: "Elena Cruz",  role: "BDC Manager",       department: "Sales",   extension: "Ext. 110", languages: ["EN","ES"], sticky: 6  },
  ],
}

// ============= KNOWLEDGE BASE =============
// Soft facts, FAQs, promotions, documents, bulletin, suggestions.
// This is what makes Riley sound like a real receptionist who knows the dealership.

export type QuickFactCategory = "amenities" | "policies" | "services" | "directions" | "other"

export interface QuickFact {
  id: string
  category: QuickFactCategory
  text: string
  addedBy: string
  addedAt: string
  timesReferenced: number
}

export const quickFacts: QuickFact[] = [
  { id: "qf-1", category: "amenities", text: "Lounge has free Starbucks coffee, complimentary snacks, and a kids' play area with TV and toys.",                addedBy: "Nidhi",  addedAt: "2026-04-12", timesReferenced: 47 },
  { id: "qf-2", category: "amenities", text: "Free Wi-Fi: network 'SpyneGuest', no password required.",                                                            addedBy: "Nidhi",  addedAt: "2026-04-12", timesReferenced: 84 },
  { id: "qf-3", category: "amenities", text: "Family room and ADA-accessible restrooms on the main floor.",                                                        addedBy: "Admin",  addedAt: "2026-04-12", timesReferenced: 12 },
  { id: "qf-4", category: "amenities", text: "Free valet parking in front lot during business hours. Overflow lot behind dealership.",                              addedBy: "Lakshya",addedAt: "2026-04-15", timesReferenced: 31 },
  { id: "qf-5", category: "policies",  text: "Loaner vehicles available for any service appointment over 2 hours · $0 with appointment · subject to availability.", addedBy: "Lakshya",addedAt: "2026-04-15", timesReferenced: 28 },
  { id: "qf-6", category: "policies",  text: "Shuttle service within 10 miles · free with service appointment · runs every 30 minutes.",                            addedBy: "Lakshya",addedAt: "2026-04-15", timesReferenced: 19 },
  { id: "qf-7", category: "services",  text: "Factory-certified technicians for Ford, Lincoln. Same-day oil change with no appointment Mon-Fri before 4pm.",        addedBy: "Admin",  addedAt: "2026-04-18", timesReferenced: 56 },
  { id: "qf-8", category: "services",  text: "Detail bay open Mon-Sat 8am-5pm. Full detail $189, express wash $24.",                                                addedBy: "Admin",  addedAt: "2026-04-22", timesReferenced: 18 },
  { id: "qf-9", category: "directions",text: "Located at the I-10 / Beltway 8 interchange · exit 757B · 2 minutes from Memorial Park.",                            addedBy: "Nidhi",  addedAt: "2026-04-12", timesReferenced: 42 },
  { id: "qf-10",category: "other",     text: "Spanish-speaking sales rep Maria available Tue-Sat. Maria is also the dealership's bilingual liaison.",              addedBy: "Nidhi",  addedAt: "2026-05-02", timesReferenced: 22 },
]

export interface FAQItem {
  id: string
  question: string
  answer: string
  category: "amenities" | "services" | "policies" | "directions" | "other"
  timesAnswered: number
  lastAnswered?: string
}

export const faqs: FAQItem[] = [
  { id: "faq-1", question: "Do you have a kids' play area?",        answer: "Yes — in the main lounge, near the showroom. TV, toys, and snacks. Free to use during your visit.",                  category: "amenities", timesAnswered: 38, lastAnswered: "Today" },
  { id: "faq-2", question: "What's your Wi-Fi?",                    answer: "Free Wi-Fi — network 'SpyneGuest', no password.",                                                                       category: "amenities", timesAnswered: 84, lastAnswered: "Today" },
  { id: "faq-3", question: "Do you offer loaner vehicles?",         answer: "Yes — for any service appointment over 2 hours. Free with appointment, subject to availability. Let me get you to Service to set it up.", category: "policies",  timesAnswered: 26, lastAnswered: "Yesterday" },
  { id: "faq-4", question: "Do you have a shuttle?",                answer: "Yes — free shuttle within 10 miles, running every 30 minutes. Available with any service appointment.",              category: "policies",  timesAnswered: 19, lastAnswered: "Today" },
  { id: "faq-5", question: "Where are you located?",                answer: "We're at the I-10 and Beltway 8 interchange — exit 757B. About 2 minutes from Memorial Park. Address: 2300 Auto Center Dr.", category: "directions",timesAnswered: 42, lastAnswered: "Today" },
  { id: "faq-6", question: "Do you speak Spanish?",                  answer: "Sí — Maria, our bilingual sales rep, is available Tuesday through Saturday. Would you like me to connect you?",     category: "other",     timesAnswered: 14, lastAnswered: "Today" },
  { id: "faq-7", question: "Can I just walk in for an oil change?", answer: "Yes — no appointment needed for oil changes, Monday through Friday before 4pm. Otherwise we'd recommend booking.",   category: "services",  timesAnswered: 31, lastAnswered: "Today" },
]

export type PromotionStatus = "active" | "scheduled" | "expired"
export type PromotionDept = "sales" | "service" | "parts" | "finance"

export interface Promotion {
  id: string
  title: string
  description: string
  department: PromotionDept
  startDate: string
  endDate: string
  status: PromotionStatus
  timesReferenced: number
}

export const promotions: Promotion[] = [
  { id: "p-1", title: "Memorial Day sales event", description: "Up to $2,500 off select 2026 F-150 models. Plus 0% APR for 60 months on qualified buyers.", department: "sales",   startDate: "May 22", endDate: "Jun 2",  status: "active",    timesReferenced: 18 },
  { id: "p-2", title: "Free brake inspection",     description: "Complimentary multi-point brake inspection through summer. Includes pad-life report.",            department: "service", startDate: "May 1",  endDate: "Aug 31", status: "active",    timesReferenced: 24 },
  { id: "p-3", title: "Trade-in bonus",            description: "Extra $1,000 over Kelley Blue Book value when you trade in toward a new F-150 Lightning.",       department: "sales",   startDate: "May 15", endDate: "Jun 15", status: "active",    timesReferenced: 11 },
  { id: "p-4", title: "Summer service bundle",     description: "Oil change + tire rotation + multi-point inspection for $89 (save $40).",                          department: "service", startDate: "Jun 1",  endDate: "Aug 31", status: "scheduled", timesReferenced: 0  },
  { id: "p-5", title: "Spring tire promo",          description: "Buy 3 tires, get the 4th free. Mountings included.",                                              department: "parts",   startDate: "Mar 1",  endDate: "May 31", status: "expired",   timesReferenced: 47 },
]

export type DocumentStatus = "processing" | "ready" | "error"

export interface KnowledgeDocument {
  id: string
  filename: string
  fileType: "pdf" | "docx" | "txt"
  sizeKb: number
  uploadedBy: string
  uploadedAt: string
  status: DocumentStatus
  chunkCount: number
  timesReferenced: number
}

export const documents: KnowledgeDocument[] = [
  { id: "doc-1", filename: "service-menu-2026.pdf",       fileType: "pdf",  sizeKb: 1240, uploadedBy: "Admin",   uploadedAt: "2026-04-08", status: "ready",      chunkCount: 47, timesReferenced: 89 },
  { id: "doc-2", filename: "dealer-handbook.pdf",          fileType: "pdf",  sizeKb: 2890, uploadedBy: "Admin",   uploadedAt: "2026-04-08", status: "ready",      chunkCount: 102, timesReferenced: 23 },
  { id: "doc-3", filename: "warranty-coverage-2026.pdf",  fileType: "pdf",  sizeKb: 680,  uploadedBy: "Nidhi",   uploadedAt: "2026-04-12", status: "ready",      chunkCount: 21, timesReferenced: 34 },
  { id: "doc-4", filename: "memorial-day-sale-terms.pdf", fileType: "pdf",  sizeKb: 320,  uploadedBy: "Lakshya", uploadedAt: "2026-05-20", status: "ready",      chunkCount: 8,  timesReferenced: 6  },
  { id: "doc-5", filename: "staff-bios-q2.docx",          fileType: "docx", sizeKb: 145,  uploadedBy: "Lakshya", uploadedAt: "2026-05-22", status: "processing", chunkCount: 0,  timesReferenced: 0  },
]

export interface BulletinItem {
  id: string
  message: string
  expiresAt: string
  postedBy: string
  postedAt: string
  active: boolean
}

export const bulletins: BulletinItem[] = [
  { id: "b-1", message: "Wednesday June 18: closing at 4pm for staff training. Service department closed. Sales open until 4pm.", expiresAt: "2026-06-19", postedBy: "Nidhi", postedAt: "2026-06-15", active: true },
  { id: "b-2", message: "New EV charger installed in lot 3 — let callers asking about EVs know we now have on-site charging.",     expiresAt: "2026-07-01", postedBy: "Admin", postedAt: "2026-06-10", active: true },
]

export interface KnowledgeSuggestion {
  id: string
  type: "unanswered_question" | "missing_fact" | "outdated_fact"
  text: string
  frequency: number
  suggestedAnswer?: string
  detectedAt: string
}

export const knowledgeSuggestions: KnowledgeSuggestion[] = [
  { id: "ks-1", type: "unanswered_question", text: "Callers asking: 'Do you take Apple Pay for service?'",                  frequency: 12, suggestedAnswer: "Yes, we accept Apple Pay, Google Pay, and all major credit cards.", detectedAt: "Last 7 days" },
  { id: "ks-2", type: "unanswered_question", text: "Callers asking: 'Are you open on Memorial Day?'",                       frequency: 8,  suggestedAnswer: "Add to bulletin: Closed Memorial Day. Open regular hours rest of week.",  detectedAt: "Last 7 days" },
  { id: "ks-3", type: "missing_fact",         text: "10 callers asked about EV charging — bulletin exists but not in FAQ.", frequency: 10, suggestedAnswer: "Promote bulletin item to a permanent FAQ entry.",                             detectedAt: "Last 14 days" },
  { id: "ks-4", type: "outdated_fact",        text: "'Spring tire promo' is still in active promotions but ended May 31.",  frequency: 0,  suggestedAnswer: "Archive promotion p-5.",                                                     detectedAt: "Yesterday" },
  { id: "ks-5", type: "unanswered_question", text: "Callers asking: 'Do you do trade-in appraisals over video?'",          frequency: 6,  suggestedAnswer: "Add as FAQ — yes, video appraisals available with Sales team.",            detectedAt: "Last 14 days" },
]

export interface SyncedPage {
  path: string
  title: string
  lastUpdated: string
  status: "synced" | "pending" | "error"
}

export interface PendingChange {
  id: string
  path: string
  summary: string
  detectedAt: string
}

export interface WebsiteSyncConfig {
  url: string
  enabled: boolean
  frequency: "hourly" | "daily" | "weekly"
  lastSyncedAt: string
  nextSyncAt: string
  status: "healthy" | "changes_pending" | "error"
  pagesIngested: number
  pagesPending: number
  pages: SyncedPage[]
  pendingChanges: PendingChange[]
}

export const websiteSync: WebsiteSyncConfig = {
  url: "https://spynemotors.com",
  enabled: true,
  frequency: "daily",
  lastSyncedAt: "Today at 4:00 AM",
  nextSyncAt: "Tomorrow at 4:00 AM",
  status: "changes_pending",
  pagesIngested: 18,
  pagesPending: 2,
  pendingChanges: [
    { id: "pc-1", path: "/services",  summary: "Detailing pricing updated · 3 lines changed", detectedAt: "Today at 4:02 AM" },
    { id: "pc-2", path: "/specials",  summary: "New Memorial Day banner added",               detectedAt: "Today at 4:02 AM" },
  ],
  pages: [
    { path: "/",          title: "Home",                          lastUpdated: "2026-06-12", status: "synced"  },
    { path: "/about",     title: "About Spyne Motors",            lastUpdated: "2026-05-28", status: "synced"  },
    { path: "/inventory", title: "Inventory",                     lastUpdated: "2026-06-23", status: "synced"  },
    { path: "/services",  title: "Service & Repair",              lastUpdated: "2026-06-24", status: "pending" },
    { path: "/specials",  title: "Specials & Promotions",         lastUpdated: "2026-06-24", status: "pending" },
    { path: "/financing", title: "Financing",                     lastUpdated: "2026-05-10", status: "synced"  },
    { path: "/contact",   title: "Contact & Hours",               lastUpdated: "2026-04-30", status: "synced"  },
    { path: "/careers",   title: "Careers",                       lastUpdated: "2026-03-15", status: "synced"  },
  ],
}

// ============= BUSINESS HOURS (per-dept, per-day) =============
export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"
export const DAYS: { key: DayKey; label: string }[] = [
  { key: "mon", label: "Mon" }, { key: "tue", label: "Tue" }, { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" }, { key: "fri", label: "Fri" }, { key: "sat", label: "Sat" }, { key: "sun", label: "Sun" },
]

export interface DayHours {
  open: boolean
  start: string  // "07:00"
  end: string    // "19:00"
}
export type WeeklyHours = Record<DayKey, DayHours>

export const defaultSalesHours: WeeklyHours = {
  mon: { open: true, start: "07:00", end: "19:00" },
  tue: { open: true, start: "07:00", end: "19:00" },
  wed: { open: true, start: "07:00", end: "19:00" },
  thu: { open: true, start: "07:00", end: "19:00" },
  fri: { open: true, start: "07:00", end: "19:00" },
  sat: { open: true, start: "08:00", end: "17:00" },
  sun: { open: false, start: "00:00", end: "00:00" },
}

export interface Holiday {
  id: string
  date: string         // ISO
  label: string
  closure: "full" | "early" | "open"
  earlyCloseTime?: string
}
export const holidays: Holiday[] = [
  { id: "h1", date: "2026-07-04", label: "Independence Day",   closure: "full" },
  { id: "h2", date: "2026-09-01", label: "Labor Day",          closure: "full" },
  { id: "h3", date: "2026-11-26", label: "Thanksgiving",       closure: "full" },
  { id: "h4", date: "2026-12-24", label: "Christmas Eve",      closure: "early", earlyCloseTime: "14:00" },
  { id: "h5", date: "2026-12-25", label: "Christmas Day",      closure: "full" },
  { id: "h6", date: "2026-12-31", label: "New Year's Eve",     closure: "early", earlyCloseTime: "16:00" },
]

// ============= TELEPHONY =============
export type RecordingConsentMode = "single_party" | "two_party_explicit" | "two_party_disclosure"
export interface TelephonyConfig {
  mainNumber: string
  provider: "twilio" | "ringcentral" | "vonage"
  forwardingMode: "forward_existing" | "tracking_number"
  callerIdName: string
  recordingEnabled: boolean
  consentMode: RecordingConsentMode
  consentDisclosure: string
  retentionDays: number
  voicemailBoxes: { id: string; label: string; reachable: boolean }[]
  twoPartyConsentStates: string[]
}

export const telephonyConfig: TelephonyConfig = {
  mainNumber: "+1 (713) 555-0100",
  provider: "twilio",
  forwardingMode: "forward_existing",
  callerIdName: "SPYNE MOTORS",
  recordingEnabled: true,
  consentMode: "two_party_disclosure",
  consentDisclosure: "This call may be recorded for quality and training purposes.",
  retentionDays: 90,
  voicemailBoxes: [
    { id: "vm-sales",   label: "Sales voicemail",   reachable: true },
    { id: "vm-service", label: "Service voicemail", reachable: true },
    { id: "vm-finance", label: "Finance voicemail", reachable: true },
    { id: "vm-parts",   label: "Parts voicemail",   reachable: false },
  ],
  twoPartyConsentStates: ["CA", "CT", "FL", "IL", "MD", "MA", "MT", "NV", "NH", "PA", "WA"],
}

// ============= PERSONA =============
export type VoiceId = "riley-neutral-us" | "sarah-warm-us" | "james-calm-uk" | "marcus-deep-us"
export interface PersonaConfig {
  agentName: string
  voiceId: VoiceId
  voiceLabel: string
  languages: string[]
  greetingScript: string
  closingScript: string
  toneNotes: string
  clarificationMaxTurns: number
  escalationKeywords: string[]
  promptVersion: string
  lastEditedBy: string
  lastEditedAt: string
}

export const personaConfig: PersonaConfig = {
  agentName: "Riley",
  voiceId: "riley-neutral-us",
  voiceLabel: "Riley · neutral, US English",
  languages: ["English", "Spanish"],
  greetingScript: "Thanks for calling Spyne Motors, this is Riley. How can I help?",
  closingScript: "Thanks for calling Spyne Motors — have a great day.",
  toneNotes: "Warm, efficient, brief. Acknowledge first, then act. Sentences under 15 words.",
  clarificationMaxTurns: 1,
  escalationKeywords: ["manager", "speak to a person", "supervisor", "complaint", "lawyer", "BBB"],
  promptVersion: "v12",
  lastEditedBy: "Nidhi",
  lastEditedAt: "2 days ago",
}

export const voiceOptions: { id: VoiceId; label: string; description: string }[] = [
  { id: "riley-neutral-us", label: "Riley", description: "Neutral · US English" },
  { id: "sarah-warm-us",    label: "Sarah", description: "Warm · US English" },
  { id: "james-calm-uk",    label: "James", description: "Calm · UK English" },
  { id: "marcus-deep-us",   label: "Marcus", description: "Deep · US English" },
]

// ============= WEBHOOKS / INTEGRATIONS =============
export interface WebhookConfig {
  id: string
  label: string
  url: string
  events: string[]
  enabled: boolean
  lastDelivery: string
  status: "healthy" | "degraded" | "failing"
  successRate24h: number
}

export const webhooks: WebhookConfig[] = [
  { id: "wh-1", label: "VinSolutions CRM (sales)",  url: "https://api.vinsolutions.com/leads/intake", events: ["call.completed", "lead.created", "appointment.scheduled"], enabled: true,  lastDelivery: "2 min ago",  status: "healthy",  successRate24h: 99.8 },
  { id: "wh-2", label: "Reynolds DMS (service)",    url: "https://reyrey.example/service-events",      events: ["call.completed", "action_item.created"],                   enabled: true,  lastDelivery: "12 min ago", status: "healthy",  successRate24h: 99.4 },
  { id: "wh-3", label: "Slack · #BDC-escalations", url: "https://hooks.slack.com/services/T0/B0/xyz", events: ["action_item.created"],                                       enabled: true,  lastDelivery: "1 hr ago",   status: "degraded", successRate24h: 87.2 },
]

// ============= CHANGE HISTORY =============
export interface ConfigChange {
  id: string
  version: string
  section: "profile" | "departments" | "staff" | "hours" | "telephony" | "persona" | "webhooks"
  summary: string
  changedBy: string
  changedAt: string
  diff: string[]
}

export const configHistory: ConfigChange[] = [
  { id: "c1", version: "v4", section: "departments", summary: "Reordered Sales fallback chain — AI first, then extension", changedBy: "Lakshya", changedAt: "Today · 2:14 PM",  diff: ["+ Move Emily (Sales Inbound AI) to position 1", "− Demote Ext. 100 to position 2"] },
  { id: "c2", version: "v3", section: "staff",       summary: "Added Maria as Spanish-speaking BDC liaison",                changedBy: "Nidhi",   changedAt: "Yesterday · 5:48 PM", diff: ["+ Add Maria Cruz, Ext. 118, EN/ES"] },
  { id: "c3", version: "v2", section: "hours",       summary: "Extended Saturday service hours to 5pm",                     changedBy: "Admin",   changedAt: "3 days ago",          diff: ["~ Sat service end: 16:00 → 17:00"] },
  { id: "c4", version: "v1", section: "profile",     summary: "Initial configuration",                                       changedBy: "Admin",   changedAt: "3 weeks ago",         diff: ["+ Initial commit"] },
]

// ============= RBAC SNAPSHOT (read-only display) =============
export interface RoleAccess {
  role: string
  canEdit: string[]
  canView: string[]
}
export const roleAccess: RoleAccess[] = [
  { role: "Admin",         canEdit: ["all"], canView: ["all"] },
  { role: "BDC Manager",   canEdit: ["bulletin", "action_items"], canView: ["all"] },
  { role: "Sales Manager", canEdit: ["sticky_routing"], canView: ["calls", "action_items", "overview"] },
  { role: "Service Manager", canEdit: ["sticky_routing"], canView: ["calls", "action_items", "overview"] },
  { role: "Spyne CSM",     canEdit: ["persona", "knowledge", "qa"], canView: ["all"] },
]
