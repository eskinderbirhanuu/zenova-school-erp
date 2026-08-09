import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useI18n } from "../i18n"
import { colors, type SchoolTheme } from "../theme/colors"
import { APP_VERSION } from "../config/app"

interface HomeScreenProps {
  schoolName: string
  roleName: string | null
  theme: SchoolTheme
  onSignOut: () => void
  onChangeSchool: () => void
  onOpenPortal: (portal: "parent" | "student" | "announcements" | "teacher") => void
}

type FeatureRoute = { key: string; portal: "parent" | "student" | "announcements" | "teacher" | null }

const ROLE_FEATURES: Record<string, FeatureRoute[]> = {
  PARENT: [
    { key: "featureChildren", portal: "parent" },
    { key: "featureAttendance", portal: "parent" },
    { key: "featureResults", portal: "parent" },
    { key: "featureFees", portal: "parent" },
    { key: "featureAnnouncements", portal: "announcements" },
    { key: "featureMessages", portal: null },
  ],
  STUDENT: [
    { key: "featureAttendance", portal: "student" },
    { key: "featureResults", portal: "student" },
    { key: "featureExams", portal: "student" },
    { key: "featureSchedule", portal: "student" },
    { key: "featureAnnouncements", portal: "announcements" },
  ],
  TEACHER: [
    { key: "featureAttendance", portal: "teacher" },
    { key: "featureResults", portal: "teacher" },
    { key: "featureExams", portal: "teacher" },
    { key: "featureSchedule", portal: "teacher" },
    { key: "featureAnnouncements", portal: "announcements" },
  ],
}

const DEFAULT_FEATURES: FeatureRoute[] = [
  { key: "featureAnnouncements", portal: "announcements" },
  { key: "featureResults", portal: null },
  { key: "featureAttendance", portal: null },
]

function roleLabel(roleName: string | null, t: (k: never) => string): string | null {
  if (!roleName) return null
  const map: Record<string, string> = {
    PARENT: "roleParent",
    STUDENT: "roleStudent",
    TEACHER: "roleTeacher",
  }
  if (map[roleName]) return t(map[roleName] as never)
  if (roleName.toUpperCase().includes("ADMIN") || roleName.toUpperCase().includes("DIRECTOR")) {
    return t("roleAdmin" as never)
  }
  return roleName
}

export default function HomeScreen({
  schoolName,
  roleName,
  theme,
  onSignOut,
  onChangeSchool,
  onOpenPortal,
}: HomeScreenProps) {
  const { t } = useI18n()
  const features = ROLE_FEATURES[roleName ?? ""] ?? DEFAULT_FEATURES
  const label = roleLabel(roleName, t as never)

  return (
    <LinearGradient colors={theme.gradient} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.school} numberOfLines={1}>
            {schoolName}
          </Text>
          {label ? <Text style={styles.role}>{label}</Text> : null}
        </View>

        <Text style={styles.sectionTitle}>{t("dashboard")}</Text>
        <View style={styles.grid}>
          {features.map((feature) => (
            <Pressable
              key={feature.key}
              onPress={() => (feature.portal ? onOpenPortal(feature.portal) : undefined)}
              style={({ pressed }) => [styles.tile, pressed && styles.dim]}
            >
              <Text style={styles.tileTitle}>{t(feature.key as never)}</Text>
              <Text style={styles.tileHint}>
                {feature.portal ? t("open") : t("featureComingSoon")}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={onChangeSchool} style={({ pressed }) => [styles.secondaryButton, pressed && styles.dim]}>
          <Text style={styles.secondaryText}>{t("changeSchool")}</Text>
        </Pressable>
        <Pressable
          onPress={onSignOut}
          style={({ pressed }) => [styles.button, { backgroundColor: theme.primary }, pressed && styles.dim]}
        >
          <Text style={styles.buttonText}>{t("signOut")}</Text>
        </Pressable>

        <Text style={styles.note}>ZENOVA mobile v{APP_VERSION}</Text>
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingTop: 64, paddingBottom: 32 },
  header: { alignItems: "center", marginBottom: 24 },
  school: { color: colors.textOnDark, fontSize: 24, fontWeight: "800", textAlign: "center" },
  role: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    marginTop: 6,
    fontWeight: "600",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  sectionTitle: { color: "rgba(255,255,255,0.9)", fontSize: 15, fontWeight: "700", marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: {
    width: "47%",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 16,
    padding: 16,
    minHeight: 84,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  tileTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  tileHint: { fontSize: 12, color: colors.textSecondary, marginTop: 6 },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  secondaryButton: { alignItems: "center", marginTop: 20 },
  secondaryText: { color: colors.textOnDark, fontSize: 14, fontWeight: "600", textDecorationLine: "underline" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  dim: { opacity: 0.7 },
  note: { color: "rgba(255,255,255,0.7)", fontSize: 12, textAlign: "center", marginTop: 28 },
})
