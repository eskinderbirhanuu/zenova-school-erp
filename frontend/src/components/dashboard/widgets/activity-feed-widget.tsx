"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { useDashboardOverview } from "@/hooks/queries"
import { FadeInUp } from "@/components/3d/micro-animations"
import { Zap } from "lucide-react"
import type { WidgetProps } from "../types"

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour ago`
  return `${Math.floor(hrs / 24)} days ago`
}

function activityBadge(table: string): "info" | "success" | "warning" | "purple" | "default" {
  if (table.includes("student")) return "info"
  if (table.includes("payment") || table.includes("invoice")) return "success"
  if (table.includes("contract") || table.includes("hr")) return "warning"
  if (table.includes("library") || table.includes("book")) return "purple"
  return "default"
}

export default function ActivityFeedWidget({ widgetId }: WidgetProps) {
  const { data: overview } = useDashboardOverview()

  const activities = (overview?.recent_activity || []).map((a) => ({
    action: `${a.action} on ${a.table_name}`,
    time: timeAgo(a.created_at),
    badge: activityBadge(a.table_name),
  }))

  return (
    <FadeInUp delay={0.5}>
      <Card shadow="default">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-primary" /> Activity Feed
          </CardTitle>
          <CardDescription>Latest actions across the school</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-4 font-medium">Action</th>
                <th className="p-4 font-medium">Time</th>
                <th className="p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {activities.length === 0 ? (
                <tr><td className="p-4 text-muted-foreground text-center" colSpan={3}>No recent activity</td></tr>
              ) : activities.map((a, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium">{a.action}</td>
                  <td className="p-4 text-muted-foreground">{a.time}</td>
                  <td className="p-4">
                    <StatusBadge status={a.badge === "info" ? "Info" : a.badge === "success" ? "Success" : a.badge === "warning" ? "Pending" : a.badge === "purple" ? "Update" : "Done"} variant={a.badge} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </FadeInUp>
  )
}
