"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FadeInUp } from "@/components/3d/micro-animations"
import { TrendingUp } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { enrollmentData } from "@/config/chart-data"
import type { WidgetProps } from "../types"

interface EnrollmentChartWidgetProps extends WidgetProps {
  data?: { month: string; students: number }[]
}

export default function EnrollmentChartWidget({ data }: EnrollmentChartWidgetProps) {
  const chartData = data && data.length > 0 ? data : enrollmentData

  return (
    <FadeInUp delay={0.3}>
      <Card shadow="colored">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" /> Enrollment Trend
          </CardTitle>
          <CardDescription>Student enrollment over the academic year</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 12 }} />
                <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="students" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </FadeInUp>
  )
}
