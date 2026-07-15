"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KPICard } from "@/components/ui/kpi-card"
import { usePerformanceReviews } from "@/hooks/queries"
import { Award, Users, Clock, Star, Loader2 } from "lucide-react"

const ratingColor: Record<string, string> = {
  Excellent: "bg-green-100 text-green-700",
  Good: "bg-blue-100 text-blue-700",
  Average: "bg-yellow-100 text-yellow-700",
  Poor: "bg-red-100 text-red-700",
}

export default function HrPerformancePage() {
  const { data: employees, isLoading } = usePerformanceReviews({ limit: 200 })

  const avgScore = employees?.length ? Math.round(employees.reduce((a: any, c: any) => a + (c.rating || 0), 0) / employees.length) : 0
  const reviewed = employees?.filter((e: any) => e.rating !== null && e.rating !== undefined).length || 0
  const pending = employees?.filter((e: any) => e.rating === null || e.rating === undefined).length || 0
  const achievers = employees?.filter((e: any) => e.rating !== null && e.rating >= 90).length || 0

  const labelRating = (score: number | null): string => {
    if (score === null || score === undefined) return "—"
    if (score >= 90) return "Excellent"
    if (score >= 80) return "Good"
    if (score >= 70) return "Average"
    return "Poor"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Performance</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Avg Performance Score" value={isLoading ? "-" : `${avgScore}%`} icon={Award} iconColor="text-blue-600" />
        <KPICard title="Employees Reviewed" value={isLoading ? "-" : reviewed} icon={Users} iconColor="text-green-600" />
        <KPICard title="Pending Reviews" value={isLoading ? "-" : pending} icon={Clock} iconColor="text-yellow-600" />
        <KPICard title="Outstanding Achievers" value={isLoading ? "-" : achievers} icon={Star} iconColor="text-purple-600" />
      </div>

      <Card>
        <CardHeader><CardTitle>Employee Performance</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-4 font-medium">Staff ID</th><th className="p-4 font-medium">Period</th><th className="p-4 font-medium">Score</th><th className="p-4 font-medium">Rating</th><th className="p-4 font-medium">Last Review</th><th className="p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>}
              {!isLoading && employees?.map((e: any) => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-4 font-medium">{e.staff_profile_id ? e.staff_profile_id.substring(0, 8) + "..." : "—"}</td>
                  <td className="p-4 text-muted-foreground">{e.period || "—"}</td>
                  <td className="p-4">{e.rating !== null ? `${e.rating}%` : "—"}</td>
                  <td className="p-4"><span className={`rounded-full px-2 py-0.5 text-xs ${e.rating !== null ? (ratingColor[labelRating(e.rating)] || "") : "bg-gray-100 text-gray-700"}`}>{e.rating !== null ? labelRating(e.rating) : "—"}</span></td>
                  <td className="p-4 text-muted-foreground">{e.created_at ? new Date(e.created_at).toLocaleDateString() : "—"}</td>
                  <td className="p-4"><span className={`rounded-full px-2 py-0.5 text-xs ${e.rating !== null ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{e.rating !== null ? "Reviewed" : "Pending"}</span></td>
                </tr>
              ))}
              {!isLoading && (!employees || employees.length === 0) && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground"><Award className="mx-auto h-8 w-8 mb-2 opacity-50" /><p>No records found</p></td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
