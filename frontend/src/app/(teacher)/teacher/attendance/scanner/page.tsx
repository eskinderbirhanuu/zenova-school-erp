"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { academicService, hrService } from "@/services/api"
import { Html5Qrcode } from "html5-qrcode"

const SCANNER_ID = "qr-reader"

export default function QRScannerPage() {
  const router = useRouter()
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [scannerStarted, setScannerStarted] = useState(false)
  const [scanResult, setScanResult] = useState<{ student_name: string; message: string } | null>(null)
  const [scanError, setScanError] = useState("")
  const [scannedList, setScannedList] = useState<{ name: string; time: string }[]>([])

  const [classes, setClasses] = useState<any[]>([])
  const [sections, setSections] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedSection, setSelectedSection] = useState("")
  const [scanDate, setScanDate] = useState(new Date().toISOString().split("T")[0])

  useEffect(() => {
    academicService.classes.list().then((r) => setClasses(r.data))
  }, [])

  useEffect(() => {
    if (selectedClass) {
      academicService.sections.list({ class_id: selectedClass }).then((r) => setSections(r.data))
    } else {
      setSections([])
    }
  }, [selectedClass])

  const startScanner = async () => {
    setScanResult(null)
    setScanError("")
    try {
      const scanner = new Html5Qrcode(SCANNER_ID)
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        () => {},
      )
      setScannerStarted(true)
    } catch (e: any) {
      setScanError("Camera access denied or not available")
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop() } catch {}
      scannerRef.current = null
      setScannerStarted(false)
    }
  }

  const onScanSuccess = async (decodedText: string) => {
    await stopScanner()
    try {
      const res = await hrService.scanAttendance({ qr_uuid: decodedText, date: scanDate })
      const d = res.data
      setScanResult({ student_name: d.student_name, message: d.message })
      setScannedList((prev) => [
        { name: d.student_name, time: new Date().toLocaleTimeString() },
        ...prev,
      ])
    } catch (e: any) {
      setScanError(e?.response?.data?.detail || "Failed to mark attendance")
    }
  }

  useEffect(() => {
    return () => { stopScanner() }
  }, [])

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">QR Attendance Scanner</h1>
      <p className="text-gray-600 mb-6">Scan student QR codes to mark attendance.</p>

      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">Select class</option>
              {classes.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">All sections</option>
              {sections.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={scanDate}
              onChange={(e) => setScanDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>

        <div
          id={SCANNER_ID}
          className="w-full aspect-video bg-gray-100 rounded-lg overflow-hidden"
        />

        {!scannerStarted && (
          <button
            onClick={startScanner}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            Start Scanner
          </button>
        )}

        {scannerStarted && (
          <button
            onClick={stopScanner}
            className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
          >
            Stop Scanner
          </button>
        )}

        {scanResult && (
          <div className="p-3 bg-green-50 border border-green-200 rounded text-center">
            <p className="font-medium text-green-800">{scanResult.student_name}</p>
            <p className="text-sm text-green-600">{scanResult.message}</p>
          </div>
        )}

        {scanError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-center">
            <p className="text-sm text-red-700">{scanError}</p>
          </div>
        )}
      </div>

      {scannedList.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Scanned Students ({scannedList.length})</h2>
          <div className="space-y-2">
            {scannedList.map((s, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                <span className="text-gray-800">{s.name}</span>
                <span className="text-sm text-gray-500">{s.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
