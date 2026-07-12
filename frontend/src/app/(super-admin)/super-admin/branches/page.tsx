"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { useApiQuery } from "@/hooks/use-api"
import { branchService } from "@/services/api"
import { Plus } from "lucide-react"
import Link from "next/link"

export default function SuperAdminBranches() {
  const [search, setSearch] = useState("")
  const { data: response, isLoading, error } = useApiQuery(
    ["branches", search],
    () => branchService.list({ search: search || undefined }),
  )
  const branches: any[] = response?.data || []

  const normalized = branches.map((b: any) => ({
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
        { key: "school", header: "School ID", render: (b: any) => <span className="font-mono text-xs">{b.school_id}</span> },
        { key: "name", header: "Branch", render: (b: any) => <span>{b.name}</span> },
        { key: "code", header: "Code", render: (b: any) => <span className="font-mono text-xs text-muted-foreground">{b.code}</span> },
        { key: "students", header: "Students", render: () => <span className="text-muted-foreground">—</span> },
        { key: "status", header: "Status", render: (b: any) => <StatusBadge status={b.is_active ? "active" : "inactive"} /> },
      ]}
      data={normalized} keyExtractor={(b: any) => b.id}
      loading={isLoading} searchPlaceholder="Search branches..." onSearch={setSearch}
      emptyTitle="No branches found"
    />
  )
}
