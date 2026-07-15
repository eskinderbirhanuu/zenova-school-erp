"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/ui/page-header"
import { useParents } from "@/hooks/queries"
import { toast } from "@/hooks/use-toast"
import { Search, Users, UserPlus, Loader2 } from "lucide-react"
import Link from "next/link"
import { parentService } from "@/services/api"

export default function ParentsPage() {
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState<any[] | null>(null)
  const { data, isLoading } = useParents({ limit: 50 })

  const parents = searchResults ?? data ?? []

  const searchParents = async () => {
    if (!search.trim()) return
    try {
      const res = await parentService.search({ query: search.trim() })
      setSearchResults(res.data || [])
    } catch { toast({ title: "Search failed", variant: "destructive" }) }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Parents / Guardians"
        description="Manage parent and guardian accounts"
        actions={
          <Button variant="outline"><UserPlus className="h-4 w-4 mr-2" /> Add Parent</Button>
        }
      />

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, email, or phone..." value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchParents()} className="pl-8 rounded-lg" />
        </div>
        <Button variant="outline" size="sm" onClick={searchParents}>Search</Button>
      </div>

      <Card shadow="default">
        <CardHeader className="px-6 py-4">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="h-4 w-4" /> {isLoading ? "Loading..." : `${parents.length} parent${parents.length !== 1 ? "s" : ""} found`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : parents.length === 0 ? (
            <div className="flex flex-col items-center py-12">
              <Users className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No parents found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground bg-muted/50">
                  <th className="p-4 font-medium">Name</th>
                  <th className="p-4 font-medium">Email</th>
                  <th className="p-4 font-medium">Phone</th>
                  <th className="p-4 font-medium">Linked Students</th>
                  <th className="p-4 font-medium w-24"></th>
                </tr>
              </thead>
              <tbody>
                {parents.map((p: any) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium">{p.first_name} {p.last_name}</td>
                    <td className="p-4 text-muted-foreground">{p.email || "-"}</td>
                    <td className="p-4 text-muted-foreground">{p.phone || "-"}</td>
                    <td className="p-4 text-muted-foreground">{p.students?.length || 0}</td>
                    <td className="p-4 flex gap-1">
                      <Link href={`/registrar/students?parent_id=${p.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/parents/${p.id}/id-card`, "_blank")}>
                        ID Card
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
