"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KPICard } from "@/components/ui/kpi-card"
import api from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Briefcase, Users, Calendar, FileCheck, Loader2 } from "lucide-react"

const statusColor: Record<string, string> = {
  Open: "bg-green-100 text-green-700",
  Interviewing: "bg-blue-100 text-blue-700",
  Closed: "bg-gray-100 text-gray-700",
}

export default function HrRecruitmentPage() {
  const [positions, setPositions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get("/recruitment", { params: { limit: 200 } })
      .then(res => setPositions(res.data || []))
      .catch(err => toast({ title: "Failed to load positions", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

  const openPositions = positions.filter(p => p.status === "Open").length
  const totalApplicants = positions.reduce((a, c) => a + (c.applicants_count || 0), 0)
  const interviews = positions.filter(p => p.status === "Interviewing").length
  const offers = positions.filter(p => p.status === "Closed").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Recruitment</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Open Positions" value={loading ? "-" : openPositions} icon={Briefcase} iconColor="text-blue-600" />
        <KPICard title="Total Applicants" value={loading ? "-" : totalApplicants} icon={Users} iconColor="text-green-600" />
        <KPICard title="Interviews Scheduled" value={loading ? "-" : interviews} icon={Calendar} iconColor="text-yellow-600" />
        <KPICard title="Offers Extended" value={loading ? "-" : offers} icon={FileCheck} iconColor="text-purple-600" />
      </div>

      <Card>
        <CardHeader><CardTitle>Open Positions</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-4 font-medium">Position</th><th className="p-4 font-medium">Department</th><th className="p-4 font-medium">Applicants</th><th className="p-4 font-medium">Status</th><th className="p-4 font-medium">Posted Date</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>}
              {!loading && positions.map((p: any) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-4 font-medium">{p.position}</td>
                  <td className="p-4 text-muted-foreground">{p.department || "—"}</td>
                  <td className="p-4">{p.applicants_count || 0}</td>
                  <td className="p-4"><span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[p.status] || ""}`}>{p.status}</span></td>
                  <td className="p-4 text-muted-foreground">{p.posted_date ? new Date(p.posted_date).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
              {!loading && positions.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground"><Briefcase className="mx-auto h-8 w-8 mb-2 opacity-50" /><p>No records found</p></td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
