"use client"

import { MaterialSymbol } from '@/components/max-2/material-symbol'
import { SpyneLineTab, SpyneLineTabBadge, SpyneLineTabStrip } from '@/components/max-2/spyne-line-tabs'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { id: 'overview',      label: 'Overview',     symbol: 'dashboard',       badge: null },
  { id: 'campaigns',     label: 'Campaigns',    symbol: 'campaign',        badge: 4   },
  { id: 'action-items',  label: 'Action Items', symbol: 'checklist',       badge: 6   },
  { id: 'appointments',  label: 'Appointments', symbol: 'event_available', badge: 3   },
  { id: 'customers',     label: 'Leads',        symbol: 'group',           badge: null },
  { id: 'reports',       label: 'Reports',      symbol: 'bar_chart',       badge: null },
]

const SERVICE_NAV_ITEMS = NAV_ITEMS
  .map((item) => item.id === 'customers' ? { ...item, label: 'Customers' } : item)

// Receptionist owns calls, not leads / customers. Its job is routing, message capture,
// and front-desk-style follow-ups — surfaced as its own tab set.
const RECEPTIONIST_NAV_ITEMS = [
  { id: 'overview',       label: 'Overview',       symbol: 'dashboard',       badge: null },
  { id: 'data-health',    label: 'Data Health',    symbol: 'database',        badge: 2    },
  { id: 'calls',          label: 'Calls',          symbol: 'call',            badge: null },
  { id: 'action-items',   label: 'Action Items',   symbol: 'checklist',       badge: 6    },
  { id: 'knowledge',      label: 'Knowledge',      symbol: 'auto_stories',    badge: 5    },
]

export default function SecondaryNav({ activePage, onPageChange, navLeftPx = 220, embedded = false, department = 'sales', lockedTabs = /** @type {string[]} */ ([]), badgeOverrides = /** @type {Record<string, number|null>} */ ({}) }) {
  const baseItems =
    department === 'service' ? SERVICE_NAV_ITEMS
    : department === 'receptionist' ? RECEPTIONIST_NAV_ITEMS
    : NAV_ITEMS
  const navItems = baseItems.map((item) =>
    Object.prototype.hasOwnProperty.call(badgeOverrides, item.id)
      ? { ...item, badge: badgeOverrides[item.id] }
      : item
  )
  const isLocked = (id) => lockedTabs.includes(id)
  if (embedded) {
    return (
      <div
        data-tour="nav-strip"
        className={cn(
          /* Full width of main column (layout has no horizontal padding on Sales) */
          'sticky top-14 z-[40] lg:top-0',
          'w-full min-w-0 bg-spyne-surface',
        )}
      >
        <div className="min-w-0 px-max2-page">
          <SpyneLineTabStrip embedded className="min-h-10 w-full min-w-0">
            {navItems.map((item) => {
              const active = activePage === item.id
              const locked = isLocked(item.id)
              return (
                <SpyneLineTab
                  key={item.id}
                  active={active}
                  onClick={() => !locked && onPageChange(item.id)}
                  aria-current={active ? 'page' : undefined}
                  aria-disabled={locked || undefined}
                  title={locked ? 'Unlocks after you connect your data' : undefined}
                  style={locked ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
                >
                  <MaterialSymbol name={locked ? 'lock' : item.symbol} size={14} className="text-current" />
                  {item.label}
                  {!locked && item.badge != null ? <SpyneLineTabBadge>{item.badge}</SpyneLineTabBadge> : null}
                </SpyneLineTab>
              )
            })}
          </SpyneLineTabStrip>
        </div>
      </div>
    )
  }

  return (
    <div
      data-tour="nav-strip"
      className="fixed right-0 z-20 flex min-h-11 items-end bg-spyne-surface transition-all duration-200"
      style={{
        top: 56,
        left: navLeftPx,
      }}
    >
      <div className="min-w-0 flex-1 px-5">
        <SpyneLineTabStrip embedded className="min-h-11 w-full">
          {navItems.map((item) => {
            const active = activePage === item.id
            return (
              <SpyneLineTab
                key={item.id}
                active={active}
                onClick={() => onPageChange(item.id)}
                aria-current={active ? 'page' : undefined}
              >
                <MaterialSymbol name={item.symbol} size={14} className="text-current" />
                {item.label}
                {item.badge != null ? <SpyneLineTabBadge>{item.badge}</SpyneLineTabBadge> : null}
              </SpyneLineTab>
            )
          })}
        </SpyneLineTabStrip>
      </div>
    </div>
  )
}
