"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { nfcV2Service } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { CreditCard, CheckCircle, XCircle } from "lucide-react"

export default function NFCPage() {
  const [studentId, setStudentId] = useState("")
  const [cardUid, setCardUid] = useState("")
  const [assigning, setAssigning] = useState(false)
  const [validateUid, setValidateUid] = useState("")
  const [validationResult, setValidationResult] = useState<any>(null)
  const [validating, setValidating] = useState(false)
  const [recentAssignments, setRecentAssignments] = useState<any[]>([])

  const doAssign = async () => {
    if (!studentId || !cardUid) { toast({ title: "Fill in student ID and card UID", variant: "destructive" }); return }
    setAssigning(true)
    try {
      await nfcV2Service.assignStudent({ reference_id: studentId, card_uid: cardUid })
      toast({ title: "NFC card assigned" })
      setRecentAssignments(prev => [{ student_id: studentId, card_uid: cardUid, assigned_at: new Date().toISOString() }, ...prev].slice(0, 10))
      setStudentId(""); setCardUid("")
    } catch (err: any) {
      toast({ title: "Assignment failed", description: err.response?.data?.detail || "Check card UID", variant: "destructive" })
    }
    setAssigning(false)
  }

  const doValidate = async () => {
    if (!validateUid) { toast({ title: "Enter a card UID to validate", variant: "destructive" }); return }
    setValidating(true)
    try {
      const res = await nfcV2Service.getStudentByCard(validateUid)
      setValidationResult({ valid: true, student_id: res.data.student_id, student_name: res.data.first_name + " " + res.data.last_name })
    } catch (err: any) {
      setValidationResult({ valid: false, error: err.response?.data?.detail || "Card not found or invalid" })
    }
    setValidating(false)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">NFC Card Management</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Assign Card</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Student ID</label>
              <Input value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="e.g. STU-001" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Card UID</label>
              <Input value={cardUid} onChange={e => setCardUid(e.target.value)} placeholder="Scan or enter NFC card UID" />
            </div>
            <Button onClick={doAssign} disabled={assigning}>
              {assigning ? "Assigning..." : "Assign Card"}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5" /> Validate Card</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Card UID</label>
              <Input value={validateUid} onChange={e => setValidateUid(e.target.value)} placeholder="Enter card UID to validate" />
            </div>
            <Button onClick={doValidate} disabled={validating}>
              {validating ? "Validating..." : "Validate"}
            </Button>
            {validationResult && (
              <div className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${validationResult.valid !== false ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                {validationResult.valid !== false ? (
                  <><CheckCircle className="h-4 w-4 text-green-600" /><span>Valid — assigned to {validationResult.student_name || validationResult.student_id}</span></>
                ) : (
                  <><XCircle className="h-4 w-4 text-red-600" /><span>{validationResult.error || "Invalid card"}</span></>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Recent Assignments</CardTitle></CardHeader>
        <CardContent>
          {recentAssignments.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Student ID</th>
                  <th className="pb-3 font-medium">Card UID</th>
                  <th className="pb-3 font-medium">Assigned At</th>
                </tr>
              </thead>
              <tbody>
                {recentAssignments.map((a, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-3">{a.student_id}</td>
                    <td className="py-3 font-mono text-xs">{a.card_uid}</td>
                    <td className="py-3">{new Date(a.assigned_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">No recent assignments</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
