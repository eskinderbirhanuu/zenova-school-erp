"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/ui/page-header"
import { nfcV2Service } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Scan, QrCode, CheckCircle, XCircle, User, Camera, CameraOff } from "lucide-react"

const CARD_COLORS: Record<string, string> = {
  student: "bg-blue-50 border-blue-200 text-blue-700",
  staff: "bg-purple-50 border-purple-200 text-purple-700",
  parent: "bg-teal-50 border-teal-200 text-teal-700",
  employee: "bg-emerald-50 border-emerald-200 text-emerald-700",
}

export default function QrScanPage() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [manualUid, setManualUid] = useState("")
  const [scanType, setScanType] = useState("verification")
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<any>(null)

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try { scannerRef.current.stop() } catch { /* ignore */ }
      }
    }
  }, [])

  const startScanner = async () => {
    try {
      const { Html5Qrcode } = await import("html5-qrcode")
      const scanner = new Html5Qrcode("qr-reader")
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          scanner.stop().catch(() => {})
          setManualUid(decodedText.trim())
          setScanning(false)
          toast({ title: "QR scanned", description: decodedText.trim() })
          doScanWithUid(decodedText.trim())
        },
        () => { /* ignore partial scans */ },
      )
      setScanning(true)
    } catch (err: any) {
      toast({ title: "Camera error", description: err.message || "Cannot access camera", variant: "destructive" })
    }
  }

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {})
      scannerRef.current = null
    }
    setScanning(false)
  }

  const doScanWithUid = async (uid: string) => {
    setResult(null)
    try {
      const res = await nfcV2Service.scan({ card_uid: uid, scan_type: scanType })
      setResult(res.data)
    } catch (err: any) {
      setResult({ success: false, message: err.response?.data?.detail || "Card not found" })
    }
  }

  const doManualScan = async () => {
    if (!manualUid) { toast({ title: "Enter a card UID", variant: "destructive" }); return }
    await doScanWithUid(manualUid)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="QR Scan" description="Scan QR code on card to identify cardholder (iOS & Android)" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" /> QR Scanner
            </CardTitle>
            <CardDescription>Point camera at the QR code on the card</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              id="qr-reader"
              className={`w-full aspect-square max-w-[320px] mx-auto rounded-lg overflow-hidden border ${scanning ? "" : "bg-muted flex items-center justify-center"}`}
            >
              {!scanning && (
                <div className="text-center text-muted-foreground p-8">
                  <QrCode className="h-12 w-12 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Camera off</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {!scanning ? (
                <Button onClick={startScanner} className="w-full">
                  <Camera className="h-4 w-4 mr-2" /> Start Camera
                </Button>
              ) : (
                <Button onClick={stopScanner} variant="outline" className="w-full">
                  <CameraOff className="h-4 w-4 mr-2" /> Stop Camera
                </Button>
              )}
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Or enter UID manually</p>
              <div className="flex gap-2">
                <input
                  value={manualUid}
                  onChange={e => setManualUid(e.target.value)}
                  placeholder="e.g. 04:A7:12:9C:B1"
                  className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  onKeyDown={e => e.key === "Enter" && doManualScan()}
                />
                <Button variant="outline" onClick={doManualScan}>Scan</Button>
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
                <p className="text-sm">No scan yet. Scan a QR code to begin.</p>
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
