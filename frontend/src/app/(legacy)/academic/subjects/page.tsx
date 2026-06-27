"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { academicService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"

export default function SubjectsPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [classId, setClassId] = useState("")
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [isOptional, setIsOptional] = useState(false)

  useEffect(() => { academicService.classes.list().then((r) => setClasses(r.data)) }, [])
  useEffect(() => {
    if (classId) academicService.subjects.list(classId).then((r) => setSubjects(r.data)).catch(() => {})
  }, [classId])

  const create = async () => {
    try {
      await academicService.subjects.create({ name, code, class_id: classId, is_optional: isOptional })
      toast({ title: "Subject created" }); setName(""); setCode(""); setIsOptional(false)
      if (classId) academicService.subjects.list(classId).then((r) => setSubjects(r.data))
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.detail, variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Subjects</h1>
      <Card>
        <CardHeader><CardTitle>Add Subject</CardTitle></CardHeader>
        <CardContent className="flex gap-4 items-end flex-wrap">
          <div className="space-y-2">
            <Label>Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mathematics" /></div>
          <div className="space-y-2"><Label>Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="MATH" /></div>
          <div className="flex items-center gap-2 pb-2">
            <input type="checkbox" id="opt" checked={isOptional} onChange={(e) => setIsOptional(e.target.checked)} />
            <Label htmlFor="opt">Optional</Label>
          </div>
          <Button onClick={create}>Add</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Subjects</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 font-medium">Name</th><th className="pb-3 font-medium">Code</th><th className="pb-3 font-medium">Optional</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s: any) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="py-3">{s.name}</td><td className="py-3">{s.code}</td>
                  <td className="py-3">{s.is_optional ? "✅" : "—"}</td>
                </tr>
              ))}
              {subjects.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-muted-foreground">No subjects</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
