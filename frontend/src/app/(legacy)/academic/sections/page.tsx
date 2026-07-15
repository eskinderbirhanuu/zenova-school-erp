"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useClasses, useSections, useCreateSection } from "@/hooks/queries"
import { toast } from "@/hooks/use-toast"

export default function SectionsPage() {
  const [selectedClass, setSelectedClass] = useState("")
  const [name, setName] = useState("")
  const [capacity, setCapacity] = useState("")
  const { data: classes } = useClasses()
  const { data: sections } = useSections(selectedClass ? { class_id: selectedClass } : undefined)
  const createMutation = useCreateSection()

  const create = async () => {
    try {
      await createMutation.mutateAsync({ name, class_id: selectedClass, capacity: capacity ? Number(capacity) : null } as any)
      toast({ title: "Section created" }); setName(""); setCapacity("")
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.detail || "Failed", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Sections</h1>
      <div className="flex gap-4 items-end">
        <div className="space-y-2">
          <Label>Class</Label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>
              {(classes || []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Section Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="A" />
        </div>
        <div className="space-y-2">
          <Label>Capacity</Label>
          <Input value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="40" />
        </div>
        <Button onClick={create}>Add</Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Sections</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 font-medium">Name</th><th className="pb-3 font-medium">Capacity</th>
              </tr>
            </thead>
            <tbody>
              {(sections || []).map((s: any) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="py-3">{s.name}</td><td className="py-3">{s.capacity || "—"}</td>
                </tr>
              ))}
              {(sections || []).length === 0 && <tr><td colSpan={2} className="py-6 text-center text-muted-foreground">No sections</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
