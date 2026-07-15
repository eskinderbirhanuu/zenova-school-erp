"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericDetailCard } from "@/components/ui/generic-detail-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useStudent } from "@/hooks/queries"
import api from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { QrCode, CreditCard, CheckCircle, XCircle } from "lucide-react"

export default function StudentDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { data: student, isLoading, error } = useStudent(id)
  const [qrUuid, setQrUuid] = useState("")
  const [nfcUid, setNfcUid] = useState("")
  const [nfcStatus, setNfcStatus] = useState("")

  const generateQr = async () => {
    try {
      const res = await api.post(`/students/${id}/generate-qr`)
      setQrUuid(res.data.uuid)
      toast({ title: "QR code generated" })
    } catch { toast({ title: "Failed to generate QR", variant: "destructive" }) }
  }

  const assignNfc = async () => {
    if (!nfcUid.trim()) { toast({ title: "Enter NFC card UID", variant: "destructive" }); return }
    try {
      const res = await api.post(`/students/${id}/assign-nfc?card_uid=${encodeURIComponent(nfcUid.trim())}`)
      setNfcStatus(`Assigned: ${res.data.card_uid} (${res.data.status})`)
      toast({ title: "NFC card assigned" })
    } catch (err: any) { toast({ title: err.response?.data?.detail || "Failed to assign NFC", variant: "destructive" }) }
  }

  if (!student) {
    return <GenericDetailCard title="Student" backHref="/registrar/students" loading={isLoading} error={error ? "Student not found" : ""} fields={[]} />
  }

  return (
    <div className="space-y-6">
      <GenericDetailCard
        title={`${student.first_name} ${student.last_name}`}
        backHref="/registrar/students"
        editHref={`/registrar/students/${id}/edit`}
        loading={isLoading}
        fields={[
          { label: "Student ID", value: <span className="font-mono text-xs text-muted-foreground">{student.student_id}</span> },
          { label: "First Name", value: student.first_name },
          { label: "Middle Name", value: student.middle_name },
          { label: "Last Name", value: student.last_name },
          { label: "Gender", value: student.gender },
          { label: "Date of Birth", value: student.date_of_birth },
          { label: "Nationality", value: student.nationality },
          { label: "Blood Group", value: student.blood_group },
          { label: "Emergency Contact", value: student.emergency_contact },
          { label: "Status", value: <StatusBadge status={student.status} /> },
        ]}
        sections={[
          {
            title: "Academic Info",
            fields: [
              { label: "Grade", value: student.grade_id || "Not assigned" },
              { label: "Section", value: student.section_id || "\u2014" },
              { label: "Stream", value: (student as any).stream || "\u2014" },
              { label: "Medical Notes", value: student.medical_notes || "\u2014" },
            ],
          },
        ]}
      />
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><QrCode className="h-5 w-5" />QR Code</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-4">
          <Button onClick={generateQr} variant="outline" size="sm"><QrCode className="mr-2 h-4 w-4" />Generate QR</Button>
          {qrUuid && <span className="text-xs font-mono text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" />{qrUuid}</span>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CreditCard className="h-5 w-5" />NFC Card</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <input placeholder="Enter NFC card UID" value={nfcUid}
              onChange={e => setNfcUid(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-64" />
            <Button onClick={assignNfc} variant="outline" size="sm"><CreditCard className="mr-2 h-4 w-4" />Assign</Button>
          </div>
          {nfcStatus && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" />{nfcStatus}</span>}
        </CardContent>
      </Card>
    </div>
  )
}
