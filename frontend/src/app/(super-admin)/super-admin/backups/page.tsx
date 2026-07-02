"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import api from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Loader2, HardDrive, Download, Trash2, RefreshCw } from "lucide-react"

export default function SuperAdminBackups() {
  const [backups, setBackups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const fetchBackups = () => {
    setLoading(true)
    api.get("/backups").then((r) => {
      setBackups(r.data?.backups || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetchBackups() }, [])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const r = await api.post("/backups")
      if (r.data.success) {
        toast({ title: "Backup created", description: r.data.backup.filename })
        fetchBackups()
      }
    } catch {
      toast({ title: "Backup failed", variant: "destructive" })
    }
    setCreating(false)
  }

  const handleDelete = async (filename: string) => {
    try {
      await api.delete(`/backups/${encodeURIComponent(filename)}`)
      toast({ title: "Backup deleted" })
      fetchBackups()
    } catch {
      toast({ title: "Delete failed", variant: "destructive" })
    }
  }

  const handleDownload = (filename: string) => {
    const a = document.createElement("a")
    a.href = `${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/backups/${encodeURIComponent(filename)}/download`
    a.download = filename
    a.click()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Backup Manager"
        description="Create, download, and manage database backups"
        actions={
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <HardDrive className="h-4 w-4" />}
            {creating ? "Creating..." : "Create Backup"}
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="h-4 w-4 text-primary" /> Backup History
          </CardTitle>
          <CardDescription>All database backups sorted by creation date</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : backups.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No backups yet. Click "Create Backup" to start.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-4 font-medium">Filename</th>
                  <th className="p-4 font-medium">Size</th>
                  <th className="p-4 font-medium">Created</th>
                  <th className="p-4 font-medium w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-4 font-mono text-xs font-medium">{b.filename}</td>
                    <td className="p-4 text-muted-foreground">{b.size_display || "—"}</td>
                    <td className="p-4 text-muted-foreground text-xs">
                      {b.created_at ? new Date(b.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleDownload(b.filename)} title="Download">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(b.filename)} title="Delete">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
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
