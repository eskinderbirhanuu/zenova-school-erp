"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { FadeInUp } from "@/components/3d/micro-animations"
import type { LucideIcon } from "lucide-react"
import { LineChart } from "lucide-react"

interface AreaSeries {
  dataKey: string
  name: string
  color: string
}

interface AreaChartCardProps {
  title: string
  description?: string
  data: Record<string, any>[]
  xKey: string
  series: AreaSeries[]
  icon?: LucideIcon
  delay?: number
  height?: number
  gradientId?: string
  emptyMessage?: string
}

export default function AreaChartCard({
  title,
  description,
  data,
  xKey,
  series,
  icon: Icon = LineChart,
  delay = 0.4,
  height = 300,
  gradientId = "areaGradient",
  emptyMessage,
}: AreaChartCardProps) {
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
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height={height}>
              <AreaChart data={data}>
                <defs>
                  {series.map((s, i) => (
                    <linearGradient key={s.dataKey} id={`${gradientId}-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={s.color} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                {series.map((s, i) => (
                  <Area
                    key={s.dataKey}
                    type="monotone"
                    dataKey={s.dataKey}
                    stroke={s.color}
                    fill={`url(#${gradientId}-${i})`}
                    name={s.name}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              {emptyMessage || "No data available yet"}
            </div>
          )}
        </CardContent>
      </Card>
    </FadeInUp>
  )
}
