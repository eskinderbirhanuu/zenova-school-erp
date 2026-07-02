"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { libraryService } from "@/services/api"
import { studentService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { BookOpen, BookUp, Search, User } from "lucide-react"

export default function LibraryBorrowPage() {
  const [students, setStudents] = useState<any[]>([])
  const [books, setBooks] = useState<any[]>([])
  const [studentSearch, setStudentSearch] = useState("")
  const [bookSearch, setBookSearch] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [selectedBook, setSelectedBook] = useState<any>(null)
  const [borrowing, setBorrowing] = useState(false)

  useEffect(() => {
    studentService.list({ limit: 50 }).then((r: any) => setStudents(r.data)).catch(() => {})
    libraryService.books.list({ limit: 50 }).then((r: any) => setBooks(r.data)).catch(() => {})
  }, [])

  const filteredStudents = students.filter((s: any) =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.student_id?.includes(studentSearch)
  )

  const filteredBooks = books.filter((b: any) =>
    b.title?.toLowerCase().includes(bookSearch.toLowerCase()) ||
    b.author?.toLowerCase().includes(bookSearch.toLowerCase())
  )

  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 14)
    return d.toISOString().split("T")[0]
  })

  const handleBorrow = async () => {
    if (!selectedStudent || !selectedBook) {
      toast({ title: "Please select a student and a book", variant: "destructive" })
      return
    }
    setBorrowing(true)
    try {
      await libraryService.borrowings.borrow({
        book_id: selectedBook.id,
        borrower_type: "student",
        borrower_id: selectedStudent.id,
        due_date: dueDate,
      })
      toast({ title: "Book borrowed successfully" })
      setSelectedStudent(null)
      setSelectedBook(null)
      setStudentSearch("")
      setBookSearch("")
    } catch {
      toast({ title: "Failed to borrow book", variant: "destructive" })
    } finally {
      setBorrowing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Borrow Book</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Select Student</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or ID..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
            </div>
            {selectedStudent && (
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="font-medium">{selectedStudent.first_name} {selectedStudent.last_name}</p>
                <p className="text-xs text-muted-foreground">{selectedStudent.student_id}</p>
              </div>
            )}
            {!selectedStudent && (
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {filteredStudents.map((s: any) => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedStudent(s); setStudentSearch("") }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                  >
                    <User className="mr-2 inline h-3 w-3" />
                    {s.first_name} {s.last_name} <span className="text-xs text-muted-foreground">({s.student_id})</span>
                  </button>
                ))}
                {filteredStudents.length === 0 && <p className="text-xs text-muted-foreground">No students found</p>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Select Book</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by title or author..." value={bookSearch} onChange={(e) => setBookSearch(e.target.value)} />
            </div>
            {selectedBook && (
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="font-medium">{selectedBook.title}</p>
                <p className="text-xs text-muted-foreground">{selectedBook.author}</p>
              </div>
            )}
            {!selectedBook && (
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {filteredBooks.map((b: any) => (
                  <button
                    key={b.id}
                    onClick={() => { setSelectedBook(b); setBookSearch("") }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                  >
                    <BookOpen className="mr-2 inline h-3 w-3" />
                    {b.title} <span className="text-xs text-muted-foreground">({b.author})</span>
                  </button>
                ))}
                {filteredBooks.length === 0 && <p className="text-xs text-muted-foreground">No books found</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Due Date:</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm" />
        </div>
        <Button size="lg" onClick={handleBorrow} disabled={!selectedStudent || !selectedBook || borrowing}>
          <BookUp className="mr-2 h-5 w-5" />{borrowing ? "Borrowing..." : "Borrow Book"}
        </Button>
      </div>
    </div>
  )
}
