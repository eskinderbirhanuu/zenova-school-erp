"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { academicService } from "@/services/api"
import { Plus } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [showForm, setShowForm] = useState(false)

  const load = () => academicService.classes.list().then((r) => setClasses(r.data)).catch(() => {})
  useEffect(() => { load() }, [])

  const create = async () => {
    try {
      await academicService.classes.create({ name, code })
      toast({ title: "Class created" })
      setName(""); setCode(""); setShowForm(false)
      load()
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.detail || "Failed", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Classes</h1>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="mr-2 h-4 w-4" />Add Class</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Class</CardTitle></CardHeader>
          <CardContent className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Grade 1" />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="G1" />
            </div>
            <Button onClick={create}>Save</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>All Classes</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Code</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c: any) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="py-3">{c.name}</td>
                  <td className="py-3 text-muted-foreground">{c.code}</td>
                </tr>
              ))}
              {classes.length === 0 && <tr><td colSpan={2} className="py-6 text-center text-muted-foreground">No classes</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
