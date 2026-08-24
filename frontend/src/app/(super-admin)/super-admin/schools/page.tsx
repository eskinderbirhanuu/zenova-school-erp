"use client"

import { useState } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { Button } from "@/components/ui/button"
import { Eye, Edit3, Wifi, WifiOff, AlertCircle } from "lucide-react"
import { useSchoolList } from "@/hooks/queries"

interface School {
  id: string
  name: string
  code: string
  address: string | null
  branch_count: number
  is_active: boolean
  is_setup_complete: boolean
  created_at: string | null
  license_status?: string
  license_type?: string
  license_valid_until?: string
  license_max_users?: number
  online?: boolean
  last_seen?: string | null
  last_version?: string | null
  offline_for_hours?: number | null
}

export default function SuperAdminSchools() {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("All")

  const { data: schoolData, isLoading } = useSchoolList(search ? { search } : undefined)
  const schools = (schoolData?.schools ?? []) as School[]

  const filtered = schools.filter((s) => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === "All" || (filter === "Active" && s.is_active) || (filter === "Inactive" && !s.is_active)
    return matchSearch && matchFilter
  })

  const normalized = filtered.map((s) => {
    const licenseStatus = s.license_status || (s.is_setup_complete ? "active" : "pending")
    const licenseLabel = licenseStatus === "active" ? "Active" : licenseStatus === "suspended" ? "Suspended" : licenseStatus === "revoked" ? "Revoked" : licenseStatus === "expired" ? "Expired" : "Pending"
    const licenseVariant = licenseStatus === "active" ? "success" : licenseStatus === "suspended" ? "destructive" : licenseStatus === "revoked" ? "destructive" : licenseStatus === "expired" ? "destructive" : "warning"

    let onlineStatus = "Offline"
    let onlineColor = "inactive"
    let onlineIcon = WifiOff
    if (s.online) {
      onlineStatus = "Online"
      onlineColor = "active"
      onlineIcon = Wifi
    } else if (s.offline_for_hours !== null && s.offline_for_hours !== undefined && s.offline_for_hours <= 48) {
      onlineStatus = `${s.offline_for_hours}h ago`
      onlineColor = "warning"
      onlineIcon = AlertCircle
    }

    return {
      id: s.id,
      name: s.name,
      code: s.code,
      branches: s.branch_count,
      status: s.is_active ? "Active" : "Inactive",
      license: licenseLabel,
      license_raw: licenseStatus,
      license_variant: licenseVariant,
      online: onlineStatus,
      online_raw: onlineStatus,
      online_color: onlineColor,
      online_icon: onlineIcon,
      version: s.last_version || "—",
      created: s.created_at ? new Date(s.created_at).toLocaleDateString() : "—",
      address: s.address,
    }
  })

  return (
    <GenericListPage
      title="All Schools"
      description="Manage all registered schools"
      columns={[
        { key: "name", header: "Name", render: (s) => <span className="font-medium">{s.name}</span> },
        { key: "code", header: "Code", render: (s) => <span className="font-mono text-xs text-muted-foreground">{s.code}</span> },
        { key: "branches", header: "Branches", render: (s) => <span>{s.branches}</span> },
        { key: "status", header: "Status", render: (s) => <StatusBadge status={s.status === "Active" ? "active" : "inactive"} /> },
        { key: "license", header: "License", render: (s) => <StatusBadge status={s.license} variant={s.license_variant as any} /> },
        { key: "online", header: "Online", render: (s) => (
          <span className={`inline-flex items-center gap-1.5 text-sm ${s.online_color === "active" ? "text-green-600" : s.online_color === "warning" ? "text-yellow-600" : "text-red-600"}`}>
            <s.online_icon className="h-3.5 w-3.5" />
            {s.online}
          </span>
        ) },
        { key: "version", header: "Version", render: (s) => <span className="font-mono text-xs text-muted-foreground">{s.version}</span> },
        { key: "actions", header: "", render: () => <div className="flex gap-1"><Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm"><Edit3 className="h-3.5 w-3.5" /></Button></div> },
      ]}
      data={normalized} keyExtractor={(s) => s.id}
      loading={isLoading} searchPlaceholder="Search by name or code..." onSearch={setSearch}
      onCreateLabel="Create School" onCreateClick={() => window.location.href = "/super-admin/schools/new"}
      emptyTitle="No schools found"
      extraFilters={
        <div className="flex gap-2">{[["All", "default"], ["Active", "outline"], ["Inactive", "outline"]].map(([f]) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>{f}</Button>
        ))}</div>
      }
    />
  )
}