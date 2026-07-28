import type React from "react"
import { WidgetConfig, WidgetProps } from "./types"
import HealthRadarCard from "./health-radar-card"
import AlertCenterCard from "./alert-center-card"
import ActivityTableCard from "./activity-table-card"
import MetricBadgesRow from "./metric-badges-row"
import NowTeachingCard from "./now-teaching-card"
import TimelineCard from "./timeline-card"
import FunnelCard from "./funnel-card"
import GradesListCard from "./grades-list-card"
import BarChartCard from "./bar-chart-card"
import AreaChartCard from "./area-chart-card"
import FeedCard from "./feed-card"
import PlaceholderCard from "./placeholder-card"
import ChildSelectorBar from "./child-selector-bar"
import FeesListCard from "./fees-list-card"

const registry = new Map<string, WidgetConfig>()

export function registerWidget(config: WidgetConfig): void {
  if (registry.has(config.id)) {
    console.warn(`Widget "${config.id}" already registered — overwriting`)
  }
  registry.set(config.id, config)
}

export function getWidget(id: string): WidgetConfig | undefined {
  return registry.get(id)
}

export function getWidgetsForRole(role: string, userPermissions: string[]): WidgetConfig[] {
  const result: WidgetConfig[] = []
  for (const widget of registry.values()) {
    if (widget.roles && !widget.roles.includes(role)) continue
    if (widget.requiredPermissions) {
      const hasAll = widget.requiredPermissions.every((p) => userPermissions.includes(p))
      if (!hasAll) continue
    }
    result.push(widget)
  }
  return result
}

export function getAllWidgets(): WidgetConfig[] {
  return Array.from(registry.values())
}

registerWidget({ id: "health-radar", title: "System Health", description: "Service status overview", component: HealthRadarCard as unknown as React.ComponentType<WidgetProps>, defaultSize: { w: 4, h: 2 }, roles: ["SUPER_ADMIN", "ADMIN"] })
registerWidget({ id: "alert-center", title: "Alert Center", description: "Recent system alerts", component: AlertCenterCard as unknown as React.ComponentType<WidgetProps>, defaultSize: { w: 4, h: 2 }, roles: ["SUPER_ADMIN", "ADMIN"] })
registerWidget({ id: "activity-table", title: "Activity Log", description: "Detailed activity records", component: ActivityTableCard as unknown as React.ComponentType<WidgetProps>, defaultSize: { w: 6, h: 3 }, roles: ["SUPER_ADMIN", "ADMIN"] })
registerWidget({ id: "metric-badges", title: "Metric Badges", description: "Quick metric pills", component: MetricBadgesRow as unknown as React.ComponentType<WidgetProps>, defaultSize: { w: 6, h: 1 }, roles: ["SUPER_ADMIN", "ADMIN"] })
registerWidget({ id: "now-teaching", title: "Now Teaching", description: "Current class status", component: NowTeachingCard as unknown as React.ComponentType<WidgetProps>, defaultSize: { w: 3, h: 2 }, roles: ["TEACHER", "ADMIN"] })
registerWidget({ id: "timeline", title: "Class Timeline", description: "Daily schedule timeline", component: TimelineCard as unknown as React.ComponentType<WidgetProps>, defaultSize: { w: 3, h: 2 }, roles: ["TEACHER", "ADMIN"] })
registerWidget({ id: "funnel", title: "Enrollment Funnel", description: "Student pipeline stages", component: FunnelCard as unknown as React.ComponentType<WidgetProps>, defaultSize: { w: 4, h: 2 }, roles: ["SUPER_ADMIN", "ADMIN", "REGISTRAR"] })
registerWidget({ id: "grades-list", title: "Grades Overview", description: "Subject grade summary", component: GradesListCard as unknown as React.ComponentType<WidgetProps>, defaultSize: { w: 4, h: 2 }, roles: ["TEACHER", "ADMIN"] })
registerWidget({ id: "bar-chart", title: "Bar Chart", description: "Vertical bar chart visualization", component: BarChartCard as unknown as React.ComponentType<WidgetProps>, defaultSize: { w: 4, h: 2 } })
registerWidget({ id: "area-chart", title: "Area Chart", description: "Area chart visualization", component: AreaChartCard as unknown as React.ComponentType<WidgetProps>, defaultSize: { w: 4, h: 2 } })
registerWidget({ id: "feed", title: "Activity Feed", description: "Timeline of recent activities", component: FeedCard as unknown as React.ComponentType<WidgetProps>, defaultSize: { w: 3, h: 2 } })
registerWidget({ id: "placeholder", title: "Coming Soon", description: "Placeholder for future features", component: PlaceholderCard as unknown as React.ComponentType<WidgetProps>, defaultSize: { w: 3, h: 2 } })
registerWidget({ id: "child-selector", title: "Child Selector", description: "Select and switch between children", component: ChildSelectorBar as unknown as React.ComponentType<WidgetProps>, defaultSize: { w: 6, h: 1 }, roles: ["PARENT"] })
registerWidget({ id: "fees-list", title: "Fees List", description: "Invoice and payment status list", component: FeesListCard as unknown as React.ComponentType<WidgetProps>, defaultSize: { w: 4, h: 2 }, roles: ["PARENT", "FINANCE"] })
