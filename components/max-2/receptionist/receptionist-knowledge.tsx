"use client"

import { useState } from "react"
import { MaterialSymbol } from "@/components/max-2/material-symbol"
import { SpyneLineTab, SpyneLineTabBadge, SpyneLineTabStrip } from "@/components/max-2/spyne-line-tabs"
import { SpyneRoiKpiMetricCell, SpyneRoiKpiStrip } from "@/components/max-2/spyne-roi-kpi-strip"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { max2Classes, spyneComponentClasses, spyneSalesLayout } from "@/lib/design-system/max-2"
import { cn } from "@/lib/utils"
import {
  quickFacts as seedQuickFacts,
  faqs as seedFaqs,
  promotions as seedPromotions,
  documents as seedDocuments,
  bulletins as seedBulletins,
  knowledgeSuggestions,
  websiteSync as seedWebsiteSync,
  type QuickFact,
  type QuickFactCategory,
  type FAQItem,
  type Promotion,
  type PromotionStatus,
  type KnowledgeDocument,
  type BulletinItem,
  type KnowledgeSuggestion,
  type WebsiteSyncConfig,
  type PendingChange,
} from "./receptionist-data"

type Tab = "facts" | "faq" | "promotions" | "documents" | "website" | "bulletin" | "suggestions"

const categoryMeta: Record<QuickFactCategory, { label: string; symbol: string }> = {
  amenities:  { label: "Amenities",  symbol: "weekend" },
  policies:   { label: "Policies",   symbol: "policy" },
  services:   { label: "Services",   symbol: "build" },
  directions: { label: "Directions", symbol: "near_me" },
  other:      { label: "Other",      symbol: "more_horiz" },
}

export function ReceptionistKnowledge() {
  const [tab, setTab] = useState<Tab>("facts")

  // State for each section — interactive demo
  const [quickFacts, setQuickFacts] = useState(seedQuickFacts)
  const [faqs, setFaqs] = useState(seedFaqs)
  const [promotions, setPromotions] = useState(seedPromotions)
  const [bulletins, setBulletins] = useState(seedBulletins)
  const [documents, setDocuments] = useState(seedDocuments)
  const [suggestions, setSuggestions] = useState(knowledgeSuggestions)
  const [websiteSync, setWebsiteSync] = useState<WebsiteSyncConfig>(seedWebsiteSync)
  const [toast, setToast] = useState<string | null>(null)
  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2400) }

  // Page-level stats
  const totalSources = quickFacts.length + faqs.length + promotions.filter((p) => p.status === "active").length + documents.filter((d) => d.status === "ready").length
  const totalReferenced = [...quickFacts, ...faqs, ...promotions, ...documents].reduce((s, x: { timesReferenced?: number; timesAnswered?: number }) => s + (x.timesReferenced ?? x.timesAnswered ?? 0), 0)
  const pendingSuggestions = suggestions.length
  const activeBulletins = bulletins.filter((b) => b.active).length

  return (
    <div className={spyneSalesLayout.pageStack}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className={max2Classes.pageTitle}>Knowledge</h1>
          <p className={max2Classes.pageDescription}>What Riley knows about your dealership. The agent draws from these sources before every answer — never fabricates.</p>
        </div>
      </div>

      {/* KPI strip — knowledge health at a glance */}
      <SpyneRoiKpiStrip gridClassName="lg:grid-cols-4">
        <SpyneRoiKpiMetricCell label="Knowledge sources" value={totalSources.toString()} sub="facts · FAQs · promos · docs" status="good" cellClassName="px-3 py-3" />
        <SpyneRoiKpiMetricCell label="Times referenced (30d)" value={totalReferenced.toLocaleString()} sub="by Riley across all calls" status="good" cellClassName="px-3 py-3" />
        <SpyneRoiKpiMetricCell label="Active bulletins" value={activeBulletins.toString()} sub="time-bound overrides" status="good" cellClassName="px-3 py-3" />
        <SpyneRoiKpiMetricCell label="Suggestions from VINI" value={pendingSuggestions.toString()} sub="gaps detected from real calls" status={pendingSuggestions > 0 ? "watch" : "good"} cellClassName="px-3 py-3" valueClassName={pendingSuggestions > 0 ? "text-spyne-primary" : undefined} />
      </SpyneRoiKpiStrip>

      {/* Sub-tabs */}
      <SpyneLineTabStrip>
        <SpyneLineTab active={tab === "facts"} onClick={() => setTab("facts")}>
          <MaterialSymbol name="bolt" size={14} /> Quick Facts <SpyneLineTabBadge>{quickFacts.length}</SpyneLineTabBadge>
        </SpyneLineTab>
        <SpyneLineTab active={tab === "faq"} onClick={() => setTab("faq")}>
          <MaterialSymbol name="quiz" size={14} /> FAQ <SpyneLineTabBadge>{faqs.length}</SpyneLineTabBadge>
        </SpyneLineTab>
        <SpyneLineTab active={tab === "promotions"} onClick={() => setTab("promotions")}>
          <MaterialSymbol name="campaign" size={14} /> Promotions <SpyneLineTabBadge>{promotions.filter((p) => p.status === "active").length}</SpyneLineTabBadge>
        </SpyneLineTab>
        <SpyneLineTab active={tab === "documents"} onClick={() => setTab("documents")}>
          <MaterialSymbol name="description" size={14} /> Documents <SpyneLineTabBadge>{documents.length}</SpyneLineTabBadge>
        </SpyneLineTab>
        <SpyneLineTab active={tab === "website"} onClick={() => setTab("website")}>
          <MaterialSymbol name="language" size={14} /> Website Sync
        </SpyneLineTab>
        <SpyneLineTab active={tab === "bulletin"} onClick={() => setTab("bulletin")}>
          <MaterialSymbol name="notifications_active" size={14} /> Bulletin <SpyneLineTabBadge>{activeBulletins}</SpyneLineTabBadge>
        </SpyneLineTab>
        <SpyneLineTab active={tab === "suggestions"} onClick={() => setTab("suggestions")}>
          <MaterialSymbol name="auto_awesome" size={14} /> Suggestions <SpyneLineTabBadge>{pendingSuggestions}</SpyneLineTabBadge>
        </SpyneLineTab>
      </SpyneLineTabStrip>

      {tab === "facts"       && <QuickFactsSection facts={quickFacts} setFacts={setQuickFacts} />}
      {tab === "faq"         && <FaqSection faqs={faqs} setFaqs={setFaqs} />}
      {tab === "promotions"  && <PromotionsSection promotions={promotions} setPromotions={setPromotions} />}
      {tab === "documents"   && <DocumentsSection documents={documents} setDocuments={setDocuments} />}
      {tab === "website"     && <WebsiteSection config={websiteSync} setConfig={setWebsiteSync} />}
      {tab === "bulletin"    && <BulletinSection bulletins={bulletins} setBulletins={setBulletins} />}
      {tab === "suggestions" && (
        <SuggestionsSection
          suggestions={suggestions}
          setSuggestions={setSuggestions}
          onAddFact={(text) => setQuickFacts([
            { id: `qf-${Date.now()}`, category: "policies", text, addedBy: "VINI suggestion", addedAt: "Just now", timesReferenced: 0 },
            ...quickFacts,
          ])}
          onAddFaq={(question, answer) => setFaqs([
            { id: `faq-${Date.now()}`, question, answer, category: "other", timesAnswered: 0, lastAnswered: "Just now" },
            ...faqs,
          ])}
          onJumpTab={setTab}
        />
      )}

      {toast && (
        <div className="fixed left-1/2 bottom-6 z-[200] flex -translate-x-1/2 items-center gap-1.5 rounded-lg px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-lg" style={{ background: "var(--spyne-text-primary)" }}>
          <MaterialSymbol name="check_circle" size={14} /> {toast}
        </div>
      )}
    </div>
  )
}

// ============= QUICK FACTS =============
function QuickFactsSection({ facts, setFacts }: { facts: QuickFact[]; setFacts: (f: QuickFact[]) => void }) {
  const [filter, setFilter] = useState<QuickFactCategory | "all">("all")
  const [newFact, setNewFact] = useState("")
  const [newCategory, setNewCategory] = useState<QuickFactCategory>("amenities")

  const filtered = filter === "all" ? facts : facts.filter((f) => f.category === filter)

  const addFact = () => {
    if (!newFact.trim()) return
    setFacts([
      { id: `qf-${Date.now()}`, category: newCategory, text: newFact.trim(), addedBy: "You", addedAt: "Just now", timesReferenced: 0 },
      ...facts,
    ])
    setNewFact("")
  }
  const removeFact = (id: string) => setFacts(facts.filter((f) => f.id !== id))

  return (
    <div className="flex flex-col gap-4">
      <div className="spyne-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <MaterialSymbol name="bolt" size={16} className="text-spyne-brand" />
          <h3 className={cn(spyneComponentClasses.cardTitle, "m-0")}>Add a quick fact</h3>
        </div>
        <p className="text-[12px] text-spyne-text-muted mb-3">
          Anything a great human receptionist would just &ldquo;know.&rdquo; The agent uses these as background context for every call.
        </p>
        <div className="flex gap-2">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as QuickFactCategory)}
            className="rounded-lg border border-spyne-border bg-spyne-surface px-3 py-2 text-[13px] focus:border-spyne-brand focus:outline-none"
          >
            {Object.entries(categoryMeta).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <input
            value={newFact}
            onChange={(e) => setNewFact(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addFact()}
            placeholder="e.g. We have free Starbucks coffee in the lounge..."
            className="flex-1 rounded-lg border border-spyne-border bg-spyne-surface px-3 py-2 text-[13px] focus:border-spyne-brand focus:outline-none"
          />
          <button type="button" onClick={addFact} className={cn(spyneComponentClasses.btnPrimaryMd, "flex items-center gap-1")}>
            <MaterialSymbol name="add" size={14} /> Add
          </button>
        </div>
      </div>

      <div className="spyne-card overflow-hidden">
        <div className="border-b border-spyne-border px-5 py-3 flex items-center gap-4">
          <div className="flex-1">
            <h3 className={cn(spyneComponentClasses.cardTitle, "m-0")}>All quick facts <span className="text-spyne-text-muted font-normal">· {facts.length}</span></h3>
          </div>
          <div className="flex gap-1.5">
            <FilterChip label="All" active={filter === "all"} onClick={() => setFilter("all")} count={facts.length} />
            {Object.entries(categoryMeta).map(([k, v]) => (
              <FilterChip key={k} label={v.label} active={filter === k} onClick={() => setFilter(k as QuickFactCategory)} count={facts.filter((f) => f.category === k).length} />
            ))}
          </div>
        </div>
        <div>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-spyne-text-muted">No facts in this category yet.</div>
          ) : filtered.map((f) => (
            <div key={f.id} className="border-b border-spyne-border last:border-b-0 flex items-start gap-3 px-5 py-3.5 hover:bg-spyne-surface-hover transition-colors group">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-spyne-brand-subtle text-spyne-brand">
                <MaterialSymbol name={categoryMeta[f.category].symbol} size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] leading-relaxed">{f.text}</div>
                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-spyne-text-muted">
                  <span><MaterialSymbol name="person" size={11} /> {f.addedBy} · {f.addedAt}</span>
                  {f.timesReferenced > 0 && (
                    <span className="inline-flex items-center gap-1 text-spyne-success font-semibold">
                      <MaterialSymbol name="trending_up" size={11} /> Referenced {f.timesReferenced}× in 30d
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => removeFact(f.id)} className="opacity-0 group-hover:opacity-100 text-spyne-text-muted hover:text-spyne-error transition-opacity">
                <MaterialSymbol name="delete_outline" size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============= FAQ =============
function FaqSection({ faqs, setFaqs }: { faqs: FAQItem[]; setFaqs: (f: FAQItem[]) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const toggle = (id: string) => setExpanded(expanded === id ? null : id)
  const remove = (id: string) => setFaqs(faqs.filter((f) => f.id !== id))
  const handleAdd = (item: Omit<FAQItem, "id" | "timesAnswered" | "lastAnswered">) => {
    setFaqs([
      { id: `faq-${Date.now()}`, ...item, timesAnswered: 0, lastAnswered: "Just now" },
      ...faqs,
    ])
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="spyne-card p-4 flex items-center gap-3 bg-spyne-brand-subtle border-spyne-brand/20">
        <MaterialSymbol name="info" size={18} className="text-spyne-brand" />
        <div className="text-[13px] flex-1">
          <strong>Q&amp;A pairs Riley delivers verbatim.</strong> Use this when wording matters — legal disclaimers, exact warranty terms, branded responses.
        </div>
        <button type="button" onClick={() => setDialogOpen(true)} className={cn(spyneComponentClasses.btnPrimaryMd, "flex items-center gap-1")}>
          <MaterialSymbol name="add" size={14} /> Add FAQ
        </button>
        <AddFaqDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleAdd} />
      </div>

      <div className="spyne-card overflow-hidden">
        {faqs.map((f) => (
          <div key={f.id} className="border-b border-spyne-border last:border-b-0">
            <button
              type="button"
              onClick={() => toggle(f.id)}
              className="w-full flex items-start gap-3 px-5 py-3.5 hover:bg-spyne-surface-hover transition-colors text-left"
            >
              <MaterialSymbol name="quiz" size={16} className="mt-0.5 text-spyne-brand shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-[14px]">{f.question}</div>
                {expanded === f.id && (
                  <div className="mt-2.5 bg-spyne-surface-hover rounded-md p-3 border-l-2 border-spyne-brand text-[13px] italic">
                    &ldquo;{f.answer}&rdquo;
                  </div>
                )}
                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-spyne-text-muted">
                  <span className="rounded bg-spyne-border px-1.5 py-0.5">{f.category}</span>
                  {f.timesAnswered > 0 && (
                    <span className="inline-flex items-center gap-1 text-spyne-success font-semibold">
                      <MaterialSymbol name="trending_up" size={11} /> Used {f.timesAnswered}× · last {f.lastAnswered}
                    </span>
                  )}
                </div>
              </div>
              <MaterialSymbol name={expanded === f.id ? "expand_less" : "expand_more"} size={20} className="text-spyne-text-muted shrink-0" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============= PROMOTIONS =============
function PromotionsSection({ promotions, setPromotions }: { promotions: Promotion[]; setPromotions: (p: Promotion[]) => void }) {
  const [statusFilter, setStatusFilter] = useState<PromotionStatus | "all">("active")
  const filtered = statusFilter === "all" ? promotions : promotions.filter((p) => p.status === statusFilter)

  const counts = {
    all: promotions.length,
    active: promotions.filter((p) => p.status === "active").length,
    scheduled: promotions.filter((p) => p.status === "scheduled").length,
    expired: promotions.filter((p) => p.status === "expired").length,
  }

  const [dialogOpen, setDialogOpen] = useState(false)
  const archive = (id: string) => setPromotions(promotions.map((p) => p.id === id ? { ...p, status: "expired" as PromotionStatus } : p))
  const handleAdd = (item: Omit<Promotion, "id" | "timesReferenced">) => {
    setPromotions([
      { id: `promo-${Date.now()}`, ...item, timesReferenced: 0 } as Promotion,
      ...promotions,
    ])
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="spyne-card p-4 flex items-center gap-3">
        <MaterialSymbol name="campaign" size={18} className="text-spyne-brand" />
        <div className="text-[13px] flex-1">
          <strong>Time-bound campaigns Riley mentions to relevant callers.</strong> Auto-expire on end date.
        </div>
        <button type="button" onClick={() => setDialogOpen(true)} className={cn(spyneComponentClasses.btnPrimaryMd, "flex items-center gap-1")}>
          <MaterialSymbol name="add" size={14} /> New promotion
        </button>
        <AddPromotionDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleAdd} />
      </div>

      <div className="flex gap-2">
        <FilterChip label="Active" active={statusFilter === "active"} onClick={() => setStatusFilter("active")} count={counts.active} />
        <FilterChip label="Scheduled" active={statusFilter === "scheduled"} onClick={() => setStatusFilter("scheduled")} count={counts.scheduled} />
        <FilterChip label="Expired" active={statusFilter === "expired"} onClick={() => setStatusFilter("expired")} count={counts.expired} />
        <FilterChip label="All" active={statusFilter === "all"} onClick={() => setStatusFilter("all")} count={counts.all} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map((p) => (
          <div key={p.id} className="spyne-card p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <StatusBadge status={p.status} />
                <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-spyne-text-muted">{p.department}</span>
              </div>
              {p.status === "active" && (
                <button onClick={() => archive(p.id)} className="text-[11px] text-spyne-text-muted hover:text-spyne-error">Archive</button>
              )}
            </div>
            <div className="font-semibold text-[14px] mb-1">{p.title}</div>
            <p className="text-[12px] text-spyne-text-muted leading-relaxed mb-2.5">{p.description}</p>
            <div className="flex items-center justify-between text-[11px] text-spyne-text-muted pt-2 border-t border-spyne-border">
              <span><MaterialSymbol name="event" size={11} /> {p.startDate} → {p.endDate}</span>
              <span><MaterialSymbol name="trending_up" size={11} /> {p.timesReferenced}× referenced</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============= DOCUMENTS =============
function DocumentsSection({ documents, setDocuments }: { documents: KnowledgeDocument[]; setDocuments: (d: KnowledgeDocument[]) => void }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const handleAdd = (item: { filename: string; fileType: KnowledgeDocument["fileType"]; sizeKb: number }) => {
    setDocuments([
      { id: `doc-${Date.now()}`, ...item, uploadedBy: "You", uploadedAt: "Just now", status: "processing", chunkCount: 0 } as KnowledgeDocument,
      ...documents,
    ])
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="spyne-card p-4 flex items-center gap-3">
        <MaterialSymbol name="upload_file" size={18} className="text-spyne-brand" />
        <div className="text-[13px] flex-1">
          <strong>Upload PDFs / Word docs to enrich Riley's knowledge.</strong> Parsed into searchable chunks. Riley cites the source.
        </div>
        <button type="button" onClick={() => setDialogOpen(true)} className={cn(spyneComponentClasses.btnPrimaryMd, "flex items-center gap-1")}>
          <MaterialSymbol name="upload" size={14} /> Upload document
        </button>
        <UploadDocumentDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleAdd} />
      </div>

      <div className="spyne-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-spyne-border bg-spyne-surface-hover text-[11px] font-bold uppercase tracking-[0.04em] text-spyne-text-muted">
              <th className="text-left px-5 py-3">Filename</th>
              <th className="text-left px-5 py-3">Type</th>
              <th className="text-left px-5 py-3">Size</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="text-left px-5 py-3">Chunks</th>
              <th className="text-left px-5 py-3">Used</th>
              <th className="text-left px-5 py-3">Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((d) => (
              <tr key={d.id} className="border-b border-spyne-border last:border-b-0 hover:bg-spyne-surface-hover text-[13px]">
                <td className="px-5 py-3 font-semibold flex items-center gap-2">
                  <MaterialSymbol name="picture_as_pdf" size={16} className="text-spyne-error" />
                  {d.filename}
                </td>
                <td className="px-5 py-3 text-spyne-text-muted uppercase font-mono text-[11px]">{d.fileType}</td>
                <td className="px-5 py-3 text-spyne-text-muted tabular-nums">{d.sizeKb < 1024 ? `${d.sizeKb} KB` : `${(d.sizeKb/1024).toFixed(1)} MB`}</td>
                <td className="px-5 py-3">
                  {d.status === "ready" && <Pill tone="success">Ready</Pill>}
                  {d.status === "processing" && <Pill tone="warning">Processing</Pill>}
                  {d.status === "error" && <Pill tone="error">Error</Pill>}
                </td>
                <td className="px-5 py-3 text-spyne-text-muted tabular-nums">{d.chunkCount}</td>
                <td className="px-5 py-3 tabular-nums">{d.timesReferenced > 0 ? `${d.timesReferenced}×` : "—"}</td>
                <td className="px-5 py-3 text-spyne-text-muted text-[12px]">{d.uploadedBy} · {d.uploadedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============= WEBSITE SYNC =============
function WebsiteSection({ config, setConfig }: { config: WebsiteSyncConfig; setConfig: (c: WebsiteSyncConfig) => void }) {
  const [editingSource, setEditingSource] = useState(false)
  const [draftUrl, setDraftUrl] = useState(config.url)
  const [draftFreq, setDraftFreq] = useState(config.frequency)
  const [pageFilter, setPageFilter] = useState("")
  const [syncing, setSyncing] = useState(false)

  const startEditSource = () => { setDraftUrl(config.url); setDraftFreq(config.frequency); setEditingSource(true) }
  const cancelEditSource = () => setEditingSource(false)
  const saveSource = () => {
    setConfig({ ...config, url: draftUrl.trim(), frequency: draftFreq })
    setEditingSource(false)
  }
  const toggleEnabled = () => setConfig({ ...config, enabled: !config.enabled })
  const syncNow = () => {
    setSyncing(true)
    setTimeout(() => {
      setSyncing(false)
      setConfig({ ...config, lastSyncedAt: "Just now" })
    }, 1200)
  }
  const approveChange = (id: string) => {
    const change = config.pendingChanges.find((p) => p.id === id)
    if (!change) return
    setConfig({
      ...config,
      pendingChanges: config.pendingChanges.filter((p) => p.id !== id),
      pagesPending: Math.max(0, config.pagesPending - 1),
      pages: config.pages.map((p) => p.path === change.path ? { ...p, status: "synced", lastUpdated: "Just now" } : p),
      status: config.pendingChanges.length - 1 === 0 ? "healthy" : config.status,
    })
  }
  const rejectChange = (id: string) => {
    setConfig({
      ...config,
      pendingChanges: config.pendingChanges.filter((p) => p.id !== id),
      pagesPending: Math.max(0, config.pagesPending - 1),
      status: config.pendingChanges.length - 1 === 0 ? "healthy" : config.status,
    })
  }
  const approveAll = () => {
    const pendingPaths = new Set(config.pendingChanges.map((c) => c.path))
    setConfig({
      ...config,
      pendingChanges: [],
      pagesPending: 0,
      pages: config.pages.map((p) => pendingPaths.has(p.path) ? { ...p, status: "synced", lastUpdated: "Just now" } : p),
      status: "healthy",
    })
  }

  const freqLabel = (f: WebsiteSyncConfig["frequency"]) => f === "hourly" ? "Hourly" : f === "daily" ? "Daily" : "Weekly"
  const statusBadge = config.status === "healthy"
    ? { tone: "success" as const, label: "Healthy" }
    : config.status === "changes_pending"
      ? { tone: "warning" as const, label: `${config.pendingChanges.length} pending` }
      : { tone: "error" as const, label: "Sync error" }

  const filteredPages = config.pages.filter((p) =>
    !pageFilter.trim() ||
    p.path.toLowerCase().includes(pageFilter.toLowerCase()) ||
    p.title.toLowerCase().includes(pageFilter.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-4">
      {/* SOURCE */}
      <div className="spyne-card overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-spyne-border px-5 py-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-spyne-brand-subtle text-spyne-brand flex items-center justify-center shrink-0">
              <MaterialSymbol name="language" size={18} />
            </div>
            <div className="min-w-0">
              <h3 className={cn(spyneComponentClasses.cardTitle, "m-0")}>Website source</h3>
              <p className="text-[12px] text-spyne-text-muted mt-0.5">Riley auto-pulls from this site. About, Services, Hours, and Contact are treated as canonical.</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold",
              statusBadge.tone === "success" && "bg-spyne-success-subtle text-spyne-success",
              statusBadge.tone === "warning" && "bg-spyne-warning-subtle text-[var(--spyne-warning-ink)]",
              statusBadge.tone === "error"   && "bg-spyne-error-subtle text-spyne-error",
            )}>
              <MaterialSymbol name={statusBadge.tone === "success" ? "check_circle" : statusBadge.tone === "warning" ? "warning" : "error"} size={12} />
              {statusBadge.label}
            </span>
            {!editingSource && (
              <button type="button" onClick={startEditSource} className={cn(spyneComponentClasses.btnSecondaryMd, "flex items-center gap-1.5")}>
                <MaterialSymbol name="edit" size={13} /> Edit
              </button>
            )}
          </div>
        </div>

        <div className="px-5 py-4">
          {!editingSource ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.04em] text-spyne-text-muted mb-1">URL</div>
                <a href={config.url} target="_blank" rel="noreferrer" className="text-[13px] font-mono text-spyne-brand hover:underline">
                  {config.url}
                </a>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.04em] text-spyne-text-muted mb-1">Sync</div>
                <div className="text-[13px] font-semibold flex items-center gap-2">
                  {config.enabled ? <Pill tone="success">Enabled</Pill> : <Pill tone="neutral">Paused</Pill>}
                  <button onClick={toggleEnabled} className="text-[11px] font-semibold text-spyne-brand hover:underline">
                    {config.enabled ? "Pause" : "Resume"}
                  </button>
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.04em] text-spyne-text-muted mb-1">Frequency</div>
                <div className="text-[13px] font-semibold">{freqLabel(config.frequency)}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.04em] text-spyne-text-muted mb-1">Next run</div>
                <div className="text-[13px] font-semibold">{config.enabled ? config.nextSyncAt : "Paused"}</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.04em] text-spyne-text-muted">URL</label>
                <input
                  value={draftUrl}
                  onChange={(e) => setDraftUrl(e.target.value)}
                  placeholder="https://your-dealership.com"
                  className="w-full rounded-lg border border-spyne-border bg-spyne-surface px-3 py-2.5 text-[13px] font-mono focus:border-spyne-brand focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.04em] text-spyne-text-muted">Frequency</label>
                <select
                  value={draftFreq}
                  onChange={(e) => setDraftFreq(e.target.value as WebsiteSyncConfig["frequency"])}
                  className="w-full rounded-lg border border-spyne-border bg-spyne-surface px-3 py-2.5 text-[13px] focus:border-spyne-brand focus:outline-none"
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {editingSource && (
          <div className="flex items-center justify-end gap-2 border-t border-spyne-border bg-spyne-surface-hover px-5 py-3">
            <button type="button" onClick={cancelEditSource} className={spyneComponentClasses.btnSecondaryMd}>Cancel</button>
            <button type="button" onClick={saveSource} className={spyneComponentClasses.btnPrimaryMd} disabled={!draftUrl.trim()}>Save changes</button>
          </div>
        )}
      </div>

      {/* STATUS */}
      <SpyneRoiKpiStrip gridClassName="lg:grid-cols-4">
        <SpyneRoiKpiMetricCell label="Last sync"       value={syncing ? "Syncing…" : config.lastSyncedAt} sub={syncing ? "fetching pages" : "auto-pulled"} status={syncing ? "watch" : "good"} cellClassName="px-3 py-3" />
        <SpyneRoiKpiMetricCell label="Pages indexed"   value={config.pagesIngested.toString()} sub="canonical sources" status="good" cellClassName="px-3 py-3" />
        <SpyneRoiKpiMetricCell label="Pending changes" value={config.pendingChanges.length.toString()} sub={config.pendingChanges.length === 0 ? "all caught up" : "need review"} status={config.pendingChanges.length > 0 ? "watch" : "good"} cellClassName="px-3 py-3" />
        <div className="flex items-center justify-end px-3 py-3">
          <button
            type="button"
            onClick={syncNow}
            disabled={syncing || !config.enabled}
            className={cn(spyneComponentClasses.btnPrimaryMd, "flex items-center gap-1.5", (syncing || !config.enabled) && "opacity-60 cursor-not-allowed")}
          >
            <MaterialSymbol name="refresh" size={14} className={syncing ? "animate-spin" : undefined} />
            {syncing ? "Syncing…" : "Sync now"}
          </button>
        </div>
      </SpyneRoiKpiStrip>

      {/* PENDING CHANGES */}
      {config.pendingChanges.length > 0 && (
        <div className="spyne-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-spyne-border px-5 py-3">
            <div className="flex items-center gap-2">
              <MaterialSymbol name="compare_arrows" size={16} className="text-[var(--spyne-warning-ink)]" />
              <h3 className={cn(spyneComponentClasses.cardTitle, "m-0")}>Pending changes</h3>
              <span className="inline-flex items-center rounded-md bg-spyne-warning-subtle px-2 py-0.5 text-[11px] font-bold" style={{ color: "var(--spyne-warning-ink)" }}>
                {config.pendingChanges.length}
              </span>
            </div>
            <button type="button" onClick={approveAll} className={cn(spyneComponentClasses.btnPrimaryMd, "flex items-center gap-1.5")}>
              <MaterialSymbol name="check" size={13} /> Approve all
            </button>
          </div>
          <ul>
            {config.pendingChanges.map((c: PendingChange) => (
              <li key={c.id} className="flex items-start gap-3 border-b border-spyne-border last:border-b-0 px-5 py-3 hover:bg-spyne-surface-hover">
                <MaterialSymbol name="article" size={16} className="text-spyne-text-muted mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold">
                    <span className="font-mono text-spyne-brand">{c.path}</span>
                  </div>
                  <div className="text-[12px] text-spyne-text-muted mt-0.5">{c.summary}</div>
                  <div className="text-[10px] text-spyne-text-subtle mt-1">Detected {c.detectedAt}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button type="button" onClick={() => approveChange(c.id)} className={cn(spyneComponentClasses.btnSecondaryMd, "flex items-center gap-1 text-spyne-success border-spyne-success-subtle")}>
                    <MaterialSymbol name="check" size={13} /> Approve
                  </button>
                  <button type="button" onClick={() => rejectChange(c.id)} className={cn(spyneComponentClasses.btnSecondaryMd, "flex items-center gap-1")}>
                    <MaterialSymbol name="close" size={13} /> Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* INDEXED PAGES */}
      <div className="spyne-card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-spyne-border px-5 py-3">
          <MaterialSymbol name="search" size={16} className="text-spyne-text-muted" />
          <input
            value={pageFilter}
            onChange={(e) => setPageFilter(e.target.value)}
            placeholder="Filter indexed pages by path or title"
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-spyne-text-subtle"
          />
          <span className="text-[11px] font-semibold text-spyne-text-muted">{filteredPages.length} of {config.pages.length}</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-spyne-border bg-spyne-surface-hover text-[11px] font-bold uppercase tracking-[0.04em] text-spyne-text-muted">
              <th className="px-5 py-2.5 text-left">Path</th>
              <th className="px-5 py-2.5 text-left">Title</th>
              <th className="px-5 py-2.5 text-left">Last updated</th>
              <th className="px-5 py-2.5 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredPages.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-[12px] text-spyne-text-muted">No pages match this filter.</td></tr>
            ) : filteredPages.map((p) => (
              <tr key={p.path} className="border-b border-spyne-border last:border-b-0 text-[13px] hover:bg-spyne-surface-hover">
                <td className="px-5 py-3 font-mono text-[12px] text-spyne-brand">{p.path}</td>
                <td className="px-5 py-3 font-semibold">{p.title}</td>
                <td className="px-5 py-3 text-spyne-text-muted">{p.lastUpdated}</td>
                <td className="px-5 py-3">
                  {p.status === "synced"  && <Pill tone="success">Synced</Pill>}
                  {p.status === "pending" && <Pill tone="warning">Pending review</Pill>}
                  {p.status === "error"   && <Pill tone="error">Error</Pill>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}


// ============= BULLETIN =============
const EXPIRY_OPTIONS = [
  { value: "24h",   label: "Auto-expire · 24 hours" },
  { value: "7d",    label: "Auto-expire · 7 days" },
  { value: "30d",   label: "Auto-expire · 30 days" },
  { value: "manual", label: "Until manually removed" },
] as const
type ExpiryKey = typeof EXPIRY_OPTIONS[number]["value"]

function BulletinSection({ bulletins, setBulletins }: { bulletins: BulletinItem[]; setBulletins: (b: BulletinItem[]) => void }) {
  const [draft, setDraft] = useState("")
  const [expiry, setExpiry] = useState<ExpiryKey>("7d")
  const expiryLabel = (k: ExpiryKey) => {
    const opt = EXPIRY_OPTIONS.find((o) => o.value === k)
    if (!opt) return "Auto · 7 days"
    return opt.value === "manual" ? "Manually removed" : opt.label.replace("Auto-expire · ", "Auto · ")
  }
  const post = () => {
    if (!draft.trim()) return
    setBulletins([
      { id: `b-${Date.now()}`, message: draft.trim(), expiresAt: expiryLabel(expiry), postedBy: "You", postedAt: "Just now", active: true },
      ...bulletins,
    ])
    setDraft("")
    setExpiry("7d")
  }
  const dismiss = (id: string) => setBulletins(bulletins.map((b) => b.id === id ? { ...b, active: false } : b))
  const remove = (id: string) => setBulletins(bulletins.filter((b) => b.id !== id))

  return (
    <div className="flex flex-col gap-4">
      <div className="spyne-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <MaterialSymbol name="notifications_active" size={18} className="text-spyne-brand" />
          <h3 className={cn(spyneComponentClasses.cardTitle, "m-0")}>Post a bulletin</h3>
        </div>
        <p className="text-[12px] text-spyne-text-muted mb-3">
          One-off override — &ldquo;closing early today,&rdquo; &ldquo;recall just announced,&rdquo; &ldquo;parking lot under construction.&rdquo; Bulletins take priority over all other knowledge for the duration they're active.
        </p>
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && post()}
            placeholder="e.g. Closing at 4pm today for staff training..."
            className="flex-1 rounded-lg border border-spyne-border bg-spyne-surface px-3 py-2 text-[13px] focus:border-spyne-brand focus:outline-none"
          />
          <select
            value={expiry}
            onChange={(e) => setExpiry(e.target.value as ExpiryKey)}
            className="rounded-lg border border-spyne-border bg-spyne-surface px-3 py-2 text-[13px] focus:border-spyne-brand focus:outline-none"
            aria-label="Expiry"
          >
            {EXPIRY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button type="button" onClick={post} className={cn(spyneComponentClasses.btnPrimaryMd, "flex items-center gap-1")}>
            <MaterialSymbol name="send" size={14} /> Post
          </button>
        </div>
      </div>

      <div className="spyne-card overflow-hidden">
        <div className="border-b border-spyne-border px-5 py-3">
          <h3 className={cn(spyneComponentClasses.cardTitle, "m-0")}>Active bulletins <span className="font-normal text-spyne-text-muted">· {bulletins.filter((b) => b.active).length}</span></h3>
        </div>
        {bulletins.length === 0 ? (
          <div className="py-12 text-center text-[13px] text-spyne-text-muted">No bulletins active.</div>
        ) : bulletins.map((b) => (
          <div key={b.id} className={cn("border-b border-spyne-border last:border-b-0 px-5 py-3.5 flex items-start gap-3", !b.active && "opacity-50")}>
            <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0", b.active ? "bg-spyne-brand animate-pulse" : "bg-spyne-text-subtle")} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] leading-relaxed">{b.message}</div>
              <div className="mt-1.5 flex items-center gap-3 text-[11px] text-spyne-text-muted">
                <span>{b.postedBy} · {b.postedAt}</span>
                <span>· Expires {b.expiresAt}</span>
                {!b.active && <Pill tone="neutral">Dismissed</Pill>}
              </div>
            </div>
            {b.active && (
              <button onClick={() => dismiss(b.id)} className="text-[11px] text-spyne-text-muted hover:text-spyne-text-primary font-semibold">Dismiss</button>
            )}
            <button onClick={() => remove(b.id)} className="text-spyne-text-muted hover:text-spyne-error">
              <MaterialSymbol name="close" size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============= SUGGESTIONS =============
function SuggestionsSection({
  suggestions,
  setSuggestions,
  onAddFact,
  onAddFaq,
  onJumpTab,
}: {
  suggestions: KnowledgeSuggestion[]
  setSuggestions: (s: KnowledgeSuggestion[]) => void
  onAddFact: (text: string) => void
  onAddFaq: (question: string, answer: string) => void
  onJumpTab: (t: Tab) => void
}) {
  const dismiss = (id: string) => setSuggestions(suggestions.filter((s) => s.id !== id))
  const [toast, setToast] = useState<string | null>(null)
  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2400) }

  const addToKnowledge = (s: KnowledgeSuggestion) => {
    if (s.type === "unanswered_question") {
      // Strip "Callers asking: '...'" wrapper if present
      const q = s.text.replace(/^Callers asking:\s*['"]?/, "").replace(/['"]?\s*$/, "")
      onAddFaq(q, s.suggestedAnswer ?? "")
      setSuggestions(suggestions.filter((x) => x.id !== s.id))
      flash("Added to FAQ — review in the FAQ tab")
      setTimeout(() => onJumpTab("faq"), 600)
    } else if (s.type === "missing_fact") {
      onAddFact(s.suggestedAnswer ?? s.text)
      setSuggestions(suggestions.filter((x) => x.id !== s.id))
      flash("Added to Quick Facts")
      setTimeout(() => onJumpTab("facts"), 600)
    } else {
      // outdated_fact — needs manual review in the relevant section
      setSuggestions(suggestions.filter((x) => x.id !== s.id))
      flash("Marked for review · open Promotions to archive")
      setTimeout(() => onJumpTab("promotions"), 600)
    }
  }

  const typeMeta = {
    unanswered_question: { label: "Unanswered question", icon: "help",     tone: "warning" as const },
    missing_fact:        { label: "Missing fact",         icon: "lightbulb", tone: "brand"   as const },
    outdated_fact:       { label: "Outdated",             icon: "schedule",  tone: "error"   as const },
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="spyne-card p-4 flex items-center gap-3 bg-spyne-brand-subtle border-spyne-brand/20">
        <MaterialSymbol name="auto_awesome" size={18} className="text-spyne-brand" />
        <div className="text-[13px] flex-1">
          <strong>VINI is watching every call.</strong> When the same question comes up repeatedly and Riley can't answer well, it surfaces here as a suggested knowledge addition.
        </div>
      </div>

      {suggestions.length === 0 ? (
        <div className="spyne-card py-12 text-center">
          <MaterialSymbol name="check_circle" size={32} className="text-spyne-success mb-2" />
          <div className="text-[14px] font-semibold">All caught up.</div>
          <div className="text-[12px] text-spyne-text-muted mt-1">No knowledge gaps detected in recent calls.</div>
        </div>
      ) : suggestions.map((s) => {
        const tm = typeMeta[s.type]
        return (
          <div key={s.id} className="spyne-card p-4">
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                tm.tone === "warning" && "bg-spyne-warning-subtle text-[var(--spyne-warning-ink)]",
                tm.tone === "brand"   && "bg-spyne-brand-subtle text-spyne-brand",
                tm.tone === "error"   && "bg-spyne-error-subtle text-spyne-error",
              )}>
                <MaterialSymbol name={tm.icon} size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Pill tone={tm.tone}>{tm.label}</Pill>
                  <span className="text-[11px] text-spyne-text-muted">{s.detectedAt}</span>
                  {s.frequency > 0 && (
                    <span className="text-[11px] font-semibold text-spyne-text-muted">
                      · {s.frequency}× this period
                    </span>
                  )}
                </div>
                <div className="text-[14px] font-semibold mb-2">{s.text}</div>
                {s.suggestedAnswer && (
                  <div className="bg-spyne-surface-hover rounded-md p-3 border-l-2 border-spyne-brand text-[12px] mt-2">
                    <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-spyne-text-muted mb-1">VINI suggests</div>
                    <div className="italic">&ldquo;{s.suggestedAnswer}&rdquo;</div>
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <button type="button" onClick={() => addToKnowledge(s)} className={cn(spyneComponentClasses.btnPrimaryMd, "flex items-center gap-1")}>
                    <MaterialSymbol name="add" size={14} />
                    {s.type === "unanswered_question" ? "Add as FAQ" : s.type === "missing_fact" ? "Add as Quick Fact" : "Review now"}
                  </button>
                  <button type="button" onClick={() => dismiss(s.id)} className={spyneComponentClasses.btnSecondaryMd}>Dismiss</button>
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {toast && (
        <div className="fixed left-1/2 bottom-6 z-[200] flex -translate-x-1/2 items-center gap-1.5 rounded-lg px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-lg" style={{ background: "var(--spyne-text-primary)" }}>
          <MaterialSymbol name="check_circle" size={14} /> {toast}
        </div>
      )}
    </div>
  )
}

// ============= UTILITIES =============
function FilterChip({ label, active, onClick, count }: { label: string; active: boolean; onClick: () => void; count?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold transition-colors",
        active
          ? "bg-spyne-brand text-white"
          : "bg-spyne-surface-hover text-spyne-text-muted hover:bg-spyne-border"
      )}
    >
      {label}
      {count !== undefined && (
        <span className={cn(
          "tabular-nums",
          active ? "text-white/80" : "text-spyne-text-subtle"
        )}>
          {count}
        </span>
      )}
    </button>
  )
}

function StatusBadge({ status }: { status: PromotionStatus }) {
  if (status === "active") return <Pill tone="success">Active</Pill>
  if (status === "scheduled") return <Pill tone="brand">Scheduled</Pill>
  return <Pill tone="neutral">Expired</Pill>
}

function Pill({ tone, children }: { tone: "success" | "warning" | "brand" | "error" | "neutral" | "info"; children: React.ReactNode }) {
  const cls =
    tone === "success" ? "bg-spyne-success-subtle text-spyne-success" :
    tone === "warning" ? "bg-spyne-warning-subtle text-[var(--spyne-warning-ink)]" :
    tone === "brand"   ? "bg-spyne-brand-subtle text-spyne-brand" :
    tone === "error"   ? "bg-spyne-error-subtle text-spyne-error" :
    tone === "info"    ? "bg-spyne-info-subtle text-spyne-info" :
                         "bg-spyne-border text-spyne-text-muted"
  return <span className={cn("inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold", cls)}>{children}</span>
}

// ============= DIALOGS =============
// Reusable input + textarea + select primitives to keep dialog markup focused.
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[11px] font-bold uppercase tracking-[0.04em] text-spyne-text-muted mb-1">{children}</label>
}
const fieldInputCls = "w-full rounded-lg border border-spyne-border bg-spyne-surface px-3 py-2 text-[13px] focus:border-spyne-brand focus:outline-none"

function AddFaqDialog({ open, onOpenChange, onSubmit }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSubmit: (item: Omit<FAQItem, "id" | "timesAnswered" | "lastAnswered">) => void
}) {
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [category, setCategory] = useState<FAQItem["category"]>("services")
  const valid = question.trim().length > 0 && answer.trim().length > 0
  const reset = () => { setQuestion(""); setAnswer(""); setCategory("services") }
  const handleSubmit = () => {
    if (!valid) return
    onSubmit({ question: question.trim(), answer: answer.trim(), category })
    reset()
    onOpenChange(false)
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o) }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add FAQ</DialogTitle>
          <DialogDescription>Riley delivers FAQ answers verbatim. Keep them short and conversational.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <FieldLabel>Question</FieldLabel>
            <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What's your Wi-Fi password?" className={fieldInputCls} autoFocus />
          </div>
          <div>
            <FieldLabel>Answer</FieldLabel>
            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={3} placeholder="Free Wi-Fi — network 'SpyneGuest', no password." className={fieldInputCls} />
          </div>
          <div>
            <FieldLabel>Category</FieldLabel>
            <select value={category} onChange={(e) => setCategory(e.target.value as FAQItem["category"])} className={fieldInputCls}>
              <option value="services">Services</option>
              <option value="amenities">Amenities</option>
              <option value="policies">Policies</option>
              <option value="directions">Directions</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <button type="button" onClick={() => onOpenChange(false)} className={spyneComponentClasses.btnSecondaryMd}>Cancel</button>
          <button type="button" disabled={!valid} onClick={handleSubmit} className={cn(spyneComponentClasses.btnPrimaryMd, !valid && "opacity-50 cursor-not-allowed")}>Add FAQ</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AddPromotionDialog({ open, onOpenChange, onSubmit }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSubmit: (item: Omit<Promotion, "id" | "timesReferenced">) => void
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [department, setDepartment] = useState<Promotion["department"]>("service")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [status, setStatus] = useState<Promotion["status"]>("active")
  const valid = title.trim().length > 0 && description.trim().length > 0 && startDate && endDate
  const reset = () => { setTitle(""); setDescription(""); setDepartment("service"); setStartDate(""); setEndDate(""); setStatus("active") }
  const handleSubmit = () => {
    if (!valid) return
    onSubmit({ title: title.trim(), description: description.trim(), department, startDate, endDate, status })
    reset()
    onOpenChange(false)
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o) }}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>New promotion</DialogTitle>
          <DialogDescription>Riley mentions active promotions to relevant callers. Auto-expires on end date.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <FieldLabel>Title</FieldLabel>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Memorial Day service special" className={fieldInputCls} autoFocus />
          </div>
          <div>
            <FieldLabel>Description</FieldLabel>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="$30 off oil change + tire rotation through end of month." className={fieldInputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Department</FieldLabel>
              <select value={department} onChange={(e) => setDepartment(e.target.value as Promotion["department"])} className={fieldInputCls}>
                <option value="sales">Sales</option>
                <option value="service">Service</option>
                <option value="parts">Parts</option>
                <option value="finance">Finance</option>
              </select>
            </div>
            <div>
              <FieldLabel>Status</FieldLabel>
              <select value={status} onChange={(e) => setStatus(e.target.value as Promotion["status"])} className={fieldInputCls}>
                <option value="active">Active</option>
                <option value="scheduled">Scheduled</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div>
              <FieldLabel>Start date</FieldLabel>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={fieldInputCls} />
            </div>
            <div>
              <FieldLabel>End date</FieldLabel>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={fieldInputCls} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <button type="button" onClick={() => onOpenChange(false)} className={spyneComponentClasses.btnSecondaryMd}>Cancel</button>
          <button type="button" disabled={!valid} onClick={handleSubmit} className={cn(spyneComponentClasses.btnPrimaryMd, !valid && "opacity-50 cursor-not-allowed")}>Add promotion</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function UploadDocumentDialog({ open, onOpenChange, onSubmit }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSubmit: (item: { filename: string; fileType: KnowledgeDocument["fileType"]; sizeKb: number }) => void
}) {
  const [filename, setFilename] = useState("")
  const [fileType, setFileType] = useState<KnowledgeDocument["fileType"]>("pdf")
  const [sizeKb, setSizeKb] = useState("")
  const valid = filename.trim().length > 0
  const reset = () => { setFilename(""); setFileType("pdf"); setSizeKb("") }
  const handleSubmit = () => {
    if (!valid) return
    onSubmit({ filename: filename.trim(), fileType, sizeKb: Number(sizeKb) || 0 })
    reset()
    onOpenChange(false)
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o) }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
          <DialogDescription>PDFs and Word docs get parsed into searchable chunks. Riley cites the source on every answer.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-spyne-border py-8 bg-spyne-surface-hover">
            <div className="text-center">
              <MaterialSymbol name="upload_file" size={28} className="text-spyne-text-muted mb-1" />
              <div className="text-[12px] text-spyne-text-muted">File picker · drag &amp; drop</div>
              <div className="text-[10px] text-spyne-text-subtle mt-1">PDF, DOCX, TXT · up to 25 MB</div>
            </div>
          </div>
          <div>
            <FieldLabel>Filename</FieldLabel>
            <input value={filename} onChange={(e) => setFilename(e.target.value)} placeholder="Service warranty terms 2026.pdf" className={fieldInputCls} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>File type</FieldLabel>
              <select value={fileType} onChange={(e) => setFileType(e.target.value as KnowledgeDocument["fileType"])} className={fieldInputCls}>
                <option value="pdf">PDF</option>
                <option value="docx">DOCX</option>
                <option value="txt">TXT</option>
              </select>
            </div>
            <div>
              <FieldLabel>Size (KB) <span className="text-spyne-text-subtle font-normal">— optional</span></FieldLabel>
              <input type="number" value={sizeKb} onChange={(e) => setSizeKb(e.target.value)} placeholder="240" className={fieldInputCls} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <button type="button" onClick={() => onOpenChange(false)} className={spyneComponentClasses.btnSecondaryMd}>Cancel</button>
          <button type="button" disabled={!valid} onClick={handleSubmit} className={cn(spyneComponentClasses.btnPrimaryMd, !valid && "opacity-50 cursor-not-allowed")}>Upload</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
