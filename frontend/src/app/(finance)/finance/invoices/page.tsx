"use client"

import { useEffect, useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { Button } from "@/components/ui/button"
import { financeService } from "@/services/api"
import api from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { FileText, Download } from "lucide-react"
import Link from "next/link"

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    financeService.invoices.list()
      .then((r: any) => setInvoices(r.data))
      .catch(() => toast({ title: "Failed to load invoices", variant: "destructive" }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const exportExcel = () => {
    api.get("/invoices/export-excel", { responseType: "blob" }).then((res) => {
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement("a"); a.href = url; a.download = "invoices.xlsx"; a.click()
      URL.revokeObjectURL(url)
    }).catch(() => toast({ title: "Export failed", variant: "destructive" }))
  }

  return (
    <GenericListPage
      title="Invoices"
      description="Manage student invoices and payments"
      columns={[
        { key: "num", header: "#", render: (inv) => <span className="font-mono text-xs text-muted-foreground">{inv.invoice_number}</span> },
        { key: "student", header: "Student", render: (inv) => <span>{inv.student_name || "\u2014"}</span> },
        { key: "amount", header: "Amount", render: (inv) => <span className="font-mono">${Number(inv.total_amount).toFixed(2)}</span> },
        { key: "paid", header: "Paid", render: (inv) => <span className="font-mono">${Number(inv.paid_amount).toFixed(2)}</span> },
        { key: "due", header: "Due", render: (inv) => <span>{inv.due_date}</span> },
        { key: "status", header: "Status", render: (inv) => <StatusBadge status={inv.status} /> },
      ]}
      data={invoices}
      keyExtractor={(inv) => inv.id}
      loading={loading}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportExcel}><Download className="mr-2 h-4 w-4" />Export</Button>
          <Link href="/finance/invoices/new"><Button variant="outline"><FileText className="mr-2 h-4 w-4" />New Invoice</Button></Link>
        </div>
      }
      emptyTitle="No invoices"
    />
  )
}
