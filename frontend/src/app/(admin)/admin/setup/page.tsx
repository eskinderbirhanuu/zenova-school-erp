"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { academicService, teacherService } from "@/services/api"
import { useSetupWizardStatus } from "@/hooks/queries"

const STEPS = [
  { id: "academic_year", label: "Academic Year" },
  { id: "classes", label: "Classes" },
  { id: "sections", label: "Sections" },
  { id: "subjects", label: "Subjects" },
  { id: "teachers", label: "Teachers" },
  { id: "done", label: "Done!" },
]

export default function SetupWizardPage() {
  const router = useRouter()
  const { data: wizardStatus, isLoading: statusLoading } = useSetupWizardStatus()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [academicYear, setAcademicYear] = useState({ name: "", start_date: "", end_date: "" })
  const [classes, setClasses] = useState([{ name: "", code: "" }])
  const [sections, setSections] = useState<{ classIndex: number; name: string; capacity: number }[]>([])
  const [subjects, setSubjects] = useState<{ classIndex: number; name: string; code: string }[]>([])
  const [teachers, setTeachers] = useState<{ full_name: string; email: string; password: string; subjectIndex: number }[]>([])

  const [createdClassIds, setCreatedClassIds] = useState<string[]>([])
  const [createdSubjectIds, setCreatedSubjectIds] = useState<string[]>([])

  useEffect(() => {
    if (!statusLoading) {
      if (wizardStatus?.all_done) {
        router.replace("/admin/dashboard")
      } else {
        setLoading(false)
      }
    }
  }, [wizardStatus, statusLoading, router])

  const addClass = () => setClasses([...classes, { name: "", code: "" }])
  const removeClass = (i: number) => {
    if (classes.length > 1) setClasses(classes.filter((_, idx) => idx !== i))
  }
  const updateClass = (i: number, field: string, value: string) => {
    const updated = [...classes]
    updated[i] = { ...updated[i], [field]: value }
    setClasses(updated)
  }

  const addSection = (classIndex: number) =>
    setSections([...sections, { classIndex, name: "", capacity: 40 }])
  const removeSection = (i: number) =>
    setSections(sections.filter((_, idx) => idx !== i))
  const updateSection = (i: number, field: string, value: any) => {
    const updated = [...sections]
    updated[i] = { ...updated[i], [field]: value }
    setSections(updated)
  }

  const addSubject = (classIndex: number) =>
    setSubjects([...subjects, { classIndex, name: "", code: "" }])
  const removeSubject = (i: number) =>
    setSubjects(subjects.filter((_, idx) => idx !== i))
  const updateSubject = (i: number, field: string, value: string) => {
    const updated = [...subjects]
    updated[i] = { ...updated[i], [field]: value }
    setSubjects(updated)
  }

  const addTeacher = () =>
    setTeachers([...teachers, { full_name: "", email: "", password: "changeme123", subjectIndex: 0 }])
  const removeTeacher = (i: number) => {
    if (teachers.length > 1) setTeachers(teachers.filter((_, idx) => idx !== i))
  }
  const updateTeacher = (i: number, field: string, value: any) => {
    const updated = [...teachers]
    updated[i] = { ...updated[i], [field]: value }
    setTeachers(updated)
  }

  const handleNext = async () => {
    setSaving(true)
    setError("")
    try {
      if (step === 0) {
        if (!academicYear.name || !academicYear.start_date || !academicYear.end_date) {
          setError("Please fill in all academic year fields")
          setSaving(false)
          return
        }
        await academicService.academicYears.create(academicYear)
      } else if (step === 1) {
        const invalid = classes.find((c: any) => !c.name || !c.code)
        if (invalid) { setError("Please fill in all class fields"); setSaving(false); return }
        const ids: string[] = []
        for (const c of classes) {
          const res = await academicService.classes.create(c)
          ids.push(res.data.id)
        }
        setCreatedClassIds(ids)
        setSections(ids.map((_, i) => ({ classIndex: i, name: "A", capacity: 40 })))
        setSubjects(ids.map((_, i) => ({ classIndex: i, name: "", code: "" })))
      } else if (step === 2) {
        const invalid = sections.find((s: any) => !s.name)
        if (invalid) { setError("Please fill in all section names"); setSaving(false); return }
        for (const s of sections) {
          await academicService.sections.create({
            name: s.name,
            class_id: createdClassIds[s.classIndex],
            capacity: s.capacity,
          } as any)
        }
      } else if (step === 3) {
        const invalid = subjects.find((s: any) => !s.name || !s.code)
        if (invalid) { setError("Please fill in all subject fields"); setSaving(false); return }
        const ids: string[] = []
        for (const s of subjects) {
          const res = await academicService.subjects.create({
            name: s.name,
            code: s.code,
            class_id: createdClassIds[s.classIndex],
          } as any)
          ids.push(res.data.id)
        }
        setCreatedSubjectIds(ids)
        setTeachers(ids.length > 0 ? [{ full_name: "", email: "", password: "changeme123", subjectIndex: 0 }] : [])
      } else if (step === 4) {
        const invalid = teachers.find((t: any) => !t.full_name || !t.email)
        if (invalid) { setError("Please fill in teacher name and email"); setSaving(false); return }
        for (const t of teachers) {
          const res = await teacherService.create({
            full_name: t.full_name,
            email: t.email,
            password: t.password,
          } as any)
          const teacherId = res.data.id
          const subjectId = createdSubjectIds[t.subjectIndex]
          if (subjectId) {
            await teacherService.assignSubjects(teacherId, [subjectId])
          }
        }
      }
      setStep(step + 1)
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Something went wrong")
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">School Setup Wizard</h1>
        <p className="text-gray-600 mb-6">Let us get your school ready. Follow the steps below.</p>

        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 shrink-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  i < step
                    ? "bg-green-500 text-white"
                    : i === step
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`text-sm ${i === step ? "font-semibold text-indigo-600" : "text-gray-500"}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && <span className="text-gray-300">—</span>}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
          )}

          {step === 5 && (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Setup Complete!</h2>
              <p className="text-gray-600 mb-6">
                Your school is now configured. You can always add more classes, subjects, and teachers later.
              </p>
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Go to Dashboard
              </button>
            </div>
          )}

          {step === 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Academic Year</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year Name</label>
                  <input
                    type="text"
                    value={academicYear.name}
                    onChange={(e) => setAcademicYear({ ...academicYear, name: e.target.value })}
                    placeholder="e.g. 2025-2026"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={academicYear.start_date}
                      onChange={(e) => setAcademicYear({ ...academicYear, start_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={academicYear.end_date}
                      onChange={(e) => setAcademicYear({ ...academicYear, end_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Classes (Grades)</h2>
                <button onClick={addClass} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                  + Add Class
                </button>
              </div>
              <div className="space-y-3">
                {classes.map((c, i) => (
                  <div key={i} className="flex gap-3 items-end border-b pb-3">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Name</label>
                      <input
                        type="text"
                        value={c.name}
                        onChange={(e) => updateClass(i, "name", e.target.value)}
                        placeholder="Grade 1"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-xs text-gray-500 mb-1">Code</label>
                      <input
                        type="text"
                        value={c.code}
                        onChange={(e) => updateClass(i, "code", e.target.value)}
                        placeholder="G1"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <button
                      onClick={() => removeClass(i)}
                      className="text-red-500 hover:text-red-700 text-sm pb-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Sections</h2>
                <div className="flex gap-2">
                  {createdClassIds.map((_, ci) => (
                    <button
                      key={ci}
                      onClick={() => addSection(ci)}
                      className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      + Section for {classes[ci]?.name || `Class ${ci + 1}`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {sections.length === 0 && (
                  <p className="text-gray-500 text-sm">Click above to add sections to your classes.</p>
                )}
                {sections.map((s, i) => (
                  <div key={i} className="flex gap-3 items-end border-b pb-3">
                    <div className="w-40">
                      <label className="block text-xs text-gray-500 mb-1">Class</label>
                      <p className="text-sm text-gray-800 py-2">{classes[s.classIndex]?.name}</p>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Section Name</label>
                      <input
                        type="text"
                        value={s.name}
                        onChange={(e) => updateSection(i, "name", e.target.value)}
                        placeholder="A"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-xs text-gray-500 mb-1">Capacity</label>
                      <input
                        type="number"
                        value={s.capacity}
                        onChange={(e) => updateSection(i, "capacity", parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <button
                      onClick={() => removeSection(i)}
                      className="text-red-500 hover:text-red-700 text-sm pb-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Subjects</h2>
                <div className="flex gap-2">
                  {createdClassIds.map((_, ci) => (
                    <button
                      key={ci}
                      onClick={() => addSubject(ci)}
                      className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      + Subject for {classes[ci]?.name || `Class ${ci + 1}`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {subjects.length === 0 && (
                  <p className="text-gray-500 text-sm">Click above to add subjects to your classes.</p>
                )}
                {subjects.map((s, i) => (
                  <div key={i} className="flex gap-3 items-end border-b pb-3">
                    <div className="w-36">
                      <label className="block text-xs text-gray-500 mb-1">Class</label>
                      <p className="text-sm text-gray-800 py-2">{classes[s.classIndex]?.name}</p>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Subject Name</label>
                      <input
                        type="text"
                        value={s.name}
                        onChange={(e) => updateSubject(i, "name", e.target.value)}
                        placeholder="Mathematics"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-xs text-gray-500 mb-1">Code</label>
                      <input
                        type="text"
                        value={s.code}
                        onChange={(e) => updateSubject(i, "code", e.target.value)}
                        placeholder="MATH"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <button
                      onClick={() => removeSubject(i)}
                      className="text-red-500 hover:text-red-700 text-sm pb-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Teachers</h2>
                <button onClick={addTeacher} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                  + Add Teacher
                </button>
              </div>
              <div className="space-y-4">
                {teachers.map((t, i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-700">Teacher {i + 1}</h3>
                      {teachers.length > 1 && (
                        <button onClick={() => removeTeacher(i)} className="text-red-500 hover:text-red-700 text-sm">
                          ✕ Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Full Name</label>
                        <input
                          type="text"
                          value={t.full_name}
                          onChange={(e) => updateTeacher(i, "full_name", e.target.value)}
                          placeholder="John Doe"
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Email</label>
                        <input
                          type="email"
                          value={t.email}
                          onChange={(e) => updateTeacher(i, "email", e.target.value)}
                          placeholder="john@school.com"
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Password</label>
                        <input
                          type="text"
                          value={t.password}
                          onChange={(e) => updateTeacher(i, "password", e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="block text-xs text-gray-500 mb-1">Assign Subject</label>
                      <select
                        value={t.subjectIndex}
                        onChange={(e) => updateTeacher(i, "subjectIndex", parseInt(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      >
                        {subjects.map((s, si) => (
                          <option key={si} value={si}>
                            {s.name} ({classes[s.classIndex]?.name})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {step < 5 && (
          <div className="flex justify-between">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="px-4 py-2 text-gray-600 border rounded-lg disabled:opacity-50"
            >
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Next"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
