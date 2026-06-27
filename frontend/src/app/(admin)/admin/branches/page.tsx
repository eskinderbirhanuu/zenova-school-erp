"use client"

import { useEffect, useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { Button } from "@/components/ui/button"
import { MapPin, Phone, User, Pencil } from "lucide-react"
import { branchService } from "@/services/api"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"

export default function AdminBranches() {
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    branchService.list()
      .then((res) => {
        const data = res.data?.data || res.data || []
        setBranches(data.map((b: any) => ({ ...b, students: b.student_count ?? b.students ?? 0 })))
      })
      .catch((err) => {
        toast({ title: "Failed to load branches", description: err?.response?.data?.detail || err.message, variant: "destructive" })
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = branches.filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.code.toLowerCase().includes(search.toLowerCase()))

  return (
    <GenericListPage
      title="Branches"
      description="Manage school branches and campuses"
      columns={[
        { key: "name", header: "Name", render: (b) => <span className="font-medium">{b.name}</span> },
        { key: "code", header: "Code", render: (b) => <span className="font-mono text-xs text-muted-foreground">{b.code}</span> },
        { key: "address", header: "Location", render: (b) => <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3" />{b.address}</span> },
        { key: "phone", header: "Phone", render: (b) => <span className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" />{b.phone}</span> },
        { key: "principal", header: "Principal", render: (b) => <span className="flex items-center gap-1 text-muted-foreground"><User className="h-3 w-3" />{b.principal}</span> },
        { key: "students", header: "Students", render: (b) => <span>{b.students.toLocaleString()}</span> },
        { key: "status", header: "Status", render: (b) => <StatusBadge status={b.status} /> },
        { key: "actions", header: "", render: (b) => <Link href={`/admin/branches/${b.id}`}><Button variant="ghost" size="sm"><Pencil className="h-3 w-3" /></Button></Link> },
      ]}
      data={filtered}
      keyExtractor={(b) => b.id}
      loading={loading}
      searchPlaceholder="Search branches..."
      onSearch={setSearch}
      onCreateLabel="New Branch"
      onCreateClick={() => window.location.href = "/admin/branches/new"}
      emptyTitle="No branches found"
    />
  )
}
