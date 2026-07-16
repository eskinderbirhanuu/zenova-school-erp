"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { useApiQuery, useApiMutation } from "@/hooks/use-api"
import api from "@/services/api"
import { useToast } from "@/hooks/use-toast"
import { Loader2, HardDrive, Download, Trash2 } from "lucide-react"

export default function SuperAdminBackups() {
  const { toast } = useToast()
  const { data, isLoading, refetch } = useApiQuery(["backups"], () => api.get("/backups"))
  const backups = (data as any)?.backups || []

  const createMutation = useApiMutation(() => api.post("/backups"), {
    onSuccess: () => { toast({ title: "Backup created" }); refetch() },
    onError: () => toast({ title: "Backup failed", variant: "destructive" }),
  })

  const deleteMutation = useApiMutation((filename: string) => api.delete(`/backups/${encodeURIComponent(filename)}`), {
    onSuccess: () => { toast({ title: "Backup deleted" }); refetch() },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  })

  const handleCreate = () => createMutation.mutate()
  const handleDelete = (filename: string) => deleteMutation.mutate(filename)

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
          <Button onClick={handleCreate} disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <HardDrive className="h-4 w-4" />}
            {createMutation.isPending ? "Creating..." : "Create Backup"}
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
          {isLoading ? (
            <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : backups.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No backups yet. Click &quot;Create Backup&quot; to start.</div>
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
                {backups.map((b: any, i: number) => (
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
