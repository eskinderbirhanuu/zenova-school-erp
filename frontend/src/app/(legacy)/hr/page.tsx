"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { hrService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { UserCheck, Calendar, FileText, Users } from "lucide-react"

export default function HRPage() {
  const [contracts, setContracts] = useState<any[]>([])
  const [leaveRequests, setLeaveRequests] = useState<any[]>([])
  const [staffId, setStaffId] = useState("")
  const [leaveType, setLeaveType] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [tab, setTab] = useState<"contracts" | "leave" | "attendance">("contracts")

  useEffect(() => {
    hrService.contracts.list().then((r) => setContracts(r.data)).catch(() => {})
    hrService.leaveRequests.list().then((r) => setLeaveRequests(r.data)).catch(() => {})
  }, [])

  const requestLeave = async () => {
    try {
      await hrService.leaveRequests.create({ staff_profile_id: staffId, leave_type_id: leaveType, start_date: startDate, end_date: endDate })
      toast({ title: "Leave requested" }); setStaffId(""); setLeaveType(""); setStartDate(""); setEndDate("")
      hrService.leaveRequests.list().then((r) => setLeaveRequests(r.data))
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.detail, variant: "destructive" })
    }
  }

  const approveLeave = async (id: string) => {
    try { await hrService.leaveRequests.approve(id); toast({ title: "Approved" }); hrService.leaveRequests.list().then((r) => setLeaveRequests(r.data)) }
    catch (e: any) { toast({ title: "Error", description: e.response?.data?.detail, variant: "destructive" }) }
  }

  const stats = [
    { title: "Active Contracts", value: contracts.filter((c: any) => c.status === "active").length, icon: FileText, color: "text-blue-600" },
    { title: "Pending Leave", value: leaveRequests.filter((l: any) => l.status === "pending").length, icon: Calendar, color: "text-orange-600" },
    { title: "Approved Leave", value: leaveRequests.filter((l: any) => l.status === "approved").length, icon: UserCheck, color: "text-green-600" },
    { title: "Staff", value: contracts.length, icon: Users, color: "text-purple-600" },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">HR Management</h1>
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{s.title}</CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{s.value}</div></CardContent>
          </Card>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant={tab === "contracts" ? "default" : "outline"} onClick={() => setTab("contracts")}>Contracts</Button>
        <Button variant={tab === "leave" ? "default" : "outline"} onClick={() => setTab("leave")}>Leave</Button>
        <Button variant={tab === "attendance" ? "default" : "outline"} onClick={() => setTab("attendance")}>Attendance</Button>
      </div>
      {tab === "leave" && (
        <>
          <Card>
            <CardHeader><CardTitle>Request Leave</CardTitle></CardHeader>
            <CardContent className="flex gap-4 items-end flex-wrap">
              <div className="space-y-2"><Label>Staff ID</Label><Input value={staffId} onChange={(e) => setStaffId(e.target.value)} /></div>
              <div className="space-y-2"><Label>Leave Type ID</Label><Input value={leaveType} onChange={(e) => setLeaveType(e.target.value)} /></div>
              <div className="space-y-2"><Label>Start</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>End</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
              <Button onClick={requestLeave}>Submit</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Leave Requests</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Staff</th><th className="pb-3 font-medium">Days</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.map((l: any) => (
                    <tr key={l.id} className="border-b last:border-0">
                      <td className="py-3">{l.staff_profile_id?.substring(0, 8)}</td>
                      <td className="py-3">{l.days}</td>
                      <td className="py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${
                          l.status === "approved" ? "bg-green-100 text-green-700" :
                          l.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                        }`}>{l.status}</span>
                      </td>
                      <td className="py-3">
                        {l.status === "pending" && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => approveLeave(l.id)}>Approve</Button>
                            <Button size="sm" variant="ghost" className="text-red-600">Reject</Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
      {tab === "contracts" && (
        <Card>
          <CardHeader><CardTitle>Contracts</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Staff</th><th className="pb-3 font-medium">Position</th><th className="pb-3 font-medium">Salary</th><th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c: any) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-3">{c.staff_profile_id?.substring(0, 8)}</td>
                    <td className="py-3">{c.position}</td>
                    <td className="py-3">${c.basic_salary?.toLocaleString()}</td>
                    <td className="py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${c.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>{c.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
