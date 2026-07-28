import { WidgetConfig } from "./types"
import KpiGridWidget from "./widgets/kpi-grid-widget"
import ActivityFeedWidget from "./widgets/activity-feed-widget"
import QuickActionsWidget from "./widgets/quick-actions-widget"
import EnrollmentChartWidget from "./widgets/enrollment-chart-widget"
import RevenueChartWidget from "./widgets/revenue-chart-widget"
import SetupWizardBannerWidget from "./widgets/setup-wizard-banner-widget"

const ADMIN_WIDGETS: WidgetConfig[] = [
  { id: "setup-wizard-banner", title: "Setup Wizard", component: SetupWizardBannerWidget, roles: ["SUPER_ADMIN", "ADMIN"], defaultSize: { w: 6, h: 1 } },
  { id: "kpi-grid", title: "Key Metrics", component: KpiGridWidget, roles: ["SUPER_ADMIN", "ADMIN", "DIRECTOR"], defaultSize: { w: 6, h: 2 } },
  { id: "enrollment-chart", title: "Enrollment Trend", component: EnrollmentChartWidget, roles: ["SUPER_ADMIN", "ADMIN", "DIRECTOR", "REGISTRAR"], defaultSize: { w: 3, h: 2 } },
  { id: "revenue-chart", title: "Revenue vs Expenses", component: RevenueChartWidget, roles: ["SUPER_ADMIN", "ADMIN", "DIRECTOR", "FINANCE"], defaultSize: { w: 3, h: 2 } },
  { id: "activity-feed", title: "Activity Feed", component: ActivityFeedWidget, roles: ["SUPER_ADMIN", "ADMIN", "DIRECTOR", "AUDITOR"], defaultSize: { w: 4, h: 2 } },
  { id: "quick-actions", title: "Quick Actions", component: QuickActionsWidget, roles: ["SUPER_ADMIN", "ADMIN"], defaultSize: { w: 2, h: 2 } },
]

const registered = new Set<string>()

export function ensureWidgetsRegistered(): void {
  if (registered.size > 0) return
  for (const w of ADMIN_WIDGETS) {
    registered.add(w.id)
  }
}

export function getAdminWidgets(): WidgetConfig[] {
  ensureWidgetsRegistered()
  return ADMIN_WIDGETS.filter((w) => w.roles?.includes("ADMIN") || w.roles?.includes("SUPER_ADMIN"))
}
