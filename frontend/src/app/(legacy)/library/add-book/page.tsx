"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { libraryService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function AddBookPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ title: "", author: "", isbn: "", publisher: "", publish_year: 0, category_id: "", total_copies: 1, shelf_location: "", description: "" })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await libraryService.books.create(form); toast({ title: "Book added" }); router.push("/library") } catch { toast({ title: "Failed", variant: "destructive" }); setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/library"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-3xl font-bold">Add Book</h1>
      </div>
      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="grid gap-4 md:grid-cols-2 pt-6">
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Title *</label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Author *</label><Input value={form.author} onChange={e => setForm({...form, author: e.target.value})} required /></div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">ISBN</label><Input value={form.isbn} onChange={e => setForm({...form, isbn: e.target.value})} /></div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Publisher</label><Input value={form.publisher} onChange={e => setForm({...form, publisher: e.target.value})} /></div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Year</label><Input type="number" value={form.publish_year} onChange={e => setForm({...form, publish_year: Number(e.target.value)})} /></div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Category ID</label><Input value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})} /></div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Copies</label><Input type="number" min="1" value={form.total_copies} onChange={e => setForm({...form, total_copies: Number(e.target.value)})} /></div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium">Shelf</label><Input value={form.shelf_location} onChange={e => setForm({...form, shelf_location: e.target.value})} /></div>
            <div className="flex flex-col gap-1.5 md:col-span-2"><label className="text-sm font-medium">Description</label><Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
          </CardContent>
        </Card>
        <div className="mt-6 flex justify-end gap-3">
          <Link href="/library"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={loading}>{loading ? "Adding..." : "Add Book"}</Button>
        </div>
      </form>
    </div>
  )
}
