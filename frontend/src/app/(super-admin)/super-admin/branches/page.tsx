"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { branchService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Plus } from "lucide-react"
import Link from "next/link"

export default function SuperAdminBranches() {
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const fetchBranches = () => {
    setLoading(true)
    branchService.list({ search: search || undefined })
      .then(res => setBranches(res.data || []))
      .catch(err => toast({ title: "Failed to load branches", description: err.response?.data?.detail || err.message, variant: "destructive" }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchBranches() }, [search])

  const normalized = branches.map(b => ({
    ...b,
    school: b.school_id,
    name: b.name,
    students: "—",
    status: b.is_active ? "active" : "inactive",
  }))

  return (
    <GenericListPage
      title="All Branches" description="View branches across all schools"
      actions={<Link href="/super-admin/branches/new"><Button><Plus className="h-4 w-4 mr-2" /> New Branch</Button></Link>}
      columns={[
        { key: "school", header: "School ID", render: (b) => <span className="font-mono text-xs">{b.school_id}</span> },
        { key: "name", header: "Branch", render: (b) => <span>{b.name}</span> },
        { key: "code", header: "Code", render: (b) => <span className="font-mono text-xs text-muted-foreground">{b.code}</span> },
        { key: "students", header: "Students", render: () => <span className="text-muted-foreground">—</span> },
        { key: "status", header: "Status", render: (b) => <StatusBadge status={b.is_active ? "active" : "inactive"} /> },
      ]}
      data={normalized} keyExtractor={(b) => b.id}
      loading={loading} searchPlaceholder="Search branches..." onSearch={setSearch}
      emptyTitle="No branches found"
    />
  )
}
