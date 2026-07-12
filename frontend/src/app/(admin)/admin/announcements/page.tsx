"use client"

import { useState } from "react"
import { announcementService } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useApiQuery, useApiMutation } from "@/hooks/use-api"
import { useForm, FormProvider } from "react-hook-form"
import { FormField } from "@/components/ui/form"
import { Plus, Trash2, Loader2, Megaphone } from "lucide-react"
import { StatusBadge } from "@/components/ui/status-badge"
import { useToast } from "@/hooks/use-toast"

export default function AnnouncementsPage() {
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const { data: announcements = [], isLoading, refetch } = useApiQuery(
    ["announcements"],
    () => announcementService.list(),
  )
  const form = useForm({ defaultValues: { title: "", content: "", target_roles: "" } })

  const createMutation = useApiMutation((data: any) => announcementService.create(data), {
    onSuccess: () => {
      toast({ title: "Announcement published" })
      form.reset()
      setShowForm(false)
      refetch()
    },
    onError: (e: any) => {
      toast({ title: e?.response?.data?.detail || "Failed to create announcement", variant: "destructive" })
    },
  })

  const deleteMutation = useApiMutation((id: string) => announcementService.delete(id), {
    onSuccess: (_data, id) => {
      toast({ title: "Announcement deleted" })
      refetch()
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="text-gray-600">Post and manage school-wide announcements.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> New Announcement
        </Button>
      </div>

      {showForm && (
        <Card>
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}>
              <CardContent className="p-6 space-y-4">
                <FormField name="title" label="Title" required />
                <FormField name="content" label="Content" textarea required />
                <FormField name="target_roles" label="Target Roles (comma-separated, empty = all)"
                  placeholder="TEACHER, PARENT, STUDENT" />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Publish
                  </Button>
                </div>
              </CardContent>
            </form>
          </FormProvider>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
      ) : announcements.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-500">No announcements yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a: any) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-4 w-4 text-indigo-500" />
                      <h3 className="font-semibold">{a.title}</h3>
                      <StatusBadge status={a.is_published ? "active" : "draft"} />
                    </div>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{a.content}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {a.created_at ? new Date(a.created_at).toLocaleString() : ""}
                      {a.target_roles ? ` — For: ${a.target_roles}` : " — All roles"}
                    </p>
                  </div>
                  <button onClick={() => deleteMutation.mutate(a.id)} className="text-gray-400 hover:text-red-600 ml-4">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
