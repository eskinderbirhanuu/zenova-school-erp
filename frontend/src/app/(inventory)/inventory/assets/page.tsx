"use client"

import { useEffect, useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import api from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function InventoryAssetsPage() {
  const [assets, setAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    setLoading(true)
    api.get("/inventory/assets", { params: { limit: 200 } })
      .then(res => setAssets(res.data || []))
      .catch(err => toast({ title: "Failed to load assets", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

  const filtered = assets.filter(a => !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.category?.toLowerCase().includes(search.toLowerCase()))

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
      loading={loading} searchPlaceholder="Search assets..." onSearch={setSearch}
      emptyTitle="No assets found"
    />
  )
}
