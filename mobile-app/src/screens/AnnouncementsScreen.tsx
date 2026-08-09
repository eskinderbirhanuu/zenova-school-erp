import { useCallback } from "react"
import { StyleSheet, Text } from "react-native"
import PortalScreen, { LoadingState, ErrorState, FreshnessBadge, SectionCard } from "../components/PortalScreen"
import { useCachedResource } from "../hooks/useCachedResource"
import { fetchAnnouncements, type Announcement } from "../services/announcements"
import { useI18n } from "../i18n"
import { colors, type SchoolTheme } from "../theme/colors"

interface AnnouncementsScreenProps {
  schoolUrl: string
  theme: SchoolTheme
  onBack: () => void
  onSessionExpired: () => void
}

const ANNOUNCEMENTS_CACHE = "zenova.cache.announcements"

export default function AnnouncementsScreen({ schoolUrl, theme, onBack, onSessionExpired }: AnnouncementsScreenProps) {
  const { t } = useI18n()
  const { data, freshness, loading, error, sessionExpired, reload } = useCachedResource(
    useCallback(() => fetchAnnouncements(schoolUrl), [schoolUrl]),
    ANNOUNCEMENTS_CACHE,
  )

  if (sessionExpired) {
    onSessionExpired()
  }

  return (
    <PortalScreen theme={theme} title={t("featureAnnouncements")} onBack={onBack}>
      <FreshnessBadge freshness={freshness} />
      {loading && !data ? <LoadingState /> : null}
      {error && !data ? <ErrorState message={error} onRetry={reload} /> : null}
      {data && data.length === 0 ? (
        <SectionCard>
          <Text style={styles.empty}>{t("noAnnouncements")}</Text>
        </SectionCard>
      ) : null}
      {data?.map((a: Announcement) => (
        <SectionCard key={a.id}>
          <Text style={styles.title}>{a.title}</Text>
          <Text style={styles.content}>{a.content}</Text>
          {a.created_at ? <Text style={styles.date}>{a.created_at.slice(0, 10)}</Text> : null}
        </SectionCard>
      ))}
    </PortalScreen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 15, fontWeight: "800", color: colors.textPrimary },
  content: { fontSize: 13, color: colors.textSecondary, marginTop: 6, lineHeight: 19 },
  date: { fontSize: 11, color: colors.textSecondary, marginTop: 8 },
  empty: { fontSize: 13, color: colors.textSecondary, paddingVertical: 6 },
})
