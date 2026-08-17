import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, StyleSheet, View } from "react-native"
import { StatusBar } from "expo-status-bar"
import { I18nProvider } from "./src/i18n"
import {
  clearStoredSchoolUrl,
  clearStoredSession,
  getStoredSchoolBranding,
  getStoredSchoolUrl,
  getStoredToken,
  setStoredSchoolBranding,
  setStoredSchoolUrl,
} from "./src/services/storage"
import { fetchRemoteConfig, isVersionAtLeast, type RemoteConfig } from "./src/services/config"
import { defaultTheme, themeFromBranding, type SchoolTheme } from "./src/theme/colors"
import { APP_VERSION } from "./src/config/app"
import type { ResolvedSchool } from "./src/services/resolve"
import { pickBaseUrl, probeLocalEndpoint } from "./src/services/resolve"
import { getStoredLocalUrl } from "./src/services/storage"
import { validateSession, clearCsrfCache, SessionExpiredError } from "./src/services/api"
import { registerDeviceForPush, unregisterDeviceForPush } from "./src/services/push"
import SchoolSelectScreen from "./src/screens/SchoolSelectScreen"
import LoginScreen from "./src/screens/LoginScreen"
import MFAScreen from "./src/screens/MFAScreen"
import HomeScreen from "./src/screens/HomeScreen"
import UpdateRequiredScreen from "./src/screens/UpdateRequiredScreen"
import ParentPortal from "./src/screens/ParentPortal"
import StudentPortal from "./src/screens/StudentPortal"
import AnnouncementsScreen from "./src/screens/AnnouncementsScreen"
import NotificationsScreen from "./src/screens/NotificationsScreen"
import TeacherPortal from "./src/screens/TeacherPortal"
import SecurityScreen from "./src/screens/SecurityScreen"
import { colors } from "./src/theme/colors"
import { resolveNotificationTarget, resolvePushTarget, type DeepLinkTarget } from "./src/services/deepLink"
import type { Notification } from "./src/services/notifications"

type Stage = "booting" | "school" | "login" | "mfa" | "home" | "portal" | "update"
type Portal = "parent" | "student" | "announcements" | "teacher" | "notifications" | "security"

const DEFAULT_CONFIG: RemoteConfig = {
  minimum_version: "1.0.0",
  recommended_version: "1.0.0",
  maintenance_mode: false,
  message: "",
  features: {},
}

export default function App() {
  return (
    <I18nProvider>
      <Root />
    </I18nProvider>
  )
}

function Root() {
  const [stage, setStage] = useState<Stage>("booting")
  const [portal, setPortal] = useState<Portal>("announcements")
  const [schoolUrl, setSchoolUrl] = useState("")
  const [schoolName, setSchoolName] = useState("")
  const [theme, setTheme] = useState<SchoolTheme>(defaultTheme())
  const [roleName, setRoleName] = useState<string | null>(null)
  const [mfaToken, setMfaToken] = useState<string | null>(null)
  const [mfaSetupRequired, setMfaSetupRequired] = useState(false)
  const [remoteConfig, setRemoteConfig] = useState<RemoteConfig>(DEFAULT_CONFIG)
  const [deepLink, setDeepLink] = useState<DeepLinkTarget>(null)

  useEffect(() => {
    ;(async () => {
      const [storedUrl, storedToken, storedBranding] = await Promise.all([
        getStoredSchoolUrl(),
        getStoredToken(),
        getStoredSchoolBranding<ResolvedSchool["branding"]>(),
      ])
      const config = await fetchRemoteConfig()
      setRemoteConfig(config)
      if (config.maintenance_mode) {
        setStage("update")
        return
      }
      if (!isVersionAtLeast(APP_VERSION, config.minimum_version)) {
        setStage("update")
        return
      }
      if (storedUrl && storedToken) {
        setSchoolUrl(storedUrl)
        setSchoolName(storedUrl.replace(/^https?:\/\//, ""))
        setTheme(themeFromBranding(storedBranding))
        try {
          const session = await validateSession(storedUrl)
          setRoleName(session.roleName)
          setStage("home")
          void registerDeviceForPush(storedUrl)
        } catch (err) {
          if (err instanceof SessionExpiredError) {
            await clearStoredSession()
            setStage("login")
          } else {
            // Backend unreachable: keep the cached session and show home (offline-first).
            setStage("home")
          }
        }
      } else if (storedUrl) {
        setSchoolUrl(storedUrl)
        setSchoolName(storedUrl.replace(/^https?:\/\//, ""))
        setTheme(themeFromBranding(storedBranding))
        setStage("login")
      } else {
        setStage("school")
      }
    })()
  }, [])

  const handleSelectSchool = useCallback(async (url: string, name: string) => {
    await setStoredSchoolUrl(url)
    await setStoredSchoolBranding(null)
    setSchoolUrl(url)
    setSchoolName(name)
    setTheme(defaultTheme())
    setStage("login")
  }, [])

  const handleSelectResolvedSchool = useCallback(async (school: ResolvedSchool) => {
    const storedLocal = await getStoredLocalUrl(school.code)
    const url = await pickBaseUrl(school, storedLocal)
    await setStoredSchoolUrl(url)
    await setStoredSchoolBranding(school.branding)
    setSchoolUrl(url)
    setSchoolName(school.name)
    setTheme(themeFromBranding(school.branding))
    setStage("login")
  }, [])

  const handleSignedIn = useCallback((role: string | null) => {
    setRoleName(role)
    setMfaToken(null)
    setMfaSetupRequired(false)
    setStage("home")
    void registerDeviceForPush(schoolUrl)
  }, [schoolUrl])

  const handleMfaRequired = useCallback((token: string, setupRequired: boolean) => {
    setMfaToken(token)
    setMfaSetupRequired(setupRequired)
    setStage("mfa")
  }, [])

  const handleChangeSchool = useCallback(async () => {
    if (schoolUrl) void unregisterDeviceForPush(schoolUrl)
    await clearStoredSchoolUrl()
    await clearStoredSession()
    await setStoredSchoolBranding(null)
    clearCsrfCache()
    setRoleName(null)
    setMfaToken(null)
    setMfaSetupRequired(false)
    setTheme(defaultTheme())
    setStage("school")
  }, [schoolUrl])

  const handleSignOut = useCallback(async () => {
    if (schoolUrl) void unregisterDeviceForPush(schoolUrl)
    await clearStoredSession()
    clearCsrfCache()
    setRoleName(null)
    setMfaToken(null)
    setMfaSetupRequired(false)
    setStage("login")
  }, [schoolUrl])

  const handleOpenPortal = useCallback((p: Portal) => {
    setPortal(p)
    setDeepLink(null)
    setStage("portal")
  }, [])

  const handleOpenNotification = useCallback(
    (n: Notification) => {
      const target = resolveNotificationTarget(roleName, n)
      if (!target) return
      setPortal(target.portal)
      setDeepLink(target)
      setStage("portal")
    },
    [roleName],
  )

  const handleClosePortal = useCallback(() => {
    setPortal("announcements")
    setDeepLink(null)
    setStage("home")
  }, [])

  const handleSessionExpired = useCallback(() => {
    handleSignOut()
  }, [handleSignOut])

  useEffect(() => {
    if (stage !== "home" || !schoolUrl) return
    let unsub: (() => void) | null = null
    try {
      const Notifications = require("expo-notifications")
      unsub = Notifications.addNotificationResponseReceivedListener((response: { notification: { request: { content: { data?: Record<string, string | number | boolean | null> } } } }) => {
        const target = resolvePushTarget(response.notification.request.content.data)
        if (!target) return
        setPortal(target.portal)
        setDeepLink(target)
        setStage("portal")
      })
    } catch {
      // Push listener is best-effort; ignore when expo-notifications is absent.
    }
    return () => {
      if (unsub) unsub()
    }
  }, [stage, schoolUrl])

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {stage === "booting" ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : null}
      {stage === "school" ? (
        <SchoolSelectScreen onSelect={handleSelectSchool} onSelectResolved={handleSelectResolvedSchool} />
      ) : null}
      {stage === "login" ? (
        <LoginScreen
          schoolUrl={schoolUrl}
          schoolName={schoolName}
          theme={theme}
          onSignedIn={handleSignedIn}
          onMfaRequired={handleMfaRequired}
          onChangeSchool={handleChangeSchool}
        />
      ) : null}
      {stage === "mfa" && mfaToken ? (
        <MFAScreen
          schoolUrl={schoolUrl}
          schoolName={schoolName}
          mfaToken={mfaToken}
          setupRequired={mfaSetupRequired}
          theme={theme}
          onVerified={handleSignedIn}
          onBack={() => setStage("login")}
        />
      ) : null}
      {stage === "home" ? (
        <HomeScreen
          schoolName={schoolName}
          roleName={roleName}
          theme={theme}
          onSignOut={handleSignOut}
          onChangeSchool={handleChangeSchool}
          onOpenPortal={handleOpenPortal}
        />
      ) : null}
      {stage === "portal" ? (
        portal === "parent" ? (
          <ParentPortal
            schoolUrl={schoolUrl}
            schoolName={schoolName}
            theme={theme}
            onBack={handleClosePortal}
            onSessionExpired={handleSessionExpired}
            initialView={deepLink?.portal === "parent" ? deepLink.view : undefined}
          />
        ) : portal === "student" ? (
          <StudentPortal
            schoolUrl={schoolUrl}
            theme={theme}
            onBack={handleClosePortal}
            onSessionExpired={handleSessionExpired}
            initialView={deepLink?.portal === "student" ? deepLink.view : undefined}
          />
        ) : portal === "teacher" ? (
          <TeacherPortal
            schoolUrl={schoolUrl}
            theme={theme}
            onBack={handleClosePortal}
            onSessionExpired={handleSessionExpired}
            initialView={deepLink?.portal === "teacher" ? deepLink.view : undefined}
          />
        ) : portal === "notifications" ? (
          <NotificationsScreen
            schoolUrl={schoolUrl}
            theme={theme}
            onBack={handleClosePortal}
            onSessionExpired={handleSessionExpired}
            onOpenNotification={handleOpenNotification}
            initialTab={deepLink?.portal === "notifications" ? deepLink.tab : undefined}
          />
        ) : portal === "security" ? (
          <SecurityScreen
            schoolUrl={schoolUrl}
            theme={theme}
            onBack={handleClosePortal}
            onSessionExpired={handleSessionExpired}
          />
        ) : (
          <AnnouncementsScreen
            schoolUrl={schoolUrl}
            theme={theme}
            onBack={handleClosePortal}
            onSessionExpired={handleSessionExpired}
          />
        )
      ) : null}
      {stage === "update" ? (
        <UpdateRequiredScreen
          theme={theme}
          maintenance={remoteConfig.maintenance_mode}
          message={remoteConfig.message}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
})
