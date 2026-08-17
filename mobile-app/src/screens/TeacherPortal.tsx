import { useCallback, useEffect, useRef, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import PortalScreen, { LoadingState, ErrorState, FreshnessBadge, SectionCard } from "../components/PortalScreen"
import { useCachedResource } from "../hooks/useCachedResource"
import {
  fetchTeacherSubjects,
  fetchTeacherTimetable,
  fetchTeacherRoster,
  fetchMarksheet,
  fetchSectionAttendance,
  submitAttendance,
  fixAttendance,
  type TeacherSubject,
  type TimetableEntry,
  type Marksheet,
  type AttendanceRecord,
} from "../services/teacher"
import { enqueueAttendance, drainAttendanceQueue, getPendingAttendance } from "../services/queue"
import { useI18n } from "../i18n"
import { colors, type SchoolTheme } from "../theme/colors"
import { SessionExpiredError } from "../services/api"

interface TeacherPortalProps {
  schoolUrl: string
  theme: SchoolTheme
  onBack: () => void
  onSessionExpired: () => void
  initialView?: PortalView
}

type PortalView = "subjects" | "roster" | "timetable" | "attendance" | "marksheet"

const SUBJECTS_CACHE = "zenova.cache.teacher.subjects"
const TIMETABLE_CACHE = "zenova.cache.teacher.timetable"

type TKey = Parameters<ReturnType<typeof useI18n>["t"]>[0]

const DAY_KEYS: Record<number, TKey> = {
  0: "dayMonday",
  1: "dayTuesday",
  2: "dayWednesday",
  3: "dayThursday",
  4: "dayFriday",
  5: "daySaturday",
  6: "daySunday",
}

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6]

export default function TeacherPortal({ schoolUrl, theme, onBack, onSessionExpired, initialView }: TeacherPortalProps) {
  const { t } = useI18n()
  const [view, setView] = useState<PortalView>(initialView ?? "subjects")
  const [selectedSubject, setSelectedSubject] = useState<string>("")
  const [selectedSection, setSelectedSection] = useState<string>("")
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const syncingRef = useRef(false)

  const subjects = useCachedResource(
    useCallback(() => fetchTeacherSubjects(schoolUrl), [schoolUrl]),
    SUBJECTS_CACHE,
  )
  const timetable = useCachedResource(
    useCallback(() => fetchTeacherTimetable(schoolUrl), [schoolUrl]),
    TIMETABLE_CACHE,
  )

  const refreshQueue = useCallback(async () => {
    const pending = await getPendingAttendance()
    setPendingCount(pending.length)
  }, [])

  useEffect(() => {
    refreshQueue()
  }, [refreshQueue])

  useEffect(() => {
    if (view === "attendance" || view === "roster" || view === "marksheet") {
      if (!selectedSubject && subjects.data && subjects.data.length > 0) {
        setSelectedSubject(subjects.data[0].id)
      }
    }
  }, [view, selectedSubject, subjects.data])

  const sections = useMemoSections(timetable.data, selectedSubject)

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return
    syncingRef.current = true
    setSyncing(true)
    try {
      const status = await drainAttendanceQueue(schoolUrl)
      setPendingCount(status.pending)
    } catch (err) {
      if (err instanceof SessionExpiredError) onSessionExpired()
    } finally {
      syncingRef.current = false
      setSyncing(false)
    }
  }, [schoolUrl, onSessionExpired])

  useEffect(() => {
    syncNow().catch(() => {})
  }, [syncNow])

  if (subjects.sessionExpired || timetable.sessionExpired) {
    onSessionExpired()
  }

  const title =
    view === "subjects"
      ? t("mySubjects")
      : view === "roster"
        ? t("roster")
        : view === "timetable"
          ? t("timetable")
          : view === "attendance"
            ? t("markAttendance")
            : t("marksheet")

  return (
    <PortalScreen theme={theme} title={title} onBack={onBack}>
      {pendingCount > 0 ? (
        <Pressable onPress={syncNow} style={({ pressed }) => [styles.syncBanner, pressed && styles.dim]}>
          <Text style={styles.syncBannerText}>
            {syncing ? t("syncing") : t("queuedItems").replace("{count}", String(pendingCount))}
          </Text>
        </Pressable>
      ) : null}
      <View style={styles.tabs}>
        <Tab active={view === "subjects"} label={t("mySubjects")} onPress={() => setView("subjects")} />
        <Tab active={view === "roster"} label={t("roster")} onPress={() => setView("roster")} />
        <Tab active={view === "timetable"} label={t("timetable")} onPress={() => setView("timetable")} />
        <Tab active={view === "attendance"} label={t("markAttendance")} onPress={() => setView("attendance")} />
        <Tab active={view === "marksheet"} label={t("marksheet")} onPress={() => setView("marksheet")} />
      </View>

      {view === "subjects" ? (
        <SubjectsView
          data={subjects.data}
          loading={subjects.loading}
          error={subjects.error}
          onRetry={subjects.reload}
          freshness={subjects.freshness}
        />
      ) : null}
      {view === "roster" ? (
        <RosterView
          schoolUrl={schoolUrl}
          subjects={subjects.data}
          subjectId={selectedSubject}
          onSubject={setSelectedSubject}
          sectionId={selectedSection}
          onSection={setSelectedSection}
          sections={sections}
          loading={subjects.loading}
        />
      ) : null}
      {view === "timetable" ? (
        <TimetableView
          data={timetable.data}
          subjects={subjects.data}
          loading={timetable.loading}
          error={timetable.error}
          onRetry={timetable.reload}
          freshness={timetable.freshness}
        />
      ) : null}
      {view === "attendance" ? (
        <AttendanceView
          schoolUrl={schoolUrl}
          subjects={subjects.data}
          subjectId={selectedSubject}
          onSubject={setSelectedSubject}
          sectionId={selectedSection}
          onSection={setSelectedSection}
          sections={sections}
          onQueued={() => refreshQueue()}
          onSynced={() => refreshQueue()}
        />
      ) : null}
      {view === "marksheet" ? (
        <MarksheetView
          schoolUrl={schoolUrl}
          subjects={subjects.data}
          subjectId={selectedSubject}
          onSubject={setSelectedSubject}
          sectionId={selectedSection}
          onSection={setSelectedSection}
          sections={sections}
        />
      ) : null}
    </PortalScreen>
  )
}

function useMemoSections(timetable: TimetableEntry[] | null, subjectId: string): { id: string; name: string }[] {
  const { t } = useI18n()
  if (!timetable) return []
  const seen = new Set<string>()
  const out: { id: string; name: string }[] = []
  for (const e of timetable) {
    if (subjectId && e.subject_id !== subjectId) continue
    if (e.section_id && !seen.has(e.section_id)) {
      seen.add(e.section_id)
      out.push({ id: e.section_id, name: `${t("section")} ${e.section_id.slice(0, 8)}` })
    }
  }
  return out
}

function Tab({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  )
}

function SubjectsView({
  data,
  loading,
  error,
  onRetry,
  freshness,
}: {
  data: TeacherSubject[] | null
  loading: boolean
  error: string
  onRetry: () => void
  freshness: number | null
}) {
  const { t } = useI18n()
  if (loading && !data) return <LoadingState />
  if (error && !data) return <ErrorState message={error} onRetry={onRetry} />
  if (!data) return null
  return (
    <>
      <FreshnessBadge freshness={freshness} />
      {data.length === 0 ? (
        <SectionCard>
          <Text style={styles.empty}>{t("noSubjects")}</Text>
        </SectionCard>
      ) : (
        data.map((s) => (
          <SectionCard key={s.id}>
            <Text style={styles.name}>{s.name}</Text>
            <Text style={styles.meta}>{s.code}</Text>
          </SectionCard>
        ))
      )}
    </>
  )
}

function SubjectPicker({
  subjects,
  subjectId,
  onSubject,
}: {
  subjects: TeacherSubject[] | null
  subjectId: string
  onSubject: (id: string) => void
}) {
  const { t } = useI18n()
  if (!subjects || subjects.length === 0) return null
  return (
    <View style={styles.chips}>
      <Text style={styles.chipLabel}>{t("selectSubject")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {subjects.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => onSubject(s.id)}
            style={[styles.chip, subjectId === s.id && styles.chipActive]}
          >
            <Text style={[styles.chipText, subjectId === s.id && styles.chipTextActive]}>{s.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}

function SectionPicker({
  sections,
  sectionId,
  onSection,
}: {
  sections: { id: string; name: string }[]
  sectionId: string
  onSection: (id: string) => void
}) {
  const { t } = useI18n()
  if (sections.length === 0) return null
  return (
    <View style={styles.chips}>
      <Text style={styles.chipLabel}>{t("filterSection")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        <Pressable onPress={() => onSection("")} style={[styles.chip, !sectionId && styles.chipActive]}>
          <Text style={[styles.chipText, !sectionId && styles.chipTextActive]}>{t("allSections")}</Text>
        </Pressable>
        {sections.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => onSection(s.id)}
            style={[styles.chip, sectionId === s.id && styles.chipActive]}
          >
            <Text style={[styles.chipText, sectionId === s.id && styles.chipTextActive]}>{s.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}

function RosterView({
  schoolUrl,
  subjects,
  subjectId,
  onSubject,
  sectionId,
  onSection,
  sections,
  loading,
}: {
  schoolUrl: string
  subjects: TeacherSubject[] | null
  subjectId: string
  onSubject: (id: string) => void
  sectionId: string
  onSection: (id: string) => void
  sections: { id: string; name: string }[]
  loading: boolean
}) {
  const { t } = useI18n()
  const roster = useCachedResource(
    useCallback(
      () => fetchTeacherRoster(schoolUrl, sectionId || undefined, subjectId || undefined),
      [schoolUrl, sectionId, subjectId],
    ),
    null,
  )
  if (loading) return <LoadingState />
  return (
    <>
      <SubjectPicker subjects={subjects} subjectId={subjectId} onSubject={onSubject} />
      <SectionPicker sections={sections} sectionId={sectionId} onSection={onSection} />
      {roster.sessionExpired ? <Text style={styles.empty}>{t("sessionExpired")}</Text> : null}
      {roster.loading && !roster.data ? <LoadingState /> : null}
      {roster.error && !roster.data ? <ErrorState message={roster.error} onRetry={roster.reload} /> : null}
      {roster.data ? (
        roster.data.length === 0 ? (
          <SectionCard>
            <Text style={styles.empty}>{t("noStudents")}</Text>
          </SectionCard>
        ) : (
          roster.data.map((s) => (
            <SectionCard key={s.id}>
              <Text style={styles.name}>
                {s.first_name} {s.last_name}
              </Text>
              <Text style={styles.meta}>
                {s.student_id} • {s.grade_name}
                {s.section_name ? ` • ${s.section_name}` : ""}
              </Text>
            </SectionCard>
          ))
        )
      ) : null}
    </>
  )
}

function TimetableView({
  data,
  subjects,
  loading,
  error,
  onRetry,
  freshness,
}: {
  data: TimetableEntry[] | null
  subjects: TeacherSubject[] | null
  loading: boolean
  error: string
  onRetry: () => void
  freshness: number | null
}) {
  const { t } = useI18n()
  if (loading && !data) return <LoadingState />
  if (error && !data) return <ErrorState message={error} onRetry={onRetry} />
  if (!data) return null
  const subjectName = (id: string) => subjects?.find((s) => s.id === id)?.name ?? id
  return (
    <>
      <FreshnessBadge freshness={freshness} />
      {WEEKDAYS.map((day) => {
        const entries = data.filter((e) => e.day_of_week === day).sort((a, b) => (a.start_time > b.start_time ? 1 : -1))
        if (entries.length === 0) return null
        const dayKey = DAY_KEYS[day] ?? "dayMonday"
        return (
          <SectionCard key={day} title={t(dayKey)}>
            {entries.map((e) => (
              <View key={e.id} style={styles.rowBetween}>
                <Text style={styles.time}>
                  {e.start_time.slice(0, 5)}–{e.end_time.slice(0, 5)}
                </Text>
                <Text style={styles.subject} numberOfLines={1}>
                  {subjectName(e.subject_id)}
                </Text>
                <Text style={styles.room}>{e.section_id.slice(0, 8)}</Text>
              </View>
            ))}
          </SectionCard>
        )
      })}
      {data.length === 0 ? (
        <SectionCard>
          <Text style={styles.empty}>{t("noTimetable")}</Text>
        </SectionCard>
      ) : null}
    </>
  )
}

function AttendanceView({
  schoolUrl,
  subjects,
  subjectId,
  onSubject,
  sectionId,
  onSection,
  sections,
  onQueued,
  onSynced,
}: {
  schoolUrl: string
  subjects: TeacherSubject[] | null
  subjectId: string
  onSubject: (id: string) => void
  sectionId: string
  onSection: (id: string) => void
  sections: { id: string; name: string }[]
  onQueued: () => void
  onSynced: () => void
}) {
  const { t } = useI18n()
  const [mode, setMode] = useState<"mark" | "fix">("mark")
  const [marks, setMarks] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const roster = useCachedResource(
    useCallback(
      () => fetchTeacherRoster(schoolUrl, sectionId || undefined, subjectId || undefined),
      [schoolUrl, sectionId, subjectId],
    ),
    null,
  )

  const today = new Date().toISOString().slice(0, 10)
  const existing = useCachedResource(
    useCallback(
      () => (mode === "fix" && sectionId ? fetchSectionAttendance(schoolUrl, sectionId, today) : Promise.resolve(null)),
      [schoolUrl, sectionId, mode, today],
    ),
    null,
  )

  useEffect(() => {
    if (roster.data) {
      const next: Record<string, string> = {}
      for (const s of roster.data) next[s.id] = "present"
      setMarks(next)
    }
  }, [roster.data])

  useEffect(() => {
    setError("")
    setMessage("")
  }, [mode])

  const save = useCallback(async () => {
    if (busy || !roster.data || roster.data.length === 0) return
    setBusy(true)
    setError("")
    setMessage("")
    const records = roster.data.map((s) => ({ student_id: s.id, date: today, status: marks[s.id] ?? "present" }))
    try {
      const result = await submitAttendance(schoolUrl, records, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`)
      if (result.errors && result.errors.length > 0) {
        setError(result.errors[0].reason)
      } else {
        setMessage(t("attendanceSaved"))
        onSynced()
      }
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        setError(t("sessionExpired"))
        return
      }
      const status = err && typeof err === "object" && "status" in err ? (err as { status?: number }).status : undefined
      if (status === 403) {
        setError(t("attendanceWindow"))
      } else {
        await enqueueAttendance(schoolUrl, records)
        setMessage(t("attendanceOfflineQueued"))
        onQueued()
      }
    } finally {
      setBusy(false)
    }
  }, [busy, roster.data, marks, schoolUrl, t, onQueued, onSynced, today])

  const fix = useCallback(
    async (recordId: string, status: string) => {
      if (busy) return
      setBusy(true)
      setError("")
      setMessage("")
      try {
        await fixAttendance(schoolUrl, recordId, { status })
        setMessage(t("markFixed"))
        existing.reload()
      } catch (err) {
        if (err instanceof SessionExpiredError) {
          setError(t("sessionExpired"))
          return
        }
        const statusCode = err && typeof err === "object" && "status" in err ? (err as { status?: number }).status : undefined
        if (statusCode === 403) setError(t("attendanceWindow"))
        else setError(err instanceof Error ? err.message : t("loadFailed"))
      } finally {
        setBusy(false)
      }
    },
    [busy, schoolUrl, t, existing],
  )

  return (
    <>
      <SubjectPicker subjects={subjects} subjectId={subjectId} onSubject={onSubject} />
      <SectionPicker sections={sections} sectionId={sectionId} onSection={onSection} />
      <View style={styles.modeRow}>
        <Pressable onPress={() => setMode("mark")} style={[styles.modeChip, mode === "mark" && styles.modeChipActive]}>
          <Text style={[styles.modeChipText, mode === "mark" && styles.modeChipTextActive]}>{t("markMode")}</Text>
        </Pressable>
        <Pressable onPress={() => setMode("fix")} style={[styles.modeChip, mode === "fix" && styles.modeChipActive]}>
          <Text style={[styles.modeChipText, mode === "fix" && styles.modeChipTextActive]}>{t("fixMode")}</Text>
        </Pressable>
      </View>
      {mode === "fix" ? (
        <FixMarksView
          data={existing.data?.items ?? null}
          loading={existing.loading}
          error={existing.error}
          sessionExpired={existing.sessionExpired}
          onRetry={existing.reload}
          onFix={fix}
          busy={busy}
        />
      ) : null}
      {mode === "mark" ? (
        <>
          {roster.sessionExpired ? <Text style={styles.empty}>{t("sessionExpired")}</Text> : null}
          {roster.loading && !roster.data ? <LoadingState /> : null}
          {roster.error && !roster.data ? <ErrorState message={roster.error} onRetry={roster.reload} /> : null}
          {roster.data ? (
            roster.data.length === 0 ? (
              <SectionCard>
                <Text style={styles.empty}>{t("noStudents")}</Text>
              </SectionCard>
            ) : (
              <>
                {roster.data.map((s) => (
                  <SectionCard key={s.id}>
                    <Text style={styles.name}>
                      {s.first_name} {s.last_name}
                    </Text>
                    <Text style={styles.meta}>{s.student_id}</Text>
                    <StatusRow studentId={s.id} value={marks[s.id] ?? "present"} onChange={(v) => setMarks((m) => ({ ...m, [s.id]: v }))} />
                  </SectionCard>
                ))}
                {error ? <Text style={styles.error}>{error}</Text> : null}
                {message ? <Text style={styles.success}>{message}</Text> : null}
                <Pressable
                  onPress={save}
                  disabled={busy}
                  style={({ pressed }) => [styles.button, { backgroundColor: colors.primary }, (busy || pressed) && styles.dim]}
                >
                  <Text style={styles.buttonText}>{busy ? t("syncing") : t("saveAttendance")}</Text>
                </Pressable>
              </>
            )
          ) : null}
        </>
      ) : null}
    </>
  )
}

function FixMarksView({
  data,
  loading,
  error,
  sessionExpired,
  onRetry,
  onFix,
  busy,
}: {
  data: AttendanceRecord[] | null
  loading: boolean
  error: string
  sessionExpired: boolean
  onRetry: () => void
  onFix: (recordId: string, status: string) => void
  busy: boolean
}) {
  const { t } = useI18n()
  if (sessionExpired) return <Text style={styles.empty}>{t("sessionExpired")}</Text>
  if (loading && !data) return <LoadingState />
  if (error && !data) return <ErrorState message={error} onRetry={onRetry} />
  if (!data) return null
  if (data.length === 0) {
    return (
      <SectionCard>
        <Text style={styles.empty}>{t("noMarksToFix")}</Text>
      </SectionCard>
    )
  }
  return (
    <>
      {data.map((r) => (
        <SectionCard key={r.id}>
          <Text style={styles.name}>{r.student_name || r.student_id || "—"}</Text>
          <Text style={styles.meta}>{r.date}</Text>
          <StatusRow studentId={r.id} value={r.status} onChange={(v) => !busy && onFix(r.id, v)} />
        </SectionCard>
      ))}
    </>
  )
}

function StatusRow({ studentId, value, onChange }: { studentId: string; value: string; onChange: (v: string) => void }) {
  const { t } = useI18n()
  const options = [
    { key: "present", label: t("present") },
    { key: "absent", label: t("absent") },
    { key: "late", label: t("late") },
    { key: "excused", label: t("excused") },
  ]
  return (
    <View style={styles.statusRow}>
      {options.map((o) => (
        <Pressable
          key={o.key}
          onPress={() => onChange(o.key)}
          style={[styles.statusChip, value === o.key && styles.statusChipActive]}
        >
          <Text style={[styles.statusText, value === o.key && styles.statusTextActive]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  )
}

function MarksheetView({
  schoolUrl,
  subjects,
  subjectId,
  onSubject,
  sectionId,
  onSection,
  sections,
}: {
  schoolUrl: string
  subjects: TeacherSubject[] | null
  subjectId: string
  onSubject: (id: string) => void
  sectionId: string
  onSection: (id: string) => void
  sections: { id: string; name: string }[]
}) {
  const { t } = useI18n()
  const marksheet = useCachedResource(
    useCallback(
      () => (subjectId && sectionId ? fetchMarksheet(schoolUrl, subjectId, sectionId) : Promise.resolve(null)),
      [schoolUrl, subjectId, sectionId],
    ),
    null,
  )
  return (
    <>
      <SubjectPicker subjects={subjects} subjectId={subjectId} onSubject={onSubject} />
      <SectionPicker sections={sections} sectionId={sectionId} onSection={onSection} />
      {!subjectId || !sectionId ? (
        <SectionCard>
          <Text style={styles.empty}>{t("chooseClassFirst")}</Text>
        </SectionCard>
      ) : marksheet.loading ? (
        <LoadingState />
      ) : marksheet.error ? (
        <ErrorState message={marksheet.error} onRetry={marksheet.reload} />
      ) : marksheet.data ? (
        <MarksheetBody data={marksheet.data} />
      ) : null}
    </>
  )
}

function MarksheetBody({ data }: { data: Marksheet }) {
  const { t } = useI18n()
  if (data.exams.length === 0) {
    return (
      <SectionCard>
        <Text style={styles.empty}>{t("noMarksheet")}</Text>
      </SectionCard>
    )
  }
  return (
    <SectionCard title={data.section_name}>
      {data.students.map((s) => (
        <View key={s.id} style={styles.marksheetRow}>
          <Text style={styles.marksheetName} numberOfLines={1}>
            {s.full_name}
          </Text>
          {data.exams.map((e) => (
            <Text key={e.id} style={styles.marksheetScore}>
              {s.results[e.id] != null ? s.results[e.id] : "—"}
            </Text>
          ))}
          <Text style={styles.marksheetAvg}>{s.average != null ? s.average : "—"}</Text>
        </View>
      ))}
      <View style={styles.marksheetRow}>
        <Text style={styles.marksheetLabel}>{t("student")}</Text>
        {data.exams.map((e) => (
          <Text key={e.id} style={styles.marksheetScore} numberOfLines={1}>
            {e.name.length > 4 ? e.name.slice(0, 4) : e.name}
          </Text>
        ))}
        <Text style={styles.marksheetLabel}>{t("average")}</Text>
      </View>
    </SectionCard>
  )
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: "center" },
  tabActive: { backgroundColor: "rgba(255,255,255,0.92)" },
  tabText: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.9)" },
  tabTextActive: { color: colors.textPrimary },
  syncBanner: {
    backgroundColor: "rgba(245,158,11,0.92)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    alignItems: "center",
  },
  syncBannerText: { color: "#1F2937", fontSize: 13, fontWeight: "700" },
  name: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  empty: { fontSize: 13, color: colors.textSecondary, paddingVertical: 6 },
  chips: { marginBottom: 10 },
  chipLabel: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.9)", marginBottom: 6 },
  chipsRow: { gap: 8, paddingRight: 8 },
  chip: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.textPrimary },
  chipTextActive: { color: "#fff" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  time: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, width: 58 },
  subject: { fontSize: 14, color: colors.textPrimary, flex: 1, marginHorizontal: 8 },
  room: { fontSize: 12, color: colors.textSecondary },
  statusRow: { flexDirection: "row", gap: 6, marginTop: 10, flexWrap: "wrap" },
  modeRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  modeChip: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  modeChipActive: { backgroundColor: "#fff" },
  modeChipText: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.95)" },
  modeChipTextActive: { color: colors.textPrimary },
  statusChip: {
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusChipActive: { backgroundColor: colors.primary },
  statusText: { fontSize: 12, color: colors.textSecondary },
  statusTextActive: { color: "#fff", fontWeight: "700" },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  error: { color: colors.error, fontSize: 13, marginTop: 8 },
  success: { color: colors.success, fontSize: 13, marginTop: 8, fontWeight: "700" },
  dim: { opacity: 0.7 },
  marksheetRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4, gap: 6 },
  marksheetName: { flex: 2, fontSize: 13, color: colors.textPrimary },
  marksheetScore: { width: 32, textAlign: "center", fontSize: 12, color: colors.textSecondary },
  marksheetAvg: { width: 40, textAlign: "center", fontSize: 12, fontWeight: "700", color: colors.textPrimary },
  marksheetLabel: { flex: 2, fontSize: 11, fontWeight: "700", color: colors.textSecondary },
})
