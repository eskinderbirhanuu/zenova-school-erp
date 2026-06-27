"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { studentService } from "@/services/api"
import api from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { FileText, Upload, Search, Download, Trash2 } from "lucide-react"
import Link from "next/link"

export default function DocumentsPage() {
  const [students, setStudents] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    studentService.list({ limit: 30 }).then((r) => setStudents(r.data)).catch(() => {})
  }, [])

  const loadDocuments = async (studentId: string) => {
    setLoadingDocs(true)
    try {
      const res = await api.get(`/students/${studentId}/documents`)
      setDocuments(res.data || [])
    } catch { setDocuments([]) }
    setLoadingDocs(false)
  }

  const selectStudent = (s: any) => {
    setSelectedStudent(s)
    loadDocuments(s.id)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedStudent) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      await api.post(`/students/${selectedStudent.id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      toast({ title: "Document uploaded" })
      loadDocuments(selectedStudent.id)
    } catch { toast({ title: "Upload failed", variant: "destructive" }) }
    setUploading(false)
  }

  const deleteDocument = async (docId: string) => {
    try {
      await api.delete(`/students/${selectedStudent.id}/documents/${docId}`)
      toast({ title: "Document deleted" })
      loadDocuments(selectedStudent.id)
    } catch { toast({ title: "Delete failed", variant: "destructive" }) }
  }

  const filtered = students.filter((s) =>
    s.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.last_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id?.includes(search)
  )

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Student Documents</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-4 w-4" /> Select Student</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {filtered.map((s) => (
                  <button key={s.id} onClick={() => selectStudent(s)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selectedStudent?.id === s.id ? "bg-blue-100 text-blue-800" : "hover:bg-muted"
                    }`}>
                    <span className="font-medium">{s.first_name} {s.last_name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{s.student_id}</span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">No students found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          {selectedStudent ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Documents for {selectedStudent.first_name} {selectedStudent.last_name}
                  </CardTitle>
                  <label className="cursor-pointer">
                    <Button variant="outline" size="sm" disabled={uploading} asChild>
                      <span><Upload className="mr-2 h-4 w-4" />{uploading ? "Uploading..." : "Upload"}</span>
                    </Button>
                    <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
                  </label>
                </CardHeader>
                <CardContent>
                  {loadingDocs ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-10 animate-pulse rounded bg-muted" />
                      ))}
                    </div>
                  ) : documents.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-3 font-medium">Name</th>
                          <th className="pb-3 font-medium">Type</th>
                          <th className="pb-3 font-medium">Size</th>
                          <th className="pb-3 font-medium">Uploaded</th>
                          <th className="pb-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {documents.map((doc: any) => (
                          <tr key={doc.id} className="border-b last:border-0">
                            <td className="py-3">{doc.filename || doc.name}</td>
                            <td className="py-3 text-xs">{doc.mime_type || doc.type || "—"}</td>
                            <td className="py-3">{doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : "—"}</td>
                            <td className="py-3">{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "—"}</td>
                            <td className="py-3">
                              <div className="flex gap-1">
                                {doc.file_url && (
                                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                    <Button variant="ghost" size="sm"><Download className="h-4 w-4" /></Button>
                                  </a>
                                )}
                                <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteDocument(doc.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="py-8 text-center text-sm text-muted-foreground">No documents uploaded yet</p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="mx-auto mb-3 h-8 w-8" />
                <p>Select a student from the list to manage their documents</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
