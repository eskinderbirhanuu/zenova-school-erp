"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { FadeInUp } from "@/components/3d/micro-animations"
import type { LucideIcon } from "lucide-react"
import { BarChart3 } from "lucide-react"

interface BarChartCardProps {
  title: string
  description?: string
  data: Record<string, any>[]
  xKey: string
  dataKey: string
  name?: string
  color?: string
  icon?: LucideIcon
  delay?: number
  height?: number
  emptyMessage?: string
}

export default function BarChartCard({
  title,
  description,
  data,
  xKey,
  dataKey,
  name,
  color = "hsl(var(--primary))",
  icon: Icon = BarChart3,
  delay = 0.3,
  height = 250,
  emptyMessage,
}: BarChartCardProps) {
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
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} name={name || title} />
              </BarChart>
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
