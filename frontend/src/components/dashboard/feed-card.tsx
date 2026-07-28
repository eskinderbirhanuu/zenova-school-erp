"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { FadeInUp } from "@/components/3d/micro-animations"
import type { LucideIcon } from "lucide-react"
import { ClipboardList } from "lucide-react"

interface FeedItem {
  label: string
  detail?: string
  time?: string
  icon?: LucideIcon
  badge?: { text: string; variant?: "success" | "warning" | "info" | "purple" | "destructive" | "default" }
}

interface FeedCardProps {
  title: string
  description?: string
  items: FeedItem[]
  icon?: LucideIcon
  delay?: number
  emptyMessage?: string
}

const DefaultIcon = ClipboardList

export default function FeedCard({
  title,
  description,
  items,
  icon: Icon = DefaultIcon,
  delay = 0.4,
  emptyMessage = "No recent activity",
}: FeedCardProps) {
  return (
    <FadeInUp delay={delay}>
      <Card shadow="default">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="h-4 w-4 text-primary" /> {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          {items.length > 0 ? (
            <div className="space-y-3">
              {items.map((item, i) => {
                const ItemIcon = item.icon || Icon
                return (
                  <div key={i} className="flex items-start gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                    <div className="rounded-full bg-primary/5 p-1.5 text-primary shrink-0">
                      <ItemIcon className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.label}</p>
                      {(item.detail || item.time) && (
                        <p className="text-xs text-muted-foreground">
                          {item.detail}{item.detail && item.time ? " — " : ""}{item.time}
                        </p>
                      )}
                    </div>
                    {item.badge && (
                      <StatusBadge status={item.badge.text} variant={item.badge.variant} />
                    )}
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
