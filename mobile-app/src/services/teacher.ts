import { apiGet, apiPost, apiPatch } from "./api"

export interface TeacherSubject {
  id: string
  name: string
  code: string
}

export interface RosterStudent {
  id: string
  student_id: string
  first_name: string
  last_name: string
  grade_name: string
  section_id?: string | null
  section_name?: string | null
  status?: string | null
}

export interface TimetableEntry {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  subject_id: string
  teacher_id?: string | null
  section_id: string
  classroom_id?: string | null
}

export interface AttendanceBulkItem {
  student_id?: string | null
  staff_profile_id?: string | null
  date: string
  status: string
  reason?: string | null
}

export interface AttendanceBulkResult {
  created: number
  errors: { index: number; reason: string }[]
}

export interface MarksheetExam {
  id: string
  name: string
  max_score: number
  exam_date?: string | null
}

export interface MarksheetStudent {
  id: string
  student_id: string
  full_name: string
  results: Record<string, number | null>
  average?: number | null
}

export interface Marksheet {
  subject_id: string
  section_id: string
  section_name: string
  exams: MarksheetExam[]
  students: MarksheetStudent[]
}

export interface AttendanceRecord {
  id: string
  student_id?: string | null
  date: string
  status: string
  reason?: string | null
  student_name?: string | null
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export function fetchSectionAttendance(
  baseUrl: string,
  sectionId: string,
  date: string,
): Promise<PaginatedResponse<AttendanceRecord>> {
  const params = new URLSearchParams({ date, section_id: sectionId })
  return apiGet<PaginatedResponse<AttendanceRecord>>(baseUrl, `/attendance?${params.toString()}`)
}

export function fetchTeacherSubjects(baseUrl: string): Promise<TeacherSubject[]> {
  return apiGet<TeacherSubject[]>(baseUrl, "/teachers/me/subjects")
}

export function fetchTeacherRoster(
  baseUrl: string,
  sectionId?: string,
  subjectId?: string,
): Promise<RosterStudent[]> {
  const params = new URLSearchParams()
  if (sectionId) params.set("section_id", sectionId)
  if (subjectId) params.set("subject_id", subjectId)
  const qs = params.toString()
  return apiGet<RosterStudent[]>(baseUrl, `/teachers/me/students${qs ? `?${qs}` : ""}`)
}

export function fetchTeacherTimetable(baseUrl: string): Promise<TimetableEntry[]> {
  return apiGet<TimetableEntry[]>(baseUrl, "/timetable/by-teacher")
}

export function submitAttendance(
  baseUrl: string,
  records: AttendanceBulkItem[],
  idempotencyKey: string,
): Promise<AttendanceBulkResult> {
  return apiPost<AttendanceBulkResult>(baseUrl, "/attendance/bulk", records, {
    "X-Idempotency-Key": idempotencyKey,
  })
}

export function fixAttendance(
  baseUrl: string,
  attendanceId: string,
  update: { status?: string; reason?: string },
): Promise<unknown> {
  return apiPatch<unknown>(baseUrl, `/attendance/${attendanceId}`, update)
}

export function fetchMarksheet(
  baseUrl: string,
  subjectId: string,
  sectionId: string,
): Promise<Marksheet> {
  const params = new URLSearchParams({ subject_id: subjectId, section_id: sectionId })
  return apiGet<Marksheet>(baseUrl, `/exam-results/marksheet?${params.toString()}`)
}
