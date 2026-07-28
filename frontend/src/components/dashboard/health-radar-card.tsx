"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { MappedStatusBadge } from "@/components/ui/status-badge"
import { FadeInUp } from "@/components/3d/micro-animations"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import { Activity } from "lucide-react"

interface HealthService {
  name: string
  status: "operational" | "degraded" | "down"
  latency: string
}

interface HealthRadarCardProps {
  title: string
  description?: string
  services: HealthService[]
  icon?: LucideIcon
  delay?: number
}

const statusBorder: Record<string, string> = {
  operational: "border-l-emerald-500",
  degraded: "border-l-amber-500",
  down: "border-l-red-500",
}

export default function HealthRadarCard({
  title,
  description,
  services,
  icon: Icon = Activity,
  delay = 0.3,
}: HealthRadarCardProps) {
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {services.map((svc, i) => (
              <div
                key={i}
                className={cn(
                  "border-l-4 rounded-r-lg border bg-card p-3 shadow-sm",
                  statusBorder[svc.status]
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate">{svc.name}</span>
                  <MappedStatusBadge status={svc.status} />
                </div>
                <p className="text-xs text-muted-foreground">{svc.latency}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </FadeInUp>
  )
}
