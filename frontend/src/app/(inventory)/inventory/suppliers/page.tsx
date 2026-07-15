"use client"

import { useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { useSuppliers } from "@/hooks/queries"

export default function InventorySuppliersPage() {
  const [search, setSearch] = useState("")
  const { data: suppliersData, isLoading } = useSuppliers()

  const normalized = (suppliersData || []).map((s: any) => ({
    ...s,
    contact: s.phone || s.contact_person || "—",
    status: s.is_active ? "active" : "inactive",
  }))

  const filtered = normalized.filter((s: any) => !search || s.name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <GenericListPage
      title="Suppliers" description="Manage vendor and supplier information"
      columns={[
        { key: "name", header: "Name", render: (s) => <span className="font-medium">{s.name}</span> },
        { key: "contact", header: "Contact", render: (s) => <span>{s.phone || s.email || "—"}</span> },
        { key: "email", header: "Email", render: (s) => <span className="text-muted-foreground">{s.email || "—"}</span> },
        { key: "status", header: "Status", render: (s) => <StatusBadge status={s.is_active ? "active" : "inactive"} /> },
      ]}
      data={filtered} keyExtractor={(s) => s.id}
      loading={isLoading} searchPlaceholder="Search suppliers..." onSearch={setSearch}
      emptyTitle="No suppliers found"
    />
  )
}
