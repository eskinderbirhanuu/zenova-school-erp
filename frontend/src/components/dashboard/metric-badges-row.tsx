"use client"

import { FadeInUp } from "@/components/3d/micro-animations"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface MetricBadge {
  label: string
  value: string
  icon: LucideIcon
  color?: string
}

interface MetricBadgesRowProps {
  metrics: MetricBadge[]
}

export default function MetricBadgesRow({ metrics }: MetricBadgesRowProps) {
  return (
    <FadeInUp>
      <div className="flex flex-wrap gap-3">
        {metrics.map((m, i) => (
          <div
            key={i}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm shadow-sm",
              m.color || "bg-card"
            )}
          >
            <m.icon className="h-4 w-4 text-primary" />
            <span className="font-semibold">{m.value}</span>
            <span className="text-muted-foreground">{m.label}</span>
          </div>
        ))}
      </div>
    </FadeInUp>
  )
}
