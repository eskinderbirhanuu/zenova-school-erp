"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { studentService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"

export default function RegisterStudentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "", date_of_birth: "",
    gender: "", address: "", blood_group: "", religion: "",
    father_name: "", father_phone: "", mother_name: "", mother_phone: "",
    previous_school: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await studentService.create(form)
      toast({ title: "Student registered", description: `ID: ${res.data.student_id}` })
      router.push("/students")
    } catch {
      toast({ title: "Failed", description: "Check fields and try again", variant: "destructive" })
    } finally { setLoading(false) }
  }

  const Field = ({ label, name, type = "text", required }: any) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label} {required && <span className="text-red-500">*</span>}</label>
      {type === "select" ? (
        <select name={name} value={(form as any)[name]} onChange={handleChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required={required}>
          <option value="">Select</option>
          {name === "gender" && ["Male", "Female", "Other"].map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <Input name={name} type={type} value={(form as any)[name]} onChange={handleChange} required={required} />
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/students"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-3xl font-bold">Register Student</h1>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="First Name" name="first_name" required /><Field label="Last Name" name="last_name" required />
              <Field label="Email" name="email" type="email" /><Field label="Phone" name="phone" />
              <Field label="Date of Birth" name="date_of_birth" type="date" />
              <Field label="Gender" name="gender" type="select" />
              <Field label="Address" name="address" /><Field label="Blood Group" name="blood_group" />
              <Field label="Religion" name="religion" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Parent / Guardian</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Father Name" name="father_name" /><Field label="Father Phone" name="father_phone" />
              <Field label="Mother Name" name="mother_name" /><Field label="Mother Phone" name="mother_phone" />
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader><CardTitle>Previous Education</CardTitle></CardHeader>
            <CardContent>
              <Field label="Previous School" name="previous_school" />
            </CardContent>
          </Card>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Link href="/students"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={loading}><Save className="mr-2 h-4 w-4" />{loading ? "Registering..." : "Register Student"}</Button>
        </div>
      </form>
    </div>
  )
}
