"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Briefcase, Loader2 } from "lucide-react"
import { staffService } from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function DirectorHR() {
  const [loading, setLoading] = useState(true)
  const [staff, setStaff] = useState<any[]>([])

  useEffect(() => {
    staffService.list()
      .then(res => setStaff(res.data || []))
      .catch(err => toast({ title: "Failed to load HR data", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

  const teachingStaff = staff.filter((s: any) => s.role_name === "TEACHER" || s.employee_type === "teaching")
  const nonTeaching = staff.filter((s: any) => s.role_name !== "TEACHER" && s.employee_type !== "teaching")

  if (loading) {
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
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Employees</CardTitle><Users className="h-4 w-4 text-blue-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{staff.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Teaching Staff</CardTitle><Briefcase className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{teachingStaff.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Non-Teaching</CardTitle><Users className="h-4 w-4 text-purple-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{nonTeaching.length}</div></CardContent></Card>
      </div>
    </div>
  )
}
