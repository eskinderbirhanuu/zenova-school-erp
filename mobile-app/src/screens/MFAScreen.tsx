import { useState } from "react"
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { mfaLogin } from "../services/auth"
import { useI18n } from "../i18n"
import { colors, type SchoolTheme } from "../theme/colors"

interface MFAScreenProps {
  schoolUrl: string
  schoolName: string
  mfaToken: string
  theme: SchoolTheme
  onVerified: (roleName: string | null) => void
  onBack: () => void
}

export default function MFAScreen({ schoolUrl, schoolName, mfaToken, theme, onVerified, onBack }: MFAScreenProps) {
  const { t } = useI18n()
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleVerify = async () => {
    if (code.length !== 6 || loading) return
    setError("")
    setLoading(true)
    try {
      const result = await mfaLogin(schoolUrl, mfaToken, code)
      onVerified(result.roleName)
    } catch {
      setError(t("invalidMfaCode"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <LinearGradient colors={theme.gradient} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.brand}>ZENOVA</Text>
            <Text style={styles.schoolName} numberOfLines={1}>
              {schoolName}
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.heading}>{t("mfaCode")}</Text>
            <Text style={styles.hint}>{t("mfaHint")}</Text>
            <TextInput
              value={code}
              onChangeText={(v) => setCode(v.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder={t("mfaCodePlaceholder")}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, styles.codeInput]}
              keyboardType="number-pad"
              autoFocus
              maxLength={6}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              onPress={handleVerify}
              disabled={loading || code.length !== 6}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.primary },
                (loading || code.length !== 6 || pressed) && styles.buttonDim,
              ]}
            >
              <Text style={styles.buttonText}>{loading ? t("verifying") : t("verify")}</Text>
            </Pressable>
            <Pressable onPress={onBack} style={styles.back}>
              <Text style={styles.backText}>{t("backToLogin")}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
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
  heading: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  hint: { fontSize: 13, color: colors.textSecondary, marginTop: 6, marginBottom: 14 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  codeInput: { fontSize: 22, letterSpacing: 8, textAlign: "center", fontWeight: "700" },
  error: { color: colors.error, fontSize: 13, marginTop: 10 },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  buttonDim: { opacity: 0.55 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  back: { alignItems: "center", marginTop: 14 },
  backText: { color: colors.textSecondary, fontSize: 13, textDecorationLine: "underline" },
})
