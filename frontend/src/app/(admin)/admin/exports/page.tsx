"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, FileSpreadsheet, Calendar, Users, DollarSign, BookOpen, Loader2 } from "lucide-react"
import api from "@/services/api"

const EXPORT_TYPES = [
  { id: "students", label: "Students", icon: Users, endpoint: "/students/export-excel", description: "All student records with class and status" },
  { id: "invoices", label: "Invoices", icon: DollarSign, endpoint: "/invoices/export-excel", description: "Invoice records with amounts and status" },
  { id: "payments", label: "Payments", icon: DollarSign, endpoint: "/payments/export-excel", description: "Payment records and transaction history" },
  { id: "exam-results", label: "Exam Results", icon: BookOpen, endpoint: "/exam-results/export-excel", description: "Exam results with scores and grades" },
  { id: "attendance", label: "Attendance", icon: Calendar, endpoint: "/attendance/export", description: "Attendance records with date range filter" },
] as const

export default function ExportCenterPage() {
  const [selected, setSelected] = useState<string>("students")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [loading, setLoading] = useState<string | null>(null)

  const exportType = EXPORT_TYPES.find((t: any) => t.id === selected)
  const needsDate = selected === "attendance"

  const doExport = async () => {
    if (!exportType) return
    setLoading(selected)
    try {
      const params: Record<string, string> = {}
      if (needsDate) {
        if (dateFrom) params.date_from = dateFrom
        if (dateTo) params.date_to = dateTo
      }
      const r = await api.get(exportType.endpoint, { params, responseType: "blob" })
      const url = URL.createObjectURL(new Blob([r.data]))
      const a = document.createElement("a")
      a.href = url
      a.download = `${selected}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert("Export failed. Check permissions and try again.")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Data Export</h1>
        <p className="text-sm text-muted-foreground">Export school data to Excel spreadsheets</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {EXPORT_TYPES.map((t: any) => {
          const Icon = t.icon
          return (
            <Card
              key={t.id}
              className={`cursor-pointer transition-all hover:border-primary ${selected === t.id ? "border-primary ring-1 ring-primary" : ""}`}
              onClick={() => setSelected(t.id)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-4 w-4" /> {t.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{t.description}</CardDescription>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Export {exportType?.label || "Data"}
          </CardTitle>
          <CardDescription>Configure export options then download</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {needsDate && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Date From</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Date To</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
          )}

          <Button onClick={doExport} disabled={loading !== null} className="gap-2">
            {loading === selected ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {loading === selected ? "Exporting..." : `Download ${exportType?.label || ""}.xlsx`}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
