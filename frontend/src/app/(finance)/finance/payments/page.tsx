"use client"

import { useRef, useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { Button } from "@/components/ui/button"
import { usePayments } from "@/hooks/queries"
import api from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Download, Upload } from "lucide-react"

export default function PaymentsPage() {
  const { data: payments, isLoading, refetch } = usePayments({ limit: 100 } as any)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const exportExcel = () => {
    api.get("/payments/export-excel", { responseType: "blob" }).then((res: any) => {
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement("a"); a.href = url; a.download = "payments.xlsx"; a.click()
      URL.revokeObjectURL(url)
    }).catch(() => toast({ title: "Export failed", variant: "destructive" }))
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setImporting(true)
    const formData = new FormData()
    formData.append("file", f)
    try {
      const res = await api.post("/payments/import-excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      toast({ title: res.data.message || "Payments imported" })
      refetch()
    } catch (err: any) {
      toast({ title: err.response?.data?.detail || "Import failed", variant: "destructive" })
    }
    setImporting(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  return (
    <>
      <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
      <GenericListPage
        title="Payments" description="View all payment transactions"
        columns={[
          { key: "ref", header: "Reference", render: (p: any) => <span className="font-mono text-xs text-muted-foreground">{p.reference || p.id?.slice(0, 8)}</span> },
          { key: "payer", header: "Payer", render: (p: any) => <span>{p.payer_name || p.student_name || "\u2014"}</span> },
          { key: "amount", header: "Amount", render: (p: any) => <span className="font-mono">${Number(p.amount || 0).toFixed(2)}</span> },
          { key: "method", header: "Method", render: (p: any) => <span>{p.payment_method || "\u2014"}</span> },
          { key: "status", header: "Status", render: (p: any) => <StatusBadge status={p.status || "completed"} /> },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" disabled={importing} onClick={() => fileRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />{importing ? "Importing..." : "Import"}
            </Button>
            <Button variant="outline" onClick={exportExcel}><Download className="mr-2 h-4 w-4" />Export</Button>
          </div>
        }
        data={payments || []} keyExtractor={(p: any) => p.id}
        loading={isLoading} emptyTitle="No payments found"
      />
    </>
  )
}
