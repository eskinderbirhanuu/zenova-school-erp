"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FadeInUp } from "@/components/3d/micro-animations"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import { GraduationCap } from "lucide-react"

interface GradeEntry {
  subject: string
  exam: string
  score: number
  maxScore: number
  grade?: string
}

interface GradesListCardProps {
  title: string
  description?: string
  grades: GradeEntry[]
  icon?: LucideIcon
  delay?: number
  emptyMessage?: string
}

const gradeBadgeColor = (grade?: string) => {
  if (!grade) return "default"
  if (grade.startsWith("A")) return "success"
  if (grade.startsWith("B")) return "info"
  if (grade.startsWith("C")) return "warning"
  return "destructive"
}

export default function GradesListCard({
  title,
  description,
  grades,
  icon: Icon = GraduationCap,
  delay = 0.3,
  emptyMessage = "No grades recorded",
}: GradesListCardProps) {
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
          {grades.length > 0 ? (
            <div className="space-y-3">
              {grades.map((g, i) => {
                const pct = g.maxScore > 0 ? Math.round((g.score / g.maxScore) * 100) : 0
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate">{g.subject}</span>
                        <span className="text-muted-foreground text-xs">{g.exam}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {g.score}/{g.maxScore} ({pct}%)
                      </p>
                    </div>
                    {g.grade && (
                      <Badge variant={gradeBadgeColor(g.grade) as "default" | "destructive"}>
                        {g.grade}
                      </Badge>
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
