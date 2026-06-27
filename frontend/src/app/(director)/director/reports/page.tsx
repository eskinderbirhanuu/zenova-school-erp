"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Download, Eye, BarChart3, Users, GraduationCap, DollarSign, ClipboardList } from "lucide-react"

const reports = [
  { title: "Academic Performance", description: "Student grades and exam results summary", icon: BarChart3 },
  { title: "Staff Utilization", description: "Teacher and staff allocation overview", icon: Users },
  { title: "Enrollment Trends", description: "Student enrollment numbers over time", icon: GraduationCap },
  { title: "Financial Report", description: "School budget, revenue, and expenses", icon: DollarSign },
  { title: "Operational Audit", description: "Daily operations and compliance check", icon: ClipboardList },
]

export default function DirectorReports() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Director Reports</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((r, i) => {
          const Icon = r.icon
          return (
            <Card key={i}>
              <CardHeader className="flex flex-row items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-2"><Icon className="h-5 w-5 text-primary" /></div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{r.title}</CardTitle>
                  <CardDescription>{r.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button variant="default" size="sm"><Download className="h-4 w-4" /> Download</Button>
                  <Button variant="outline" size="sm"><Eye className="h-4 w-4" /> Preview</Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
