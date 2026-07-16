"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { studentService, parentService } from "@/services/api"
import { useClasses, useSections } from "@/hooks/queries"
import { toast } from "@/hooks/use-toast"
import { ArrowLeft, Save, Search, X, Plus, UserCheck, User, GraduationCap, Heart, Phone, MapPin } from "lucide-react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

function SectionCard({ icon: Icon, title, children, className = "" }: { icon: any, title: string, children: React.ReactNode, className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`relative rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-primary/[0.01]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="relative p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shadow-sm">
            <Icon className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        {children}
      </div>
    </motion.div>
  )
}

function Field({ label, name, type = "text", required, placeholder, options, className = "", form, handleChange }: any) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label} {required && <span className="text-red-400">*</span>}</label>
      {type === "select" ? (
        <select
          name={name}
          value={(form as any)[name] ?? ""}
          onChange={handleChange}
          className="flex h-11 w-full rounded-xl border border-border/60 bg-background/80 px-4 py-2 text-sm backdrop-blur-sm
            focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all duration-200 cursor-pointer"
          required={required}
        >
          <option value="">Select {label}</option>
          {options?.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : type === "textarea" ? (
        <textarea
          name={name}
          rows={3}
          className="flex w-full rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm backdrop-blur-sm resize-none
            focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all duration-200"
          placeholder={placeholder}
        />
      ) : (
        <div className="relative">
          <Input name={name} type={type} required={required} placeholder={placeholder}
            className="h-11 rounded-xl border-border/60 bg-background/80 backdrop-blur-sm
              focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all duration-200" />
        </div>
      )}
    </div>
  )
}

const FieldGroup = ({ children }: { children: React.ReactNode }) => (
  <div className="grid gap-4 md:grid-cols-2">{children}</div>
)

export default function RegisterStudentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { data: classes } = useClasses()
  const [mounted, setMounted] = useState(false)

  const [form, setForm] = useState({
    first_name: "", middle_name: "", last_name: "",
    gender: "", date_of_birth: "",
    grade_id: "", section_id: "",
    stream: "", medical_notes: "",
    address: "", nationality: "", blood_group: "",
    emergency_contact: "",
  })
  const { data: sectionsData } = useSections(form.grade_id ? { class_id: form.grade_id } : {})

  const [parentQuery, setParentQuery] = useState("")
  const [parentResults, setParentResults] = useState<any[]>([])
  const [selectedParents, setSelectedParents] = useState<any[]>([])
  const [showParentSearch, setShowParentSearch] = useState(false)
  const [showNewParentForm, setShowNewParentForm] = useState(false)
  const [newParent, setNewParent] = useState({ full_name: "", phone_1: "", relationship: "" })
  const searchTimer = useRef<any>(null)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true) }, [])

  const searchParents = useCallback((q: string) => {
    if (q.length < 2) { setParentResults([]); return }
    parentService.search({ query: q }).then((r: any) => setParentResults(r.data)).catch(() => {})
  }, [])

  const handleParentQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setParentQuery(q)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => searchParents(q), 300)
  }

  const addParent = (p: any) => {
    if (!selectedParents.find((sp: any) => sp.id === p.id)) {
      setSelectedParents([...selectedParents, p])
    }
    setParentQuery("")
    setParentResults([])
    setShowParentSearch(false)
  }

  const removeParent = (id: string) => {
    setSelectedParents(selectedParents.filter((p: any) => p.id !== id))
  }

  const handleCreateNewParent = async () => {
    if (!newParent.full_name || !newParent.phone_1) {
      toast({ title: "Missing fields", description: "Name and phone are required", variant: "destructive" })
      return
    }
    try {
      const res = await parentService.create(newParent)
      addParent({ id: res.data.id, full_name: res.data.full_name, phone_1: res.data.phone_1 })
      setShowNewParentForm(false)
      setNewParent({ full_name: "", phone_1: "", relationship: "" })
      toast({ title: "Parent created", description: res.data.full_name })
    } catch {
      toast({ title: "Failed", description: "Could not create parent", variant: "destructive" })
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.first_name || !form.last_name || !form.gender || !form.date_of_birth) {
      toast({ title: "Missing required fields", description: "First name, last name, gender, and DOB are required", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const payload: any = { ...form }
      if (!payload.middle_name) delete payload.middle_name
      if (!payload.grade_id) delete payload.grade_id
      if (!payload.section_id) delete payload.section_id
      const res = await studentService.create(payload)
      const studentId = res.data.id
      for (const parent of selectedParents) {
        await parentService.link(parent.id, { student_id: studentId, relationship: parent.relationship || "guardian" })
      }
      toast({ title: "Student registered", description: `ID: ${res.data.student_id}` })
      router.push("/registrar/students")
    } catch (err: any) {
      toast({ title: "Failed", description: err.response?.data?.detail || "Check fields and try again", variant: "destructive" })
    } finally { setLoading(false) }
  }

  if (!mounted) return null

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl border border-border/40 bg-gradient-to-br from-background via-background to-primary/5 p-6 shadow-sm overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--primary)/4%,transparent_60%)] pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <Link href="/registrar/students">
            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10 hover:text-primary transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Register Student</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Fill in the student information below</p>
          </div>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <SectionCard icon={User} title="Personal Information">
            <FieldGroup>
              <Field label="First Name" name="first_name" required placeholder="Abebe" />
              <Field label="Middle Name" name="middle_name" placeholder="Kebede" />
              <Field label="Last Name" name="last_name" required placeholder="Girma" />
              <Field label="Gender" name="gender" type="select" required options={[{value:"male",label:"Male"},{value:"female",label:"Female"}]} />
              <Field label="Date of Birth" name="date_of_birth" type="date" required />
              <Field label="Nationality" name="nationality" placeholder="Ethiopian" />
              <Field label="Blood Group" name="blood_group" type="select" options={["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(b=>({value:b,label:b}))} />
              <Field label="Emergency Contact" name="emergency_contact" placeholder="+251 9xx xxx xxx" />
            </FieldGroup>
            <div className="mt-4">
              <Field label="Address" name="address" placeholder="Full address" />
            </div>
          </SectionCard>

          <div className="space-y-5">
            <SectionCard icon={GraduationCap} title="Academic Information">
              <div className="space-y-4">
                <Field label="Grade / Class" name="grade_id" type="select"
                  options={(classes || []).map((c: any) => ({value: c.id, label: c.name}))} />
                <Field label="Section" name="section_id" type="select"
                  options={(sectionsData || []).map((s: any) => ({value: s.id, label: s.name}))} />
                <Field label="Stream" name="stream" type="select"
                  options={[{value:"natural",label:"Natural Science"},{value:"social",label:"Social Science"},{value:"language",label:"Language"},{value:"vocational",label:"Vocational"}]} />
              </div>
            </SectionCard>

            <SectionCard icon={Heart} title="Health Information">
              <Field label="Medical Notes" name="medical_notes" type="textarea" placeholder="Allergies, chronic conditions, medications, etc." />
            </SectionCard>
          </div>

          <SectionCard icon={UserCheck} title="Parent / Guardian" className="md:col-span-2">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {selectedParents.map((p: any) => (
                    <motion.div key={p.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                      <Badge className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-xl bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 transition-colors">
                        <UserCheck className="h-3.5 w-3.5" />
                        <span className="font-medium">{p.full_name}</span>
                        <span className="text-primary/60">· {p.phone_1}</span>
                        <button type="button" onClick={() => removeParent(p.id)} className="ml-1 rounded-full hover:bg-primary/20 p-0.5 transition-colors">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {!showParentSearch ? (
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => setShowParentSearch(true)}>
                    <Search className="mr-1.5 h-3.5 w-3.5" /> Search Existing
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => setShowNewParentForm(true)}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> New Parent
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10 h-11 rounded-xl border-border/60 bg-background/80 backdrop-blur-sm
                        focus:ring-2 focus:ring-primary/40 focus:border-primary/50"
                      placeholder="Search by name or phone number..."
                      value={parentQuery}
                      onChange={handleParentQueryChange}
                      autoFocus
                    />
                  </div>
                  <AnimatePresence>
                    {parentResults.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border rounded-xl overflow-hidden bg-card/80 backdrop-blur-sm"
                      >
                        {parentResults.map((p: any) => (
                          <button
                            key={p.id} type="button"
                            className="w-full text-left px-4 py-3.5 hover:bg-primary/5 flex items-center justify-between group transition-colors border-b border-border/20 last:border-0"
                            onClick={() => addParent(p)}
                          >
                            <div>
                              <div className="font-medium text-sm">{p.full_name}</div>
                              <div className="text-xs text-muted-foreground">{p.phone_1}</div>
                            </div>
                            <Plus className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {parentQuery.length >= 2 && parentResults.length === 0 && (
                    <div className="text-center py-4 space-y-3">
                      <p className="text-sm text-muted-foreground">No parents found</p>
                      <div className="flex gap-2 justify-center">
                        <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => { setShowParentSearch(false); setShowNewParentForm(true); }}>
                          <Plus className="mr-1.5 h-3.5 w-3.5" /> Create New
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowParentSearch(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setShowParentSearch(false); setParentQuery(""); setParentResults([]); }}>Done</Button>
                </div>
              )}

              <AnimatePresence>
                {showNewParentForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 overflow-hidden"
                  >
                    <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                    <h4 className="text-sm font-medium text-muted-foreground">New Parent</h4>
                    <div className="grid gap-3 md:grid-cols-3">
                      <Input placeholder="Full Name" value={newParent.full_name}
                        onChange={e => setNewParent({...newParent, full_name: e.target.value})}
                        className="rounded-xl h-11" />
                      <Input placeholder="Phone Number" value={newParent.phone_1}
                        onChange={e => setNewParent({...newParent, phone_1: e.target.value})}
                        className="rounded-xl h-11" />
                      <select value={newParent.relationship}
                        onChange={e => setNewParent({...newParent, relationship: e.target.value})}
                        className="flex h-11 w-full rounded-xl border border-border/60 bg-background/80 px-4 py-2 text-sm">
                        <option value="">Relationship</option>
                        <option value="father">Father</option>
                        <option value="mother">Mother</option>
                        <option value="guardian">Guardian</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" className="rounded-xl" onClick={handleCreateNewParent}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" /> Create & Link
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewParentForm(false)}>Cancel</Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!showParentSearch && selectedParents.length === 0 && !showNewParentForm && (
                <p className="text-sm text-muted-foreground/70 italic">No parent linked yet. Search or create a parent to link.</p>
              )}
            </div>
          </SectionCard>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-end gap-3 pt-2"
        >
          <Link href="/registrar/students">
            <Button type="button" variant="outline" className="rounded-xl h-11 px-6">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading} className="rounded-xl h-11 px-8 shadow-lg shadow-primary/20">
            {loading ? (
              <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" /> Registering...</span>
            ) : (
              <span className="flex items-center gap-2"><Save className="h-4 w-4" /> Register Student</span>
            )}
          </Button>
        </motion.div>
      </form>
    </div>
  )
}
