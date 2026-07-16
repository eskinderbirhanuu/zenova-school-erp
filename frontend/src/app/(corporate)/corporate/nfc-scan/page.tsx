"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/ui/page-header"
import { nfcV2Service } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { CreditCard, Scan, CheckCircle, XCircle, User, Smartphone, Loader2 } from "lucide-react"

const CARD_COLORS: Record<string, string> = {
  student: "bg-blue-50 border-blue-200 text-blue-700",
  staff: "bg-purple-50 border-purple-200 text-purple-700",
  parent: "bg-teal-50 border-teal-200 text-teal-700",
  employee: "bg-emerald-50 border-emerald-200 text-emerald-700",
}

function isWebNfcSupported(): boolean {
  return typeof navigator !== "undefined" && "nfc" in navigator
}

export default function NfcScanPage() {
  const [cardUid, setCardUid] = useState("")
  const [scanType, setScanType] = useState("verification")
  const [scanning, setScanning] = useState(false)
  const [nfcReading, setNfcReading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const doScan = async () => {
    if (!cardUid) { toast({ title: "Enter a card UID", variant: "destructive" }); return }
    setScanning(true)
    setResult(null)
    try {
      const res = await nfcV2Service.scan({ card_uid: cardUid, scan_type: scanType } as any)
      setResult(res.data)
    } catch (err: any) {
      setResult({ success: false, message: err.response?.data?.detail || "Card not found" })
    }
    setScanning(false)
  }

  const readViaNfc = useCallback(async () => {
    if (!isWebNfcSupported()) {
      toast({ title: "Web NFC not supported", description: "Use Android Chrome or a dedicated reader", variant: "destructive" })
      return
    }
    setNfcReading(true)
    try {
      const ndef = new (window as any).NDEFReader()
      await ndef.scan()
      ndef.addEventListener("reading", ({ message }: any) => {
        for (const record of message.records) {
          if (record.recordType === "text") {
            const decoder = new TextDecoder(record.encoding || "utf-8")
            const text = decoder.decode(record.data)
            setCardUid(text.trim())
            setNfcReading(false)
            toast({ title: "Card read via NFC", description: text.trim() })
            return
          }
        }
        // Fallback: use serial number if available
        toast({ title: "Card detected", description: "Try entering the UID manually" })
        setNfcReading(false)
      })
      ndef.addEventListener("readingerror", () => {
        toast({ title: "NFC read error", variant: "destructive" })
        setNfcReading(false)
      })
    } catch (err: any) {
      toast({ title: "NFC error", description: err.message, variant: "destructive" })
      setNfcReading(false)
    }
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader title="NFC Scan" description="Tap or enter a card UID to identify the cardholder" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" /> Scan Card
            </CardTitle>
            <CardDescription>Enter the NFC card UID or use your phone&apos;s NFC reader</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Card UID</label>
              <div className="flex gap-2">
                <Input
                  value={cardUid}
                  onChange={e => setCardUid(e.target.value)}
                  placeholder="e.g. 04:A7:12:9C:B1"
                  onKeyDown={e => e.key === "Enter" && doScan()}
                  autoFocus
                  className="flex-1"
                />
                {isWebNfcSupported() && (
                  <Button variant="outline" onClick={readViaNfc} disabled={nfcReading} title="Read via phone NFC">
                    {nfcReading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Scan Type</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={scanType}
                onChange={e => setScanType(e.target.value)}
              >
                <option value="verification">Verification</option>
                <option value="attendance">Attendance</option>
                <option value="gate">Gate Entry</option>
                <option value="library">Library</option>
                <option value="cafeteria">Cafeteria</option>
              </select>
            </div>
            <Button onClick={doScan} disabled={scanning} className="w-full">
              {scanning ? "Scanning..." : "Scan Card"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" /> Scan Result
            </CardTitle>
            <CardDescription>Cardholder information will appear here</CardDescription>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Scan className="h-12 w-12 mb-4 opacity-30" />
                <p className="text-sm">No scan yet. Tap a card to begin.</p>
              </div>
            ) : result.success ? (
              <div className="space-y-4">
                <div className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${CARD_COLORS[result.reference_type] || "bg-green-50 border-green-200"}`}>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium">{result.message}</span>
                </div>
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {result.photo_url ? (
                      <img src={result.photo_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">{result.person_name || "Unknown"}</p>
                      <Badge variant="outline" className="mt-1 capitalize">{result.reference_type}</Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Card UID:</span> <span className="font-mono text-xs">{result.card_uid}</span></div>
                    <div><span className="text-muted-foreground">Reference:</span> <span className="font-mono text-xs">{result.reference_id}</span></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <XCircle className="h-5 w-5" />
                <span>{result.message}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
