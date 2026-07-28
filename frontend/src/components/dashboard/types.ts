import type { ReactNode } from "react"

export interface WidgetProps {
  widgetId: string
}

export interface WidgetConfig {
  id: string
  title: string
  description?: string
  component: React.ComponentType<WidgetProps>
  requiredPermissions?: string[]
  defaultSize: { w: number; h: number }
  roles?: string[]
}

export interface DashboardLayout {
  widgets: { id: string; w: number; h: number }[]
}
