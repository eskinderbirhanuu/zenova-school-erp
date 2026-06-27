"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { studentService } from "@/services/api"
import { Plus, Search } from "lucide-react"
import Link from "next/link"

interface Student {
  id: string
  first_name: string
  last_name: string
  student_id: string
  current_class_name?: string
  status: string
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    studentService.list({ limit: 50 }).then((res) => setStudents(res.data)).catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Students</h1>
        <Link href="/students/register">
          <Button><Plus className="mr-2 h-4 w-4" /> Register Student</Button>
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name or ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      </div>
      <Card>
        <CardHeader><CardTitle>Student List</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 font-medium">ID</th>
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Class</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.filter((s) => s.first_name.toLowerCase().includes(search.toLowerCase()) || s.student_id.includes(search)).map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="py-3">{s.student_id}</td>
                  <td className="py-3">{s.first_name} {s.last_name}</td>
                  <td className="py-3">{s.current_class_name || "—"}</td>
                  <td className="py-3"><span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">{s.status}</span></td>
                  <td className="py-3"><Link href={`/students/${s.id}`}><Button variant="ghost" size="sm">View</Button></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
