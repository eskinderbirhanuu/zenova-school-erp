"use client"

import { useState } from "react"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { useInventoryItems } from "@/hooks/queries"

function statusBadge(item: any) {
  if (item.quantity <= 0) return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Out of Stock</span>
  if (item.quantity <= (item.min_stock ?? 0)) return <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">Low Stock</span>
  return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">In Stock</span>
}

export default function InventoryItemsPage() {
  const [search, setSearch] = useState("")
  const { data: items, isLoading } = useInventoryItems({ limit: 100 })

  const filtered = (items || []).filter((i: any) => !search || i.name?.toLowerCase().includes(search.toLowerCase()) || i.category?.toLowerCase().includes(search.toLowerCase()))

  return (
    <GenericListPage
      title="Items" description="Manage inventory stock and supplies"
      columns={[
        { key: "name", header: "Name", render: (i) => <span className="font-medium">{i.name}</span> },
        { key: "category", header: "Category", render: (i: any) => <span>{i.category || "\u2014"}</span> },
        { key: "qty", header: "Quantity", render: (i: any) => <span>{i.quantity}</span> },
        { key: "min", header: "Min Stock", render: (i: any) => <span>{i.min_stock}</span> },
        { key: "status", header: "Status", render: (i) => statusBadge(i) },
      ]}
      data={filtered} keyExtractor={(i) => i.id}
      loading={isLoading} searchPlaceholder="Search by name or category..." onSearch={setSearch}
      onCreateLabel="Add Item" onCreateClick={() => window.location.href = "/inventory/items/add"}
      emptyTitle="No items found"
    />
  )
}
