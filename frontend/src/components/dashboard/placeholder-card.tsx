"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FadeInUp } from "@/components/3d/micro-animations"
import type { LucideIcon } from "lucide-react"
import { Clock } from "lucide-react"

interface PlaceholderCardProps {
  title: string
  description?: string
  message?: string
  icon?: LucideIcon
  delay?: number
}

export default function PlaceholderCard({
  title,
  description,
  message = "Coming soon",
  icon: Icon = Clock,
  delay = 0.5,
}: PlaceholderCardProps) {
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
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            {message}
          </div>
        </CardContent>
      </Card>
    </FadeInUp>
  )
}
