"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FadeInUp } from "@/components/3d/micro-animations"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import { Clock } from "lucide-react"

interface TimelineEvent {
  time: string
  subject: string
  room: string
  status: "live" | "done" | "upcoming"
}

interface TimelineCardProps {
  title: string
  description?: string
  events: TimelineEvent[]
  delay?: number
  icon?: LucideIcon
}

const dotColors: Record<string, string> = {
  live: "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.2)]",
  done: "bg-muted-foreground/40",
  upcoming: "bg-blue-500",
}

export default function TimelineCard({
  title,
  description,
  events,
  delay = 0.3,
  icon: Icon = Clock,
}: TimelineCardProps) {
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
          <div className="space-y-0">
            {events.map((event, i) => (
              <div key={i} className="flex gap-4 pb-4 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className={cn("h-3 w-3 rounded-full mt-1.5", dotColors[event.status])} />
                  {i < events.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                </div>
                <div className={cn("flex-1 min-w-0", event.status === "done" && "opacity-50")}>
                  <div className="flex items-center justify-between">
                    <span className={cn("text-sm font-medium", event.status === "done" && "line-through")}>
                      {event.subject}
                    </span>
                    <span className="text-xs text-muted-foreground">{event.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Room {event.room}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </FadeInUp>
  )
}
