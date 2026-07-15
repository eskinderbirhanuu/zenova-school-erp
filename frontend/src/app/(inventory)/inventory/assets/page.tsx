"use client"

import { useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { useInventoryAssets } from "@/hooks/queries"

export default function InventoryAssetsPage() {
  const [search, setSearch] = useState("")
  const { data: assets, isLoading } = useInventoryAssets({ limit: 200 })

  const filtered = (assets || []).filter((a: any) => !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.category?.toLowerCase().includes(search.toLowerCase()))

  return (
    <GenericListPage
      title="Assets" description="Track school assets and equipment"
      columns={[
        { key: "name", header: "Asset", render: (a) => <span className="font-medium">{a.name}</span> },
        { key: "category", header: "Category", render: (a) => <span>{a.category || "—"}</span> },
        { key: "value", header: "Value", render: (a) => <span className="font-mono">${(a.value || 0).toLocaleString()}</span> },
        { key: "location", header: "Location", render: (a) => <span className="text-muted-foreground">{a.location || "—"}</span> },
        { key: "status", header: "Status", render: (a) => <StatusBadge status={a.status} /> },
      ]}
      data={filtered} keyExtractor={(a) => a.id}
      loading={isLoading} searchPlaceholder="Search assets..." onSearch={setSearch}
      emptyTitle="No assets found"
    />
  )
}
