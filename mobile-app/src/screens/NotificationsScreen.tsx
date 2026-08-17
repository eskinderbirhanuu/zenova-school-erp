import { useCallback, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import PortalScreen, {
  LoadingState,
  ErrorState,
  FreshnessBadge,
  SectionCard,
} from "../components/PortalScreen"
import { useCachedResource } from "../hooks/useCachedResource"
import {
  fetchNotifications,
  fetchMessages,
  markNotificationRead,
  markAllNotificationsRead,
  markMessageRead,
  type Notification,
  type Message,
} from "../services/notifications"
import { useI18n } from "../i18n"
import { colors, type SchoolTheme } from "../theme/colors"

interface NotificationsScreenProps {
  schoolUrl: string
  theme: SchoolTheme
  onBack: () => void
  onSessionExpired: () => void
  /** Open a deep-linked destination when the user taps a notification. */
  onOpenNotification?: (n: Notification) => void
  /** Initial tab (used when deep-linked to messages). */
  initialTab?: Tab
}

const NOTIFICATIONS_CACHE = "zenova.cache.notifications"
const MESSAGES_CACHE = "zenova.cache.messages"

type Tab = "notifications" | "messages"

export default function NotificationsScreen({
  schoolUrl,
  theme,
  onBack,
  onSessionExpired,
  onOpenNotification,
  initialTab = "notifications",
}: NotificationsScreenProps) {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>(initialTab)

  const notifications = useCachedResource(
    useCallback(() => fetchNotifications(schoolUrl, false), [schoolUrl]),
    NOTIFICATIONS_CACHE,
  )
  const messages = useCachedResource(
    useCallback(() => fetchMessages(schoolUrl, false), [schoolUrl]),
    MESSAGES_CACHE,
  )

  if (notifications.sessionExpired || messages.sessionExpired) {
    onSessionExpired()
  }

  const handleMarkNotificationRead = useCallback(
    async (n: Notification) => {
      if (!n.is_read) {
        try {
          await markNotificationRead(schoolUrl, n.id)
          notifications.reload()
        } catch {
          // Non-fatal; the item stays unread.
        }
      }
      if (onOpenNotification) onOpenNotification(n)
    },
    [schoolUrl, notifications, onOpenNotification],
  )

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead(schoolUrl)
      notifications.reload()
    } catch {
      // Non-fatal.
    }
  }, [schoolUrl, notifications])

  const handleMarkMessageRead = useCallback(
    async (m: Message) => {
      if (m.is_read) return
      try {
        await markMessageRead(schoolUrl, m.id)
        messages.reload()
      } catch {
        // Non-fatal.
      }
    },
    [schoolUrl, messages],
  )

  const notifItems = notifications.data?.items ?? []
  const messageItems = messages.data?.items ?? []

  return (
    <PortalScreen theme={theme} title={t("featureMessages")} onBack={onBack}>
      <View style={styles.tabs}>
        <Pressable
          onPress={() => setTab("notifications")}
          style={[styles.tab, tab === "notifications" && { backgroundColor: theme.primary }]}
        >
          <Text style={[styles.tabText, tab === "notifications" && styles.tabTextActive]}>
            {t("notifications")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("messages")}
          style={[styles.tab, tab === "messages" && { backgroundColor: theme.primary }]}
        >
          <Text style={[styles.tabText, tab === "messages" && styles.tabTextActive]}>
            {t("messages")}
          </Text>
        </Pressable>
      </View>

      {tab === "notifications" ? (
        <>
          <FreshnessBadge freshness={notifications.freshness} />
          {notifications.data && notifItems.length > 0 ? (
            <Pressable onPress={handleMarkAllRead} style={styles.markAll}>
              <Text style={styles.markAllText}>{t("markAllRead")}</Text>
            </Pressable>
          ) : null}
          {notifications.loading && !notifications.data ? <LoadingState /> : null}
          {notifications.error && !notifications.data ? (
            <ErrorState message={notifications.error} onRetry={notifications.reload} />
          ) : null}
          {notifications.data && notifItems.length === 0 ? (
            <SectionCard>
              <Text style={styles.empty}>{t("noNotifications")}</Text>
            </SectionCard>
          ) : null}
          {notifItems.map((n) => (
            <Pressable key={n.id} onPress={() => handleMarkNotificationRead(n)}>
              <SectionCard>
                <View style={styles.row}>
                  <Text style={[styles.title, !n.is_read && styles.unreadTitle]}>{n.title}</Text>
                  {!n.is_read ? <View style={[styles.dot, { backgroundColor: theme.primary }]} /> : null}
                </View>
                {n.message ? <Text style={styles.content}>{n.message}</Text> : null}
                <Text style={styles.date}>
                  {n.created_at ? `${n.created_at.slice(0, 10)} ${n.created_at.slice(11, 16)}` : ""}
                </Text>
              </SectionCard>
            </Pressable>
          ))}
        </>
      ) : (
        <>
          <FreshnessBadge freshness={messages.freshness} />
          {messages.loading && !messages.data ? <LoadingState /> : null}
          {messages.error && !messages.data ? (
            <ErrorState message={messages.error} onRetry={messages.reload} />
          ) : null}
          {messages.data && messageItems.length === 0 ? (
            <SectionCard>
              <Text style={styles.empty}>{t("noMessages")}</Text>
            </SectionCard>
          ) : null}
          {messageItems.map((m) => (
            <Pressable key={m.id} onPress={() => handleMarkMessageRead(m)}>
              <SectionCard>
                <View style={styles.row}>
                  <Text style={[styles.title, !m.is_read && styles.unreadTitle]}>{m.subject}</Text>
                  {!m.is_read ? <View style={[styles.dot, { backgroundColor: theme.primary }]} /> : null}
                </View>
                {m.message ? <Text style={styles.content}>{m.message}</Text> : null}
                <Text style={styles.date}>
                  {m.sender_name ? `${m.sender_name} · ` : ""}
                  {m.created_at ? `${m.created_at.slice(0, 10)} ${m.created_at.slice(11, 16)}` : ""}
                </Text>
              </SectionCard>
            </Pressable>
          ))}
        </>
      )}
    </PortalScreen>
  )
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 8, marginBottom: 14 },
  tab: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  tabTextActive: { color: "#fff", fontWeight: "800" },
  markAll: { alignSelf: "flex-start", marginBottom: 10 },
  markAllText: { color: "#fff", fontSize: 13, fontWeight: "600", textDecorationLine: "underline" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { fontSize: 15, fontWeight: "800", color: colors.textPrimary, flexShrink: 1 },
  unreadTitle: { fontWeight: "900" },
  content: { fontSize: 13, color: colors.textSecondary, marginTop: 6, lineHeight: 19 },
  date: { fontSize: 11, color: colors.textSecondary, marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  empty: { fontSize: 13, color: colors.textSecondary, paddingVertical: 6 },
})
