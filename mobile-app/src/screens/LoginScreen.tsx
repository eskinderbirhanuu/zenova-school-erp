import { useCallback, useEffect, useState } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { login } from "../services/auth"
import { fetchPartnerFeed } from "../services/partners"
import { PartnerTicker } from "../components/PartnerTicker"
import { useI18n } from "../i18n"
import type { Partner } from "../config/partners"
import { colors, type SchoolTheme } from "../theme/colors"

interface LoginScreenProps {
  schoolUrl: string
  schoolName: string
  theme: SchoolTheme
  onSignedIn: (roleName: string | null) => void
  onMfaRequired: (mfaToken: string, setupRequired: boolean) => void
  onChangeSchool: () => void
}

type Mode = "email" | "employee"

export default function LoginScreen({ schoolUrl, schoolName, theme, onSignedIn, onMfaRequired, onChangeSchool }: LoginScreenProps) {
  const { t, language, setLanguage } = useI18n()
  const [mode, setMode] = useState<Mode>("email")
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [partners, setPartners] = useState<Partner[]>([])

  useEffect(() => {
    fetchPartnerFeed().then(setPartners)
  }, [])

  const handleSubmit = useCallback(async () => {
    setError("")
    setLoading(true)
    try {
      const result = await login(schoolUrl, identifier, password, mode === "employee")
      if (result.mfaRequired) {
        if (result.mfaToken) {
          onMfaRequired(result.mfaToken, result.mfaSetupRequired)
        } else {
          setError(t("invalidCredentials"))
        }
        setLoading(false)
        return
      }
      onSignedIn(result.roleName)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("invalidCredentials"))
    } finally {
      setLoading(false)
    }
  }, [schoolUrl, identifier, password, mode, onSignedIn, onMfaRequired, t])

  return (
    <LinearGradient colors={theme.gradient} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.brand}>ZENOVA</Text>
            <Text style={styles.schoolName} numberOfLines={1}>
              {t("signInTo")} {schoolName}
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.modeRow}>
              <ModeButton
                label={t("email")}
                active={mode === "email"}
                onPress={() => setMode("email")}
              />
              <ModeButton
                label={t("employeeId")}
                active={mode === "employee"}
                onPress={() => setMode("employee")}
              />
            </View>

            <Text style={styles.fieldLabel}>
              {mode === "email" ? t("email") : t("employeeId")}
            </Text>
            <TextInput
              value={identifier}
              onChangeText={setIdentifier}
              placeholder={mode === "email" ? t("emailPlaceholder") : t("employeeIdPlaceholder")}
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={mode === "email" ? "email-address" : "default"}
            />

            <Text style={styles.fieldLabel}>{t("password")}</Text>
            <View>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={t("passwordPlaceholder")}
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPassword}
                style={styles.input}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eye}>
                <Text style={styles.eyeText}>{showPassword ? "🙈" : "👁"}</Text>
              </Pressable>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              onPress={handleSubmit}
              disabled={loading || !identifier || !password}
              style={({ pressed }) => [styles.button, { backgroundColor: theme.primary }, (loading || !identifier || !password || pressed) && styles.buttonDim]}
            >
              <Text style={styles.buttonText}>{loading ? t("signingIn") : t("signIn")}</Text>
            </Pressable>

            <Pressable onPress={onChangeSchool} style={styles.changeSchool}>
              <Text style={styles.changeSchoolText}>{t("changeSchool")}</Text>
            </Pressable>
          </View>

          <View style={styles.languageRow}>
            <Pressable onPress={() => setLanguage(language === "en" ? "am" : "en")}>
              <Text style={styles.languageText}>{t("languageShort")} • {t("language")}</Text>
            </Pressable>
          </View>
        </ScrollView>

        <View style={styles.tickerWrap}>
          <PartnerTicker items={partners} label={t("ourPartners")} />
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

function ModeButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.modeButton, active && styles.modeButtonActive]}
    >
      <Text style={[styles.modeText, active && styles.modeTextActive]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingTop: 40 },
  header: { alignItems: "center", marginBottom: 24 },
  brand: { color: colors.textOnDark, fontSize: 30, fontWeight: "800", letterSpacing: 1 },
  schoolName: { color: "rgba(255,255,255,0.85)", fontSize: 14, marginTop: 8, fontWeight: "600" },
  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  modeRow: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
  },
  modeButton: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: "center" },
  modeButtonActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  modeText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  modeTextActive: { color: colors.textPrimary },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.textPrimary, marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  eye: { position: "absolute", right: 12, top: 13 },
  eyeText: { fontSize: 16 },
  error: { color: colors.error, fontSize: 13, marginBottom: 8 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDim: { opacity: 0.55 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  changeSchool: { alignItems: "center", marginTop: 14 },
  changeSchoolText: { color: colors.textSecondary, fontSize: 13, textDecorationLine: "underline" },
  languageRow: { alignItems: "center", marginTop: 18, marginBottom: 8 },
  languageText: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600" },
  tickerWrap: { paddingHorizontal: 16, paddingBottom: 12 },
})
