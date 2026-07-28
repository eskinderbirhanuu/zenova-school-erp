"use client"

import type { ReactNode } from "react"
import { DynamicAnimatedBackground } from "@/components/3d/dynamic"
import { Loader2 } from "lucide-react"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"

interface DashboardShellProps {
  header?: ReactNode
  widgets: ReactNode[]
  isLoading?: boolean
}

export default function DashboardShell({ header, widgets, isLoading }: DashboardShellProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <DynamicAnimatedBackground />
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <DynamicAnimatedBackground />
      {header && <FadeInUp>{header}</FadeInUp>}
      <div className="space-y-8">
        {widgets.map((widget, i) => (
          <div key={i}>{widget}</div>
        ))}
      </div>
    </div>
  )
}
