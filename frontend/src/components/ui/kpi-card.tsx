"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import { motion } from "framer-motion"

interface KPICardProps {
  title: string
  value: string | number
  icon: LucideIcon
  iconColor?: string
  description?: string
  trend?: { value: string; positive: boolean }
  accentColor?: string
}

export function KPICard({ title, value, icon: Icon, iconColor = "text-primary", description, trend, accentColor }: KPICardProps) {
  return (
    <motion.div whileHover={{ y: -2, scale: 1.01 }} transition={{ duration: 0.2 }}>
      <Card className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 group">
        {accentColor && <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-xl", accentColor)} />}

        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</CardTitle>
          <div className={cn(
            "rounded-xl p-2.5 transition-transform duration-200 group-hover:scale-110",
            iconColor.startsWith("text-") ? iconColor.replace("text-", "bg-") + "/10" : "bg-primary/10"
          )}>
            <Icon className={cn("h-4 w-4", iconColor)} />
          </div>
        </CardHeader>

        <CardContent className="relative">
          <div className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            {value}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            {trend && (
              <span className={cn(
                "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
                trend.positive
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-red-500/10 text-red-600"
              )}>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d={trend.positive
                    ? "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
                    : "M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306-3.09l3.532-1.477M20.25 6l-1.477 3.532"} />
                </svg>
                {trend.value}
              </span>
            )}
            {description && <p className="text-xs text-muted-foreground truncate">{description}</p>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}