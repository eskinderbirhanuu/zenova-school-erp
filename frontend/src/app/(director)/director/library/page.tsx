"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, BookCheck, Users, Loader2 } from "lucide-react"
import { libraryService } from "@/services/api"
import { toast } from "@/hooks/use-toast"

export default function DirectorLibrary() {
  const [loading, setLoading] = useState(true)
  const [books, setBooks] = useState<any[]>([])
  const [borrowings, setBorrowings] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      libraryService.books.list({ limit: 100 }).then(r => setBooks(r.data || [])),
      libraryService.borrowings.list({ limit: 100 }).then(r => setBorrowings(r.data || [])),
    ]).catch(err => toast({ title: "Failed to load library data", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

  const borrowedCount = borrowings.filter((b: any) => b.status === "borrowed" || !b.returned_at).length
  const availableCount = books.length - borrowedCount

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Library Overview</h1>
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Library Overview</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Books</CardTitle><BookOpen className="h-4 w-4 text-blue-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{books.length.toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Borrowed</CardTitle><BookCheck className="h-4 w-4 text-orange-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{borrowedCount}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Available</CardTitle><BookOpen className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{availableCount.toLocaleString()}</div></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-lg">Recent Borrowings</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-4 font-medium">Book</th>
                <th className="p-4 font-medium">Borrower</th>
                <th className="p-4 font-medium">Borrow Date</th>
                <th className="p-4 font-medium">Due Date</th>
                <th className="p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {borrowings.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No borrowings yet</td></tr>
              ) : borrowings.slice(0, 5).map((b: any, i: number) => (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-4 font-medium">{b.book_title || b.book_id || "Unknown"}</td>
                  <td className="p-4 text-muted-foreground">{b.borrower_name || b.student_id || "—"}</td>
                  <td className="p-4 text-muted-foreground">{b.borrowed_at ? new Date(b.borrowed_at).toLocaleDateString() : "—"}</td>
                  <td className="p-4 text-muted-foreground">{b.due_date ? new Date(b.due_date).toLocaleDateString() : "—"}</td>
                  <td className="p-4"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${b.status === "borrowed" ? "bg-blue-100 text-blue-700" : b.status === "overdue" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{b.status || "borrowed"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
