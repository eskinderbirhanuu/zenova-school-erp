"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import api from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Upload, ArrowLeft, Download, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function BulkImportPage() {
  const [tab, setTab] = useState<"students" | "staff">("students")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const templateFields = tab === "students"
    ? ["first_name", "last_name", "gender", "date_of_birth", "email", "phone", "address"]
    : ["first_name", "last_name", "email", "phone", "role", "department"]

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setResult(null)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      const lines = text.split("\n").filter(l => l.trim())
      if (lines.length < 2) { toast({ title: "CSV must have header + at least 1 row", variant: "destructive" }); return }
      const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""))
      const rows = lines.slice(1, 11).map(line => {
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
    const header = templateFields.join(",")
    const sample = tab === "students"
      ? "John,Doe,Male,2010-01-15,john@example.com,+251911000000,Addis Ababa"
      : "Jane,Smith,jane@school.com,+251922000000,teacher,Science"
    const csv = [header, sample].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = `${tab}_template.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const doImport = async () => {
    if (!file) { toast({ title: "Select a CSV file", variant: "destructive" }); return }
    setImporting(true)
    setResult(null)
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
        const endpoint = tab === "students" ? "/students/bulk-import" : "/staff/bulk-import"
        const res = await api.post(endpoint, rows)
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
        <h1 className="text-3xl font-bold">Bulk Import</h1>
        <div className="flex gap-2">
          <Button variant={tab === "students" ? "default" : "outline"} size="sm" onClick={() => { setTab("students"); setFile(null); setPreview([]); setResult(null) }}>Students</Button>
          <Button variant={tab === "staff" ? "default" : "outline"} size="sm" onClick={() => { setTab("staff"); setFile(null); setPreview([]); setResult(null) }}>Staff</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Import {tab === "students" ? "Students" : "Staff"} from CSV</CardTitle>
            <Button variant="outline" size="sm" onClick={downloadTemplate}><Download className="mr-2 h-4 w-4" />Download Template</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="text-sm" />
            <Button onClick={doImport} disabled={!file || importing}>
              <Upload className="mr-2 h-4 w-4" />{importing ? "Importing..." : "Import"}
            </Button>
          </div>

          {preview.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Preview ({preview.length} rows):</p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-left text-muted-foreground">
                      {Object.keys(preview[0]).map((h) => <th key={h} className="p-2 font-medium text-xs">{h}</th>)}
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
              <span className="text-sm">{result.success ? `✅ ${result.message}` : `❌ ${result.message}`}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
