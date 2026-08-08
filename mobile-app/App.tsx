import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, StyleSheet, View } from "react-native"
import { StatusBar } from "expo-status-bar"
import { I18nProvider } from "./src/i18n"
import {
  clearStoredSchoolUrl,
  clearStoredSession,
  getStoredSchoolUrl,
  getStoredToken,
  setStoredSchoolUrl,
} from "./src/services/storage"
import SchoolSelectScreen from "./src/screens/SchoolSelectScreen"
import LoginScreen from "./src/screens/LoginScreen"
import HomeScreen from "./src/screens/HomeScreen"
import { colors } from "./src/theme/colors"

type Stage = "booting" | "school" | "login" | "home"

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
  const [roleName, setRoleName] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const [storedUrl, storedToken] = await Promise.all([getStoredSchoolUrl(), getStoredToken()])
      if (storedUrl && storedToken) {
        setSchoolUrl(storedUrl)
        setSchoolName(storedUrl.replace(/^https?:\/\//, ""))
        setStage("home")
      } else if (storedUrl) {
        setSchoolUrl(storedUrl)
        setSchoolName(storedUrl.replace(/^https?:\/\//, ""))
        setStage("login")
      } else {
        setStage("school")
      }
    })()
  }, [])

  const handleSelectSchool = useCallback(async (url: string, name: string) => {
    await setStoredSchoolUrl(url)
    setSchoolUrl(url)
    setSchoolName(name)
    setStage("login")
  }, [])

  const handleSignedIn = useCallback((role: string | null) => {
    setRoleName(role)
    setStage("home")
  }, [])

  const handleChangeSchool = useCallback(async () => {
    await clearStoredSchoolUrl()
    await clearStoredSession()
    setRoleName(null)
    setStage("school")
  }, [])

  const handleSignOut = useCallback(async () => {
    await clearStoredSession()
    setRoleName(null)
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
      {stage === "school" ? <SchoolSelectScreen onSelect={handleSelectSchool} /> : null}
      {stage === "login" ? (
        <LoginScreen
          schoolUrl={schoolUrl}
          schoolName={schoolName}
          onSignedIn={handleSignedIn}
          onChangeSchool={handleChangeSchool}
        />
      ) : null}
      {stage === "home" ? (
        <HomeScreen schoolName={schoolName} roleName={roleName} onSignOut={handleSignOut} />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
})
