"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FadeInUp } from "@/components/3d/micro-animations"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import { Bell, AlertTriangle, CheckCircle2, XCircle, Info } from "lucide-react"

interface AlertItem {
  message: string
  severity: "warning" | "success" | "destructive" | "info"
  time: string
}

interface AlertCenterCardProps {
  title: string
  description?: string
  alerts: AlertItem[]
  icon?: LucideIcon
  delay?: number
  emptyMessage?: string
}

const alertIcons: Record<string, LucideIcon> = {
  warning: AlertTriangle,
  success: CheckCircle2,
  destructive: XCircle,
  info: Info,
}

const alertColorMap: Record<string, string> = {
  warning: "text-amber-500",
  success: "text-emerald-500",
  destructive: "text-red-500",
  info: "text-blue-500",
}

const alertBadgeClass: Record<string, string> = {
  warning: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900 dark:text-amber-300",
  success: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-300",
  destructive: "",
  info: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-300",
}

export default function AlertCenterCard({
  title,
  description,
  alerts,
  icon: Icon = Bell,
  delay = 0.3,
  emptyMessage = "No alerts",
}: AlertCenterCardProps) {
  return (
    <FadeInUp delay={delay}>
      <Card shadow="colored">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="h-4 w-4 text-primary" /> {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          {alerts.length > 0 ? (
            <div className="space-y-2">
              {alerts.map((alert, i) => {
                const SeverityIcon = alertIcons[alert.severity] || Info
                return (
                  <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                    <SeverityIcon className={cn("h-4 w-4 shrink-0", alertColorMap[alert.severity])} />
                    <span className="flex-1 text-sm">{alert.message}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{alert.time}</span>
                    <Badge variant={alert.severity === "destructive" ? "destructive" : "default"} className={alert.severity !== "destructive" ? alertBadgeClass[alert.severity] : ""}>{alert.severity}</Badge>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">{emptyMessage}</p>
          )}
        </CardContent>
      </Card>
    </FadeInUp>
  )
}
