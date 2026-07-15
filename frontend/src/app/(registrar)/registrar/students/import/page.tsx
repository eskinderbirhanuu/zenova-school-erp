"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import api from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Upload, Download, CheckCircle, AlertCircle, FileSpreadsheet } from "lucide-react"
import Link from "next/link"

export default function StudentImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [importMode, setImportMode] = useState<"csv" | "excel">("csv")

  const templateFields = ["first_name", "middle_name", "last_name", "gender", "date_of_birth", "nationality", "blood_group", "address", "emergency_contact", "stream", "medical_notes"]

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setResult(null)
    const isExcel = f.name.endsWith(".xlsx") || f.name.endsWith(".xls")
    setImportMode(isExcel ? "excel" : "csv")
    if (isExcel) {
      setPreview([{ info: "Excel file selected — preview available after import" }])
      return
    }
    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      const lines = text.split("\n").filter(l => l.trim())
      if (lines.length < 2) { toast({ title: "CSV must have header + at least 1 row", variant: "destructive" }); return }
      const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""))
      const rows = lines.slice(1, 11).filter(l => l.trim()).map(line => {
        const vals = line.split(",").map(v => v.trim().replace(/"/g, ""))
        const row: Record<string, string> = {}
        headers.forEach((h, i) => { row[h] = vals[i] || "" })
        return row
      })
      setPreview(rows)
    }
    reader.readAsText(f)
  }

  const downloadTemplate = () => {
    if (importMode === "excel") {
      api.get("/students/export-excel", { responseType: "blob" }).then((res: any) => {
        const url = URL.createObjectURL(new Blob([res.data]))
        const a = document.createElement("a"); a.href = url; a.download = "student_template.xlsx"; a.click()
        URL.revokeObjectURL(url)
      }).catch(() => {
        const header = templateFields.join(",")
        const sample = "John,Abebe,Doe,Male,2010-01-15,Ethiopian,O+,Addis Ababa,+251911000000,natural,\"Asthma, allergic to penicillin\""
        const csv = [header, sample].join("\n")
        const blob = new Blob([csv], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a"); a.href = url; a.download = "student_import_template.csv"; a.click()
        URL.revokeObjectURL(url)
      })
      return
    }
    const header = templateFields.join(",")
    const sample = "John,Abebe,Doe,Male,2010-01-15,Ethiopian,O+,Addis Ababa,+251911000000,natural,\"Asthma, allergic to penicillin\""
    const csv = [header, sample].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "student_import_template.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  const doImport = async () => {
    if (!file) { toast({ title: "Select a file", variant: "destructive" }); return }
    setImporting(true)
    setResult(null)

    if (importMode === "excel") {
      const formData = new FormData()
      formData.append("file", file)
      try {
        const res = await api.post("/students/import-excel", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        setResult({ success: true, message: res.data.message || "Import successful", count: res.data.count })
        toast({ title: "Excel import successful" })
      } catch (err: any) {
        setResult({ success: false, message: err.response?.data?.detail || "Import failed" })
        toast({ title: "Import failed", variant: "destructive" })
      }
      setImporting(false)
      return
    }

    const reader = new FileReader()
    reader.onload = async (evt) => {
      const text = evt.target?.result as string
      const lines = text.split("\n").filter(l => l.trim())
      if (lines.length < 2) { toast({ title: "Invalid CSV", variant: "destructive" }); setImporting(false); return }
      const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""))
      const rows = lines.slice(1).map(line => {
        const vals = line.split(",").map(v => v.trim().replace(/"/g, ""))
        const row: Record<string, any> = {}
        headers.forEach((h, i) => { row[h] = vals[i] || null })
        return row
      })
      try {
        const res = await api.post("/students/bulk-import", rows)
        setResult({ success: true, message: res.data.message || `${rows.length} imported`, count: res.data.count || rows.length })
        toast({ title: "Import successful" })
      } catch (err: any) {
        setResult({ success: false, message: err.response?.data?.detail || "Import failed" })
        toast({ title: "Import failed", variant: "destructive" })
      }
      setImporting(false)
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Import Students</h1>
        <Link href="/registrar/students"><Button variant="outline" size="sm">Back to Students</Button></Link>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Bulk Import from {importMode === "excel" ? "Excel" : "CSV"}</CardTitle>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />Download {importMode === "excel" ? "Excel" : "CSV"} Template
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="text-sm" />
            <Button onClick={doImport} disabled={!file || importing}>
              <Upload className="mr-2 h-4 w-4" />{importing ? "Importing..." : "Import"}
            </Button>
          </div>
          {file && importMode === "excel" && (
            <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <FileSpreadsheet className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-blue-800">Excel file selected: {file.name}</span>
            </div>
          )}
          {preview.length > 0 && importMode === "csv" && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Preview ({preview.length} rows):</p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-left text-muted-foreground">
                      {Object.keys(preview[0]).map((h: any) => <th key={h} className="p-2 font-medium text-xs">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t last:border-0">
                        {Object.values(row).map((v: any, j) => <td key={j} className="p-2 text-xs">{v}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {result && (
            <div className={`flex items-center gap-2 rounded-lg border p-4 ${result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
              {result.success ? <CheckCircle className="h-5 w-5 text-green-600" /> : <AlertCircle className="h-5 w-5 text-red-600" />}
              <span className="text-sm">{result.success ? result.message : result.message}</span>
            </div>
          )}
          {!preview.length && !result && (
            <p className="text-sm text-muted-foreground py-4 text-center">Select a CSV or Excel (.xlsx) file to import student records</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
