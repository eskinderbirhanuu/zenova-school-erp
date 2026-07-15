"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useClasses, useSections, useAcademicYears } from "@/hooks/queries"
import { useCreateStudent, useCreateParent, useLinkParent, useSearchParents } from "@/hooks/queries"

export default function StudentRegistrationPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    first_name: "", middle_name: "", last_name: "",
    gender: "male", date_of_birth: "", address: "",
    nationality: "", medical_notes: "", blood_group: "",
    emergency_contact: "",
    class_id: "", section_id: "", academic_year_id: "",
  })

  const [parentForm, setParentForm] = useState({
    mode: "search", full_name: "", relationship: "father",
    phone_1: "", phone_2: "", occupation: "", address: "",
  })

  const { data: classes } = useClasses()
  const { data: sections } = useSections(form.class_id ? { class_id: form.class_id } : undefined)
  const { data: academicYears } = useAcademicYears()
  const { mutateAsync: createStudent } = useCreateStudent()
  const { mutateAsync: createParent } = useCreateParent()
  const { mutateAsync: linkParent } = useLinkParent()
  const { mutateAsync: searchParents } = useSearchParents()

  const [parentResults, setParentResults] = useState<any[]>([])
  const [parentQuery, setParentQuery] = useState("")
  const [searchingParent, setSearchingParent] = useState(false)

  const searchParent = async () => {
    if (!parentQuery.trim()) return
    setSearchingParent(true)
    try {
      const res = await searchParents({ query: parentQuery })
      setParentResults((res as any) || [])
    } catch { setParentResults([]) }
    setSearchingParent(false)
  }

  const handleNext = async () => {
    setSaving(true)
    setError("")
    try {
      if (step === 0) {
        if (!form.first_name || !form.last_name || !form.date_of_birth) {
          setError("First name, last name, and date of birth are required")
          setSaving(false)
          return
        }
      } else if (step === 1) {
        if (!form.class_id) {
          setError("Please select a class")
          setSaving(false)
          return
        }
      } else if (step === 2) {
        const studentPayload: any = {
          first_name: form.first_name,
          middle_name: form.middle_name || undefined,
          last_name: form.last_name,
          gender: form.gender,
          date_of_birth: form.date_of_birth,
          grade_id: form.class_id,
          section_id: form.section_id || undefined,
          academic_year_id: form.academic_year_id || undefined,
          address: form.address || undefined,
          nationality: form.nationality || undefined,
          medical_notes: form.medical_notes || undefined,
          blood_group: form.blood_group || undefined,
          emergency_contact: form.emergency_contact || undefined,
          admission_date: new Date().toISOString().split("T")[0],
        }

        const studentRes = await createStudent(studentPayload)
        const studentId = (studentRes as any).id

        if (parentForm.mode === "search" && parentForm.relationship) {
          const selectedParent = parentResults[0]
          if (selectedParent) {
            await linkParent({
              id: selectedParent.id,
              student_id: studentId,
              relationship: parentForm.relationship,
            })
          }
        } else if (parentForm.mode === "create") {
          if (!parentForm.full_name || !parentForm.phone_1) {
            setError("Parent name and phone are required to create a new parent")
            setSaving(false)
            return
          }
          const parentRes = await createParent({
            full_name: parentForm.full_name,
            relationship: parentForm.relationship,
            phone_1: parentForm.phone_1,
            phone_2: parentForm.phone_2 || undefined,
            occupation: parentForm.occupation || undefined,
            address: parentForm.address || undefined,
          })
          await linkParent({
            id: (parentRes as any).id,
            student_id: studentId,
            relationship: parentForm.relationship,
          })
        }

        router.push(`/admin/students/${studentId}`)
        return
      }
      setStep(step + 1)
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Registration failed")
    }
    setSaving(false)
  }

  const STEPS = ["Student Details", "Class Assignment", "Parent & Review"]

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Register New Student</h1>
      <p className="text-gray-600 mb-6">Enroll a new student in the school.</p>

      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              i < step ? "bg-green-500 text-white" : i === step ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500"
            }`}>
              {i < step ? "\u2713" : i + 1}
            </div>
            <span className={`text-sm ${i === step ? "font-semibold text-indigo-600" : "text-gray-500"}`}>{s}</span>
            {i < 2 && <span className="text-gray-300">\u2014</span>}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
        )}

        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4">Student Details</h2>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input type="text" value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                <input type="text" value={form.middle_name}
                  onChange={(e) => setForm({ ...form, middle_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input type="text" value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                <input type="date" value={form.date_of_birth}
                  onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                <select value={form.blood_group}
                  onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="">Select</option>
                  {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input type="text" value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
                <input type="text" value={form.nationality}
                  onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
                <input type="text" value={form.emergency_contact}
                  onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Medical Notes</label>
              <textarea value={form.medical_notes}
                onChange={(e) => setForm({ ...form, medical_notes: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4">Class Assignment</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class (Grade) *</label>
              <select value={form.class_id}
                onChange={(e) => setForm({ ...form, class_id: e.target.value, section_id: "" })}
                className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">Select class</option>
                {(classes || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {(sections || []).length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                <select value={form.section_id}
                  onChange={(e) => setForm({ ...form, section_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="">No section</option>
                  {(sections || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
              <select value={form.academic_year_id}
                onChange={(e) => setForm({ ...form, academic_year_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">Select year</option>
                {(academicYears || []).map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold mb-4">Parent / Guardian</h2>

            <div className="flex gap-2">
              <button
                onClick={() => setParentForm({ ...parentForm, mode: "search" })}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${parentForm.mode === "search" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"}`}
              >
                Link Existing Parent
              </button>
              <button
                onClick={() => setParentForm({ ...parentForm, mode: "create" })}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${parentForm.mode === "create" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"}`}
              >
                Create New Parent
              </button>
              <button
                onClick={() => setParentForm({ ...parentForm, mode: "skip" })}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${parentForm.mode === "skip" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"}`}
              >
                Skip
              </button>
            </div>

            {parentForm.mode === "search" && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={parentQuery}
                    onChange={(e) => setParentQuery(e.target.value)}
                    placeholder="Search by name or phone..."
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  />
                  <button onClick={searchParent} disabled={searchingParent}
                    className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
                    {searchingParent ? "..." : "Search"}
                  </button>
                </div>
                {parentResults.length > 0 && (
                  <div className="space-y-2">
                    {parentResults.slice(0, 5).map((p: any) => (
                      <label key={p.id} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input type="radio" name="parent" value={p.id}
                          onChange={() => {
                            setParentForm({ ...parentForm, full_name: p.full_name || p.name || "" })
                          }}
                          className="h-4 w-4" />
                        <div>
                          <p className="font-medium text-sm">{p.full_name || p.name}</p>
                          <p className="text-xs text-gray-500">{p.phone_1 || p.phone}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {parentForm.full_name && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                    <select value={parentForm.relationship}
                      onChange={(e) => setParentForm({ ...parentForm, relationship: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm">
                      <option value="father">Father</option>
                      <option value="mother">Mother</option>
                      <option value="guardian">Guardian</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {parentForm.mode === "create" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input type="text" value={parentForm.full_name}
                      onChange={(e) => setParentForm({ ...parentForm, full_name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                    <select value={parentForm.relationship}
                      onChange={(e) => setParentForm({ ...parentForm, relationship: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm">
                      <option value="father">Father</option>
                      <option value="mother">Mother</option>
                      <option value="guardian">Guardian</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                    <input type="text" value={parentForm.phone_1}
                      onChange={(e) => setParentForm({ ...parentForm, phone_1: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone 2</label>
                    <input type="text" value={parentForm.phone_2}
                      onChange={(e) => setParentForm({ ...parentForm, phone_2: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
                  <input type="text" value={parentForm.occupation}
                    onChange={(e) => setParentForm({ ...parentForm, occupation: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>
            )}

            {parentForm.mode === "skip" && (
              <p className="text-sm text-gray-500">Parent can be linked later from the student profile.</p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="px-4 py-2 text-gray-600 border rounded-lg disabled:opacity-50 text-sm">
          Back
        </button>
        <button onClick={handleNext} disabled={saving}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm">
          {saving ? "Saving..." : step === 2 ? "Register" : "Next"}
        </button>
      </div>
    </div>
  )
}
