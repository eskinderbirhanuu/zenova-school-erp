import { useCallback, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import PortalScreen, { LoadingState, ErrorState, FreshnessBadge, SectionCard } from "../components/PortalScreen"
import { useCachedResource } from "../hooks/useCachedResource"
import { fetchStudentDashboard, fetchAssignments, fetchExams, type StudentDashboard, type Assignment, type Exam } from "../services/student"
import { useI18n } from "../i18n"
import { colors, type SchoolTheme } from "../theme/colors"

interface StudentPortalProps {
  schoolUrl: string
  theme: SchoolTheme
  onBack: () => void
  onSessionExpired: () => void
}

type PortalView = "dashboard" | "assignments" | "exams"

const DASHBOARD_CACHE = "zenova.cache.student.dashboard"
const ASSIGNMENTS_CACHE = "zenova.cache.student.assignments"
const EXAMS_CACHE = "zenova.cache.student.exams"

export default function StudentPortal({ schoolUrl, theme, onBack, onSessionExpired }: StudentPortalProps) {
  const { t } = useI18n()
  const [view, setView] = useState<PortalView>("dashboard")

  const dash = useCachedResource(
    useCallback(() => fetchStudentDashboard(schoolUrl), [schoolUrl]),
    DASHBOARD_CACHE,
  )
  const assignments = useCachedResource(
    useCallback(() => fetchAssignments(schoolUrl), [schoolUrl]),
    ASSIGNMENTS_CACHE,
  )
  const exams = useCachedResource(
    useCallback(() => fetchExams(schoolUrl), [schoolUrl]),
    EXAMS_CACHE,
  )

  if (dash.sessionExpired || assignments.sessionExpired || exams.sessionExpired) {
    onSessionExpired()
  }

  const title = view === "dashboard" ? t("dashboard") : view === "assignments" ? t("assignments") : t("exams")

  return (
    <PortalScreen theme={theme} title={title} onBack={onBack}>
      <View style={styles.tabs}>
        <Tab active={view === "dashboard"} label={t("dashboard")} onPress={() => setView("dashboard")} />
        <Tab active={view === "assignments"} label={t("assignments")} onPress={() => setView("assignments")} />
        <Tab active={view === "exams"} label={t("exams")} onPress={() => setView("exams")} />
      </View>

      {view === "dashboard" ? (
        <DashboardView data={dash.data} loading={dash.loading} error={dash.error} onRetry={dash.reload} freshness={dash.freshness} />
      ) : view === "assignments" ? (
        <AssignmentsView data={assignments.data} loading={assignments.loading} error={assignments.error} onRetry={assignments.reload} freshness={assignments.freshness} />
      ) : (
        <ExamsView data={exams.data} loading={exams.loading} error={exams.error} onRetry={exams.reload} freshness={exams.freshness} />
      )}
    </PortalScreen>
  )
}

function Tab({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  )
}

function DashboardView({
  data,
  loading,
  error,
  onRetry,
  freshness,
}: {
  data: StudentDashboard | null
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
      <SectionCard>
        <Text style={styles.name}>{data.student_name}</Text>
        <Text style={styles.meta}>{data.student_id}</Text>
        <View style={styles.statRow}>
          <Stat label={t("attendance")} value={`${data.attendance_pct}%`} />
          <Stat label={t("presentDays")} value={`${data.present_days}`} />
          <Stat label={t("absentDays")} value={`${data.absent_days}`} />
        </View>
        <View style={styles.walletRow}>
          <Text style={styles.walletLabel}>{t("walletBalance")}</Text>
          <Text style={styles.walletValue}>{formatMoney(data.wallet_balance)}</Text>
        </View>
      </SectionCard>

      <SectionCard title={t("scheduleToday")}>
        {data.today_schedule.length === 0 ? (
          <Text style={styles.empty}>{t("noSchedule")}</Text>
        ) : (
          data.today_schedule.map((s, i) => (
            <View key={i} style={styles.rowBetween}>
              <Text style={styles.time}>{s.time}</Text>
              <Text style={styles.subject} numberOfLines={1}>{s.subject}</Text>
              <Text style={styles.room}>{s.room}</Text>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard title={t("subjectGrades")}>
        {data.subject_grades.length === 0 ? (
          <Text style={styles.empty}>{t("noGrades")}</Text>
        ) : (
          data.subject_grades.map((g, i) => (
            <View key={i} style={styles.rowBetween}>
              <Text style={styles.subject} numberOfLines={1}>{g.subject}</Text>
              <Text style={styles.gradeText}>
                {g.score}/{g.max_score} {g.grade ? `• ${g.grade}` : ""}
              </Text>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard title={t("upcomingAssignments")}>
        {data.upcoming_assignments.length === 0 ? (
          <Text style={styles.empty}>{t("noAssignments")}</Text>
        ) : (
          data.upcoming_assignments.map((a, i) => (
            <View key={i} style={styles.rowBetween}>
              <Text style={styles.subject} numberOfLines={1}>{a.title}</Text>
              <Text style={styles.room}>{a.due_date}</Text>
            </View>
          ))
        )}
      </SectionCard>
    </>
  )
}

function AssignmentsView({
  data,
  loading,
  error,
  onRetry,
  freshness,
}: {
  data: { total: number; data: Assignment[] } | null
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
      {data.data.length === 0 ? (
        <SectionCard>
          <Text style={styles.empty}>{t("noAssignments")}</Text>
        </SectionCard>
      ) : (
        data.data.map((a) => (
          <SectionCard key={a.id}>
            <Text style={styles.name}>{a.title}</Text>
            {a.subject ? <Text style={styles.meta}>{a.subject}</Text> : null}
            {a.due_date ? (
              <Text style={styles.meta}>
                {t("due")}: {a.due_date.slice(0, 10)}
              </Text>
            ) : null}
          </SectionCard>
        ))
      )}
    </>
  )
}

function ExamsView({
  data,
  loading,
  error,
  onRetry,
  freshness,
}: {
  data: Exam[] | null
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
          <Text style={styles.empty}>{t("noExams")}</Text>
        </SectionCard>
      ) : (
        data.map((e) => (
          <SectionCard key={e.id}>
            <Text style={styles.name}>{e.name}</Text>
            {e.exam_date ? (
              <Text style={styles.meta}>
                {t("date")}: {e.exam_date.slice(0, 10)}
              </Text>
            ) : null}
            {e.max_score ? (
              <Text style={styles.meta}>
                {t("maxScore")}: {e.max_score}
              </Text>
            ) : null}
          </SectionCard>
        ))
      )}
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function formatMoney(n: number): string {
  return `${n.toLocaleString()} ETB`
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
  tabText: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.9)" },
  tabTextActive: { color: colors.textPrimary },
  name: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  statRow: { flexDirection: "row", marginTop: 10, gap: 8 },
  stat: { flex: 1, backgroundColor: "#F3F4F6", borderRadius: 10, padding: 8, alignItems: "center" },
  statValue: { fontSize: 15, fontWeight: "800", color: colors.textPrimary },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  walletRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 10,
  },
  walletLabel: { fontSize: 13, color: colors.textSecondary },
  walletValue: { fontSize: 15, fontWeight: "800", color: colors.textPrimary },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  time: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, width: 48 },
  subject: { fontSize: 14, color: colors.textPrimary, flex: 1, marginHorizontal: 8 },
  room: { fontSize: 13, color: colors.textSecondary },
  gradeText: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  empty: { fontSize: 13, color: colors.textSecondary, paddingVertical: 6 },
})
