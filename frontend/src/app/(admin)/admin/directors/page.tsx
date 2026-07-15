"use client"

import { useEffect, useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { useStaff } from "@/hooks/queries"

export default function AdminDirectors() {
  const [search, setSearch] = useState("")
  const { data: rawDirectors, isLoading, error } = useStaff({ role: "director" })

  useEffect(() => {
    if (error) {
      toast({ title: "Failed to load directors", description: (error as any)?.response?.data?.detail || (error as any)?.message || "Unknown error", variant: "destructive" })
    }
  }, [error])

  const directors = (rawDirectors || []).map((d: any) => ({ ...d, department: d.department || d.role || "—" }))
  const filtered = directors.filter((d: any) => !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.email.toLowerCase().includes(search.toLowerCase()))

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
      loading={isLoading} searchPlaceholder="Search directors..." onSearch={setSearch}
      onCreateLabel="Add Director" onCreateClick={() => window.location.href = "/admin/directors/new"}
      emptyTitle="No directors found"
    />
  )
}
