"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { academicService } from "@/services/api"
import { BookOpen, Users, Grid, Clock } from "lucide-react"

export default function AcademicPage() {
  const [classes, setClasses] = useState<any[]>([])

  useEffect(() => {
    academicService.classes.list().then((r) => setClasses(r.data)).catch(() => {})
  }, [])

  const cards = [
    { title: "Classes", value: classes.length, icon: BookOpen, href: "/academic/classes", color: "text-blue-600" },
    { title: "Sections", value: "—", icon: Grid, href: "/academic/sections", color: "text-purple-600" },
    { title: "Subjects", value: "—", icon: Users, href: "/academic/subjects", color: "text-green-600" },
    { title: "Timetable", value: "—", icon: Clock, href: "/academic/timetable", color: "text-orange-600" },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Academic</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.title} href={c.href}>
            <Card className="cursor-pointer transition-colors hover:bg-accent">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{c.title}</CardTitle>
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{c.value}</div></CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Classes</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Code</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((cls: any) => (
                <tr key={cls.id} className="border-b last:border-0">
                  <td className="py-3">{cls.name}</td>
                  <td className="py-3 text-muted-foreground">{cls.code}</td>
                  <td className="py-3"><Link href={`/academic/classes?id=${cls.id}`} className="text-primary hover:underline">View</Link></td>
                </tr>
              ))}
              {classes.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-muted-foreground">No classes yet</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
