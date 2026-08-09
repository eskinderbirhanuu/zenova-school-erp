import { apiGet } from "./api"

export interface StudentGrade {
  subject: string
  score: number
  max_score: number
  grade?: string | null
}

export interface ScheduleItem {
  time: string
  subject: string
  room: string
}

export interface AssignmentItem {
  title: string
  subject: string
  due_date: string
}

export interface StudentDashboard {
  student_name: string
  student_id: string
  grade_id?: string | null
  attendance_pct: number
  total_days: number
  present_days: number
  absent_days: number
  late_days: number
  subject_grades: StudentGrade[]
  today_schedule: ScheduleItem[]
  upcoming_assignments: AssignmentItem[]
  wallet_balance: number
}

export interface Assignment {
  id: string
  title: string
  subject?: string | null
  due_date?: string | null
  status?: string | null
}

export interface AssignmentsResponse {
  total: number
  data: Assignment[]
  skip: number
  limit: number
}

export interface Exam {
  id: string
  name: string
  subject_id: string
  class_id: string
  semester_id?: string | null
  exam_date?: string | null
  max_score?: number | null
  created_at?: string | null
}

export function fetchStudentDashboard(baseUrl: string): Promise<StudentDashboard> {
  return apiGet<StudentDashboard>(baseUrl, "/student-portal/dashboard")
}

export function fetchAssignments(baseUrl: string): Promise<AssignmentsResponse> {
  return apiGet<AssignmentsResponse>(baseUrl, "/assignments")
}

export function fetchExams(baseUrl: string): Promise<Exam[]> {
  return apiGet<Exam[]>(baseUrl, "/exams")
}
