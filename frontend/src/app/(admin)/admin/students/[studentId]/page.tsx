"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericDetailCard } from "@/components/ui/generic-detail-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { studentService } from "@/services/api"
import api from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { QrCode, CreditCard, CheckCircle, FileText, DownloadCloud } from "lucide-react"
import Link from "next/link"

export default function AdminStudentDetailPage() {
  const params = useParams()
  const id = params.studentId as string
  const [student, setStudent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [qrUuid, setQrUuid] = useState("")
  const [nfcUid, setNfcUid] = useState("")
  const [nfcStatus, setNfcStatus] = useState("")

  useEffect(() => {
    if (!id) return
    setLoading(true)
    studentService.get(id)
      .then((r) => setStudent(r.data))
      .catch(() => { setError("Student not found"); toast({ title: "Student not found", variant: "destructive" }) })
      .finally(() => setLoading(false))
  }, [id])

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
    return <GenericDetailCard title="Student" backHref="/admin/students" loading={loading} error={error} fields={[]} />
  }

  return (
    <div className="space-y-6">
      <GenericDetailCard
        title={`${student.first_name} ${student.last_name}`}
        backHref="/admin/students"
        loading={loading}
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
              { label: "Stream", value: student.stream || "\u2014" },
              { label: "Medical Notes", value: student.medical_notes || "\u2014" },
            ],
          },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" />Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href={`/admin/students/${id}/transcript`}>
              <Button variant="outline" size="sm" className="w-full"><DownloadCloud className="mr-2 h-4 w-4" />View Transcript</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><QrCode className="h-5 w-5" />QR Code</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Button onClick={generateQr} variant="outline" size="sm"><QrCode className="mr-2 h-4 w-4" />Generate</Button>
            {qrUuid && <span className="text-xs font-mono text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" />{qrUuid}</span>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><CreditCard className="h-5 w-5" />NFC Card</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <input placeholder="NFC UID" value={nfcUid}
                onChange={e => setNfcUid(e.target.value)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-full" />
              <Button onClick={assignNfc} variant="outline" size="sm">Assign</Button>
            </div>
            {nfcStatus && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" />{nfcStatus}</span>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
