"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/ui/page-header"
import { nfcV2Service } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Upload, CheckCircle, XCircle, Download, Loader2 } from "lucide-react"

export default function BulkAssignPage() {
  const [csvText, setCsvText] = useState("")
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setCsvText(ev.target?.result as string || "")
    reader.readAsText(file)
  }

  const parseCsv = (text: string): any[] => {
    const lines = text.trim().split("\n")
    if (lines.length < 2) return []
    const headers = lines[0].split(",").map(h => h.trim())
    const items: any[] = []
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(",").map(v => v.trim())
      if (vals.length < 3) continue
      const item: any = {}
      headers.forEach((h, idx) => { if (vals[idx]) item[h] = vals[idx] })
      if (item.card_type && item.reference_id && item.card_uid) {
        items.push(item)
      }
    }
    return items
  }

  const doBulkAssign = async () => {
    const items = parseCsv(csvText)
    if (items.length === 0) {
      toast({ title: "No valid rows", description: "CSV needs card_type,reference_id,card_uid columns", variant: "destructive" })
      return
    }
    setProcessing(true)
    setResult(null)
    try {
      const res = await nfcV2Service.bulkAssign(items)
      setResult(res.data)
      toast({ title: `Assigned ${(res.data as any).success_count} cards` })
    } catch (err: any) {
      toast({ title: "Bulk assign failed", description: err.response?.data?.detail || err.message, variant: "destructive" })
    }
    setProcessing(false)
  }

  const sampleCsv = `card_type,reference_id,card_uid,card_tier
student,stu-uuid-1,04:A7:12:9C:B1,standard
employee,emp-uuid-2,04:A7:12:9C:B2,premium
staff,staff-uuid-3,04:A7:12:9C:B3,standard`

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk Card Assignment"
        description="Assign multiple NFC cards at once via CSV upload"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" /> Upload CSV
            </CardTitle>
            <CardDescription>Columns: card_type, reference_id, card_uid, card_tier (optional)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                <Download className="h-4 w-4 mr-2" /> Upload CSV File
              </Button>
            </div>

            <textarea
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              placeholder={sampleCsv}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono h-48 resize-y"
            />

            <div className="text-xs text-muted-foreground space-y-1">
              <p>card_type: student | staff | parent | employee</p>
              <p>reference_id: UUID of the person in the system</p>
              <p>card_uid: NFC card UID (e.g., 04:A7:12:9C:B1)</p>
              <p>card_tier: standard (default) | premium</p>
            </div>

            <Button onClick={doBulkAssign} disabled={processing} className="w-full">
              {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {processing ? "Assigning..." : `Assign ${parseCsv(csvText).length} Cards`}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5" />}
              Results
            </CardTitle>
            <CardDescription>Assignment results will appear here</CardDescription>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Upload className="h-12 w-12 mb-4 opacity-30" />
                <p className="text-sm">Upload a CSV and click assign</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 rounded-lg border border-green-200 bg-green-50 p-3 text-center">
                    <p className="text-2xl font-bold text-green-700">{result.success_count}</p>
                    <p className="text-xs text-green-600">Success</p>
                  </div>
                  <div className="flex-1 rounded-lg border border-red-200 bg-red-50 p-3 text-center">
                    <p className="text-2xl font-bold text-red-700">{result.failure_count}</p>
                    <p className="text-xs text-red-600">Failed</p>
                  </div>
                </div>

                {result.errors?.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Errors:</p>
                    {result.errors.map((err: any, i: number) => (
                      <Badge key={i} variant="outline" className="block text-left text-xs font-normal p-2 border-red-200 bg-red-50">
                        Row {err.row}: {err.reason}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
