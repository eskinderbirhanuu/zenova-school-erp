"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FadeInUp } from "@/components/3d/micro-animations"
import { GraduationCap, Clock, Users, MapPin } from "lucide-react"

interface ClassInfo {
  subject: string
  grade: string
  section: string
  room: string
  time: string
}

interface NowTeachingCardProps {
  currentClass: ClassInfo | null
  nextClass: ClassInfo | null
  delay?: number
}

function ClassDetails({ cls, icon: Icon }: { cls: ClassInfo; icon: typeof GraduationCap }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <Icon className="h-5 w-5" />
        {cls.subject}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {cls.grade} {cls.section}</span>
        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Room {cls.room}</span>
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {cls.time}</span>
      </div>
    </div>
  )
}

export default function NowTeachingCard({
  currentClass,
  nextClass,
  delay = 0.3,
}: NowTeachingCardProps) {
  return (
    <FadeInUp delay={delay}>
      <Card shadow="colored" className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          {currentClass ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <ClassDetails cls={currentClass} icon={GraduationCap} />
                <Badge className="bg-emerald-500 text-white">In Progress</Badge>
              </div>
              {nextClass && (
                <div className="border-t pt-4 mt-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Next</p>
                  <div className="flex items-center justify-between">
                    <ClassDetails cls={nextClass} icon={Clock} />
                    <Badge variant="outline">Upcoming</Badge>
                  </div>
                </div>
              )}
            </div>
          ) : nextClass ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">No class right now</p>
                  <p className="text-sm text-muted-foreground">Next class starts soon</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Upcoming</p>
                <div className="flex items-center justify-between">
                  <ClassDetails cls={nextClass} icon={GraduationCap} />
                  <Badge variant="outline">Upcoming</Badge>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <GraduationCap className="h-6 w-6 text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">Done for the day</p>
                <p className="text-sm text-muted-foreground">All classes are completed</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </FadeInUp>
  )
}
