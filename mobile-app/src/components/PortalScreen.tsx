import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useI18n } from "../i18n"
import { colors, type SchoolTheme } from "../theme/colors"

interface PortalScreenProps {
  theme: SchoolTheme
  title: string
  subtitle?: string
  onBack: () => void
  children: React.ReactNode
}

export default function PortalScreen({ theme, title, subtitle, onBack, children }: PortalScreenProps) {
  return (
    <LinearGradient colors={theme.gradient} style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.backSpacer} />
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </LinearGradient>
  )
}

export function LoadingState({ label }: { label?: string }) {
  const { t } = useI18n()
  return (
    <View style={styles.state}>
      <ActivityIndicator size="large" color="#fff" />
      <Text style={styles.stateText}>{label ?? t("loading")}</Text>
    </View>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useI18n()
  return (
    <View style={styles.state}>
      <Text style={styles.errorText}>{message || t("loadFailed")}</Text>
      <Pressable onPress={onRetry} style={({ pressed }) => [styles.retry, pressed && styles.dim]}>
        <Text style={styles.retryText}>{t("retry")}</Text>
      </Pressable>
    </View>
  )
}

export function FreshnessBadge({ freshness }: { freshness: number | null }) {
  const { t } = useI18n()
  if (!freshness) return null
  const mins = Math.floor((Date.now() - freshness) / 60000)
  const stale = mins > 30
  return (
    <View style={[styles.freshness, stale && styles.freshnessStale]}>
      <Text style={styles.freshnessText}>
        {t("updated")} {formatAge(mins)}
      </Text>
    </View>
  )
}

function formatAge(mins: number): string {
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  return `${h}h`
}

export function SectionCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  back: { minWidth: 70 },
  backText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  backSpacer: { minWidth: 70 },
  title: { color: "#fff", fontSize: 18, fontWeight: "800", flexShrink: 1, textAlign: "center" },
  subtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  content: { padding: 16, paddingBottom: 40 },
  state: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 24 },
  stateText: { color: "rgba(255,255,255,0.9)", marginTop: 12, fontSize: 14 },
  errorText: { color: "#fff", fontSize: 14, textAlign: "center", marginBottom: 16 },
  retry: {
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: colors.textPrimary, fontWeight: "700" },
  dim: { opacity: 0.7 },
  freshness: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 10,
  },
  freshnessStale: { backgroundColor: "rgba(245,158,11,0.35)" },
  freshnessText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  card: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardTitle: { fontSize: 13, fontWeight: "700", color: colors.textPrimary, marginBottom: 8 },
})
