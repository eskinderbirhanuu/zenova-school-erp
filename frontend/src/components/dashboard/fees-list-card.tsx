"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { FadeInUp } from "@/components/3d/micro-animations"
import type { LucideIcon } from "lucide-react"
import { Wallet } from "lucide-react"

interface FeeItem {
  label: string
  amount: string
  dueDate: string
  status: "paid" | "pending" | "overdue"
}

interface FeesListCardProps {
  title: string
  description?: string
  fees: FeeItem[]
  icon?: LucideIcon
  delay?: number
  emptyMessage?: string
}

export default function FeesListCard({
  title,
  description,
  fees,
  icon: Icon = Wallet,
  delay = 0.3,
  emptyMessage = "No fees recorded",
}: FeesListCardProps) {
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
          {fees.length > 0 ? (
            <div className="space-y-3">
              {fees.map((fee, i) => (
                <div key={i} className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{fee.label}</p>
                    <p className="text-xs text-muted-foreground">Due {fee.dueDate}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold tabular-nums">{fee.amount}</span>
                    <StatusBadge status={fee.status} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">{emptyMessage}</p>
          )}
        </CardContent>
      </Card>
    </FadeInUp>
  )
}
