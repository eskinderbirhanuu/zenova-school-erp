"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { qrService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { QrCode, Download, Copy, Check } from "lucide-react"

export default function QRPage() {
  const [studentIds, setStudentIds] = useState("")
  const [qrCodes, setQrCodes] = useState<any[]>([])
  const [generating, setGenerating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const generateAll = async () => {
    const ids = studentIds.split("\n").map(s => s.trim()).filter(Boolean)
    if (ids.length === 0) { toast({ title: "Enter at least one student ID", variant: "destructive" }); return }
    setGenerating(true)
    try {
      const res = await qrService.generate({ student_ids: ids } as any)
      const data = Array.isArray(res.data) ? res.data : (res.data as any)?.codes || []
      setQrCodes(data)
      toast({ title: `Generated ${data.length} QR code(s)` })
    } catch { toast({ title: "Generation failed", variant: "destructive" }) }
    setGenerating(false)
  }

  const generateSingle = async (sid: string) => {
    try {
      const res = await qrService.generate({ student_ids: [sid] } as any)
      const data = Array.isArray(res.data) ? res.data[0] : (res.data as any)?.codes?.[0]
      if (data) {
        setQrCodes(prev => {
          const filtered = prev.filter((q: any) => q.student_id !== sid)
          return [...filtered, data]
        })
      }
      toast({ title: `QR generated for ${sid}` })
    } catch { toast({ title: `Failed for ${sid}`, variant: "destructive" }) }
  }

  const copyUuid = async (uuid: string) => {
    try {
      await navigator.clipboard.writeText(uuid)
      setCopiedId(uuid)
      setTimeout(() => setCopiedId(null), 2000)
    } catch { toast({ title: "Copy failed", variant: "destructive" }) }
  }

  const downloadAll = () => {
    if (qrCodes.length === 0) return
    const lines = qrCodes.map((q: any) => `${q.student_id || q.student_name || ""},${q.uuid}`).join("\n")
    const blob = new Blob(["student_id,uuid\n" + lines], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "qr_codes.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">QR Code Generation</h1>
        {qrCodes.length > 0 && (
          <Button variant="outline" onClick={downloadAll}><Download className="mr-2 h-4 w-4" />Download CSV</Button>
        )}
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><QrCode className="h-5 w-5" /> Batch Generate</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Student IDs (one per line)</label>
            <textarea value={studentIds} onChange={e => setStudentIds(e.target.value)}
              placeholder="STU-001&#10;STU-002&#10;STU-003"
              className="flex h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" />
          </div>
          <Button onClick={generateAll} disabled={generating}>
            <QrCode className="mr-2 h-4 w-4" />{generating ? "Generating..." : "Generate QR Codes"}
          </Button>
        </CardContent>
      </Card>
      {qrCodes.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Generated QR Codes ({qrCodes.length})</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Student</th>
                  <th className="pb-3 font-medium">UUID</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {qrCodes.map((q: any, i: number) => (
                  <tr key={q.uuid || i} className="border-b last:border-0">
                    <td className="py-3">{q.student_id || q.student_name || `#${i + 1}`}</td>
                    <td className="py-3 font-mono text-xs">{q.uuid}</td>
                    <td className="py-3">
                      <Button variant="ghost" size="sm" onClick={() => copyUuid(q.uuid)}>
                        {copiedId === q.uuid ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      {qrCodes.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Enter student IDs above and click Generate to create QR codes
          </CardContent>
        </Card>
      )}
    </div>
  )
}
