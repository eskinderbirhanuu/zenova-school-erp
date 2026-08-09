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
import SchoolSelectScreen from "./src/screens/SchoolSelectScreen"
import LoginScreen from "./src/screens/LoginScreen"
import MFAScreen from "./src/screens/MFAScreen"
import HomeScreen from "./src/screens/HomeScreen"
import UpdateRequiredScreen from "./src/screens/UpdateRequiredScreen"
import { colors } from "./src/theme/colors"

type Stage = "booting" | "school" | "login" | "mfa" | "home" | "update"

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
  const [schoolUrl, setSchoolUrl] = useState("")
  const [schoolName, setSchoolName] = useState("")
  const [theme, setTheme] = useState<SchoolTheme>(defaultTheme())
  const [roleName, setRoleName] = useState<string | null>(null)
  const [mfaToken, setMfaToken] = useState<string | null>(null)
  const [mfaSetupRequired, setMfaSetupRequired] = useState(false)
  const [remoteConfig, setRemoteConfig] = useState<RemoteConfig>(DEFAULT_CONFIG)

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
        setStage("home")
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
    const url = school.api_url.replace(/\/+$/, "")
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
  }, [])

  const handleMfaRequired = useCallback((token: string, setupRequired: boolean) => {
    setMfaToken(token)
    setMfaSetupRequired(setupRequired)
    setStage("mfa")
  }, [])

  const handleChangeSchool = useCallback(async () => {
    await clearStoredSchoolUrl()
    await clearStoredSession()
    await setStoredSchoolBranding(null)
    setRoleName(null)
    setMfaToken(null)
    setMfaSetupRequired(false)
    setTheme(defaultTheme())
    setStage("school")
  }, [])

  const handleSignOut = useCallback(async () => {
    await clearStoredSession()
    setRoleName(null)
    setMfaToken(null)
    setMfaSetupRequired(false)
    setStage("login")
  }, [])

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
        />
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
