"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BookOpen, BookMarked, Search, AlertCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function LibraryPage() {
  const [books, setBooks] = useState<any[]>([])
  const [borrowings, setBorrowings] = useState<any[]>([])
  const [title, setTitle] = useState(""); const [author, setAuthor] = useState(""); const [isbn, setIsbn] = useState(""); const [qty, setQty] = useState("1")
  const [search, setSearch] = useState(""); const [tab, setTab] = useState<"books" | "borrowings">("books")
  const [showForm, setShowForm] = useState(false)
  const [bookId, setBookId] = useState(""); const [borrowerId, setBorrowerId] = useState(""); const [dueDate, setDueDate] = useState("")

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : ""
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }

  const loadBooks = () => {
    const url = search ? `${API}/library/books?search=${search}` : `${API}/library/books`
    fetch(url, { headers }).then((r) => r.json()).then(setBooks).catch(() => {})
  }
  const loadBorrowings = () => {
    fetch(`${API}/library/borrowings`, { headers })
      .then((r) => r.json()).then(setBorrowings).catch(() => {})
  }

  useEffect(() => { loadBooks(); loadBorrowings() }, [])

  const createBook = async () => {
    const res = await fetch(`${API}/library/books`, {
      method: "POST", headers, body: JSON.stringify({ title, author, isbn, total_quantity: Number(qty) })
    })
    if (res.ok) { toast({ title: "Book added" }); setTitle(""); setAuthor(""); setIsbn(""); setQty("1"); setShowForm(false); loadBooks() }
    else { const e = await res.json(); toast({ title: "Error", description: e.detail, variant: "destructive" }) }
  }

  const borrow = async () => {
    const res = await fetch(`${API}/library/borrowings`, {
      method: "POST", headers, body: JSON.stringify({ book_id: bookId, borrower_type: "student", borrower_id: borrowerId, due_date: dueDate })
    })
    if (res.ok) { toast({ title: "Borrowed!" }); setBookId(""); setBorrowerId(""); setDueDate(""); loadBooks(); loadBorrowings() }
    else { const e = await res.json(); toast({ title: "Error", description: e.detail, variant: "destructive" }) }
  }

  const returnBook = async (id: string) => {
    const res = await fetch(`${API}/library/borrowings/${id}/return`, { method: "POST", headers })
    if (res.ok) { toast({ title: "Returned" }); loadBooks(); loadBorrowings() }
  }

  const borrowedCount = borrowings.filter((b: any) => b.status === "borrowed").length
  const stats = [
    { title: "Total Books", value: books.length, icon: BookOpen, color: "text-blue-600" },
    { title: "Borrowed", value: borrowedCount, icon: BookMarked, color: "text-orange-600" },
    { title: "Available", value: books.reduce((s: number, b: any) => s + b.available_quantity, 0), icon: BookOpen, color: "text-green-600" },
    { title: "Low Stock", value: books.filter((b: any) => b.available_quantity === 0).length, icon: AlertCircle, color: "text-red-600" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Library</h1>
        <Button onClick={() => setShowForm(!showForm)}><BookOpen className="mr-2 h-4 w-4" />Add Book</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{s.title}</CardTitle><s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{s.value}</div></CardContent>
          </Card>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant={tab === "books" ? "default" : "outline"} onClick={() => setTab("books")}>Books</Button>
        <Button variant={tab === "borrowings" ? "default" : "outline"} onClick={() => setTab("borrowings")}>Borrowings</Button>
      </div>
      {showForm && (
        <Card><CardHeader><CardTitle>New Book</CardTitle></CardHeader>
          <CardContent className="flex gap-4 items-end flex-wrap">
            <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="space-y-2"><Label>Author</Label><Input value={author} onChange={(e) => setAuthor(e.target.value)} /></div>
            <div className="space-y-2"><Label>ISBN</Label><Input value={isbn} onChange={(e) => setIsbn(e.target.value)} /></div>
            <div className="space-y-2"><Label>Qty</Label><Input value={qty} onChange={(e) => setQty(e.target.value)} type="number" /></div>
            <Button onClick={createBook}>Save</Button>
          </CardContent>
        </Card>
      )}
      {tab === "books" && (
        <>
          <div className="flex gap-2">
            <Search className="h-4 w-4 text-muted-foreground self-center" />
            <Input placeholder="Search by title or author..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" onKeyDown={(e) => e.key === "Enter" && loadBooks()} />
            <Button size="sm" variant="outline" onClick={loadBooks}>Search</Button>
          </div>
          <Card>
            <CardHeader><CardTitle>Books Collection</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Title</th><th className="pb-3 font-medium">Author</th>
                    <th className="pb-3 font-medium">Available</th><th className="pb-3 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {books.map((b: any) => (
                    <tr key={b.id} className="border-b last:border-0">
                      <td className="py-3">{b.title}</td><td className="py-3 text-muted-foreground">{b.author || "—"}</td>
                      <td className="py-3">{b.available_quantity}</td><td className="py-3">{b.total_quantity}</td>
                    </tr>
                  ))}
                  {books.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No books</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Borrow Book</CardTitle></CardHeader>
            <CardContent className="flex gap-4 items-end flex-wrap">
              <div className="space-y-2"><Label>Book ID</Label><Input value={bookId} onChange={(e) => setBookId(e.target.value)} placeholder="Book UUID" /></div>
              <div className="space-y-2"><Label>Borrower ID</Label><Input value={borrowerId} onChange={(e) => setBorrowerId(e.target.value)} placeholder="Student UUID" /></div>
              <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
              <Button onClick={borrow}>Borrow</Button>
            </CardContent>
          </Card>
        </>
      )}
      {tab === "borrowings" && (
        <Card>
          <CardHeader><CardTitle>Borrowing Records</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Book</th><th className="pb-3 font-medium">Borrow Date</th>
                  <th className="pb-3 font-medium">Due Date</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {borrowings.map((br: any) => (
                  <tr key={br.id} className="border-b last:border-0">
                    <td className="py-3">{br.book_id?.substring(0, 8)}</td>
                    <td className="py-3">{br.borrow_date}</td>
                    <td className="py-3">{br.due_date}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${br.status === "borrowed" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>{br.status}</span>
                    </td>
                    <td className="py-3">
                      {br.status === "borrowed" && <Button size="sm" variant="outline" onClick={() => returnBook(br.id)}>Return</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
