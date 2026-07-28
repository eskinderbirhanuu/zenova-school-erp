"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FadeInUp } from "@/components/3d/micro-animations"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import { Filter } from "lucide-react"

interface FunnelStage {
  name: string
  count: number
  color?: string
}

interface FunnelCardProps {
  title: string
  description?: string
  stages: FunnelStage[]
  showConversion?: boolean
  icon?: LucideIcon
  delay?: number
}

export default function FunnelCard({
  title,
  description,
  stages,
  showConversion = true,
  icon: Icon = Filter,
  delay = 0.3,
}: FunnelCardProps) {
  const maxCount = Math.max(...stages.map((s) => s.count), 1)

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
          <div className="space-y-4">
            {stages.map((stage, i) => {
              const pct = Math.round((stage.count / maxCount) * 100)
              const barColor = stage.color || (i === 0 ? "bg-primary" : `bg-primary/${Math.max(100 - i * 20, 20)}`)
              return (
                <div key={i}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{stage.name}</span>
                    <span className="text-muted-foreground">{stage.count.toLocaleString()}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className={cn("h-2 rounded-full transition-all", barColor)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {showConversion && i < stages.length - 1 && (
                    <p className="text-xs text-muted-foreground text-right mt-0.5">
                      {stages[i + 1].count > 0
                        ? `${Math.round((stages[i + 1].count / stage.count) * 100)}% conversion`
                        : "—"}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </FadeInUp>
  )
}
