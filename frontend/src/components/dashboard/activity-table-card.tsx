"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FadeInUp } from "@/components/3d/micro-animations"
import type { LucideIcon } from "lucide-react"
import { Activity } from "lucide-react"

interface TableColumn {
  key: string
  label: string
}

interface ActivityTableCardProps {
  title: string
  description?: string
  columns: TableColumn[]
  data: Record<string, any>[]
  icon?: LucideIcon
  emptyMessage?: string
  delay?: number
}

export default function ActivityTableCard({
  title,
  description,
  columns,
  data,
  icon: Icon = Activity,
  emptyMessage = "No data yet",
  delay = 0.3,
}: ActivityTableCardProps) {
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    {columns.map((col) => (
                      <th key={col.key} className="pb-2 pr-4 font-medium">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      {columns.map((col) => (
                        <td key={col.key} className="py-2 pr-4">
                          {row[col.key] ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">{emptyMessage}</p>
          )}
        </CardContent>
      </Card>
    </FadeInUp>
  )
}
