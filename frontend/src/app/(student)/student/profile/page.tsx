"use client"

import { useMemo } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { useMe, useStudents } from "@/hooks/queries"
import {
  User,
  Mail,
  Phone,
  Hash,
  School,
  Calendar,
  Loader2,
  BadgeCheck,
} from "lucide-react"

interface StudentProfile {
  id: string
  student_id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  date_of_birth?: string
  gender?: string
  address?: string
  class_name?: string
  section_name?: string
  status?: string
  enrollment_date?: string
}

const FALLBACK_PROFILE: StudentProfile = {
  id: "1",
  student_id: "STU-001",
  first_name: "John",
  last_name: "Doe",
  email: "john.doe@example.com",
  phone: "+1 555-123-4567",
  date_of_birth: "2008-05-15",
  gender: "Male",
  address: "123 School Street, City",
  class_name: "Grade 10",
  section_name: "Section A",
  status: "active",
  enrollment_date: "2023-09-01",
}

export default function StudentProfile() {
  const { data: me, isLoading: meLoading, error: meError } = useMe()
  const { data: students, isLoading: studentsLoading, error: studentsError } = useStudents({ limit: 1 })

  const loading = meLoading || studentsLoading

  const profile = useMemo(() => {
    if (meError || studentsError) return FALLBACK_PROFILE
    if (!me || !students) return null
    const student = students.find(
      (s: any) => s.email === me.email || s.student_id === (me as any).student_id
    ) || {
      ...me,
      student_id: (me as any).student_id || me.id?.slice(0, 8).toUpperCase(),
      id: me.id,
    }
    return student as StudentProfile
  }, [me, students, meError, studentsError])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading...</span>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <User className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Could not load profile</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Profile</h1>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardContent className="flex flex-col items-center pt-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 mb-4">
              <User className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-xl font-bold">
              {profile.first_name} {profile.last_name}
            </h2>
            <div className="flex items-center gap-1 mt-1">
              <Hash className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-mono">
                {profile.student_id}
              </span>
            </div>
            <div className="mt-2">
              {profile.status === "active" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-medium">
                  <BadgeCheck className="h-3 w-3" />
                  Active
                </span>
              ) : (
                <span className="rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-xs font-medium">
                  {profile.status}
                </span>
              )}
            </div>
            <div className="mt-4 w-full space-y-2 text-sm">
              {profile.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.email}</span>
                </div>
              )}
              {profile.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.phone}</span>
                </div>
              )}
              {profile.class_name && (
                <div className="flex items-center gap-2">
                  <School className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {profile.class_name}
                    {profile.section_name ? ` (${profile.section_name})` : ""}
                  </span>
                </div>
              )}
              {profile.enrollment_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Enrolled {new Date(profile.enrollment_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Your personal and academic details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 text-sm">
                <div>
                  <span className="text-muted-foreground">First Name</span>
                  <p className="font-medium">{profile.first_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Name</span>
                  <p className="font-medium">{profile.last_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email</span>
                  <p className="font-medium">{profile.email || "Not set"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Phone</span>
                  <p className="font-medium">{profile.phone || "Not set"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date of Birth</span>
                  <p className="font-medium">
                    {profile.date_of_birth
                      ? new Date(profile.date_of_birth).toLocaleDateString()
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Gender</span>
                  <p className="font-medium">{profile.gender || "Not set"}</p>
                </div>
                <div className="md:col-span-2">
                  <span className="text-muted-foreground">Address</span>
                  <p className="font-medium">{profile.address || "Not set"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5" />
                Academic Information
              </CardTitle>
              <CardDescription>Your class, section, and enrollment details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Student ID</span>
                  <p className="font-medium font-mono">{profile.student_id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Class</span>
                  <p className="font-medium">{profile.class_name || "Not assigned"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Section</span>
                  <p className="font-medium">{profile.section_name || "Not assigned"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p className="font-medium capitalize">{profile.status || "active"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Enrollment Date</span>
                  <p className="font-medium">
                    {profile.enrollment_date
                      ? new Date(profile.enrollment_date).toLocaleDateString()
                      : "Not set"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
