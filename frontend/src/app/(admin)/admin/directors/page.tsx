"use client"

import { useEffect, useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { Button } from "@/components/ui/button"
import { staffService } from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function AdminDirectors() {
  const [directors, setDirectors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    staffService.list({ role: "director" })
      .then((res) => {
        const data = res.data?.data || res.data || []
        setDirectors(data.map((d: any) => ({ ...d, department: d.department || d.role || "—" })))
      })
      .catch((err) => {
        toast({ title: "Failed to load directors", description: err?.response?.data?.detail || err.message, variant: "destructive" })
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = directors.filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.email.toLowerCase().includes(search.toLowerCase()))

  return (
    <GenericListPage
      title="Directors" description="Manage school directors and their departments"
      columns={[
        { key: "name", header: "Name", render: (d) => <span className="font-medium">{d.name}</span> },
        { key: "email", header: "Email", render: (d) => <span className="text-muted-foreground">{d.email}</span> },
        { key: "phone", header: "Phone", render: (d) => <span className="text-muted-foreground">{d.phone}</span> },
        { key: "dept", header: "Department", render: (d) => <span className="text-muted-foreground">{d.department}</span> },
        { key: "status", header: "Status", render: (d) => <StatusBadge status={d.status} /> },
        { key: "actions", header: "", render: () => <Button variant="ghost" size="sm">Edit</Button> },
      ]}
      data={filtered} keyExtractor={(d) => d.id}
      loading={loading} searchPlaceholder="Search directors..." onSearch={setSearch}
      onCreateLabel="Add Director" onCreateClick={() => window.location.href = "/admin/directors/new"}
      emptyTitle="No directors found"
    />
  )
}
