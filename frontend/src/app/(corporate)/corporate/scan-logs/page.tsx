"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { nfcV2Service } from "@/services/api"
import { Loader2 } from "lucide-react"

export default function ScanLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    nfcV2Service.listScanLogs().then(r => setLogs(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader title="NFC Scan Logs" description="Audit trail of all NFC card scans" />
      <Card>
        <CardHeader><CardTitle>Scan History</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Card UID</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Reference</th>
                  <th className="pb-3 font-medium">Scan Type</th>
                  <th className="pb-3 font-medium">Location</th>
                  <th className="pb-3 font-medium">Scanned At</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td className="py-8 text-center text-muted-foreground" colSpan={6}>No scan logs</td></tr>
                ) : logs.map((l: any) => (
                  <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 font-mono text-xs">{l.card_uid}</td>
                    <td className="py-3 capitalize">{l.reference_type}</td>
                    <td className="py-3 font-mono text-xs">{l.reference_id}</td>
                    <td className="py-3 capitalize">{l.scan_type}</td>
                    <td className="py-3">{l.reader_location || "—"}</td>
                    <td className="py-3 text-muted-foreground text-xs">{new Date(l.scanned_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
