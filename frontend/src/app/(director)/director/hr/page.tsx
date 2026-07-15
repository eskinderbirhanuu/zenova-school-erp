"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Briefcase, Loader2 } from "lucide-react"
import { useStaff } from "@/hooks/queries"

export default function DirectorHR() {
  const { data: staff, isLoading } = useStaff()

  const staffList = staff || []

  const teachingStaff = staffList.filter((s: any) => s.role_name === "TEACHER" || s.employee_type === "teaching")
  const nonTeaching = staffList.filter((s: any) => s.role_name !== "TEACHER" && s.employee_type !== "teaching")

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">HR Overview</h1>
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">HR Overview</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Employees</CardTitle><Users className="h-4 w-4 text-blue-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{staffList.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Teaching Staff</CardTitle><Briefcase className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{teachingStaff.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Non-Teaching</CardTitle><Users className="h-4 w-4 text-purple-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{nonTeaching.length}</div></CardContent></Card>
      </div>
    </div>
  )
}
