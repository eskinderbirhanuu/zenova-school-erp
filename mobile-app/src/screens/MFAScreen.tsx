import { useState } from "react"
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import QRCode from "react-native-qrcode-svg"
import { mfaLogin, mfaBootstrapSetup, mfaBootstrapVerify } from "../services/auth"
import { useI18n } from "../i18n"
import { colors, type SchoolTheme } from "../theme/colors"

interface MFAScreenProps {
  schoolUrl: string
  schoolName: string
  mfaToken: string
  setupRequired: boolean
  theme: SchoolTheme
  onVerified: (roleName: string | null) => void
  onBack: () => void
}

type Phase = "setup" | "confirm" | "codes"

export default function MFAScreen({
  schoolUrl,
  schoolName,
  mfaToken,
  setupRequired,
  theme,
  onVerified,
  onBack,
}: MFAScreenProps) {
  const { t } = useI18n()
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [phase, setPhase] = useState<Phase>("setup")
  const [secret, setSecret] = useState("")
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])

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

  const handleBeginSetup = async () => {
    if (loading || secret) return
    setError("")
    setLoading(true)
    try {
      const result = await mfaBootstrapSetup(schoolUrl, mfaToken)
      setSecret(result.secret)
      setQrCodeUrl(result.qrCodeUrl)
      setPhase("confirm")
    } catch (err) {
      setError(err instanceof Error ? err.message : t("mfaSetupHint"))
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmSetup = async () => {
    if (code.length !== 6 || loading) return
    setError("")
    setLoading(true)
    try {
      const codes = await mfaBootstrapVerify(schoolUrl, mfaToken, code)
      setBackupCodes(codes)
      setPhase("codes")
    } catch {
      setError(t("invalidMfaCode"))
    } finally {
      setLoading(false)
    }
  }

  const handleFinishSetup = async () => {
    if (loading) return
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
            {!setupRequired ? (
              <>
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
              </>
            ) : phase === "setup" ? (
              <>
                <Text style={styles.heading}>{t("mfaSetupTitle")}</Text>
                <Text style={styles.hint}>{t("mfaSetupHint")}</Text>
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Pressable
                  onPress={handleBeginSetup}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: theme.primary },
                    (loading || pressed) && styles.buttonDim,
                  ]}
                >
                  <Text style={styles.buttonText}>{loading ? t("verifying") : t("mfaScanCode")}</Text>
                </Pressable>
              </>
            ) : phase === "confirm" ? (
              <>
                <Text style={styles.heading}>{t("mfaSetupTitle")}</Text>
                <Text style={styles.hint}>{t("mfaSetupHint")}</Text>
                <View style={styles.qrWrap}>
                  {qrCodeUrl ? (
                    <QRCode value={qrCodeUrl} size={176} backgroundColor="#fff" />
                  ) : null}
                </View>
                <Text style={styles.orText}>{t("mfaOrEnterSecret")}</Text>
                <Text selectable style={styles.secret}>
                  {secret}
                </Text>
                <TextInput
                  value={code}
                  onChangeText={(v) => setCode(v.replace(/[^0-9]/g, "").slice(0, 6))}
                  placeholder={t("mfaCodePlaceholder")}
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, styles.codeInput]}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Pressable
                  onPress={handleConfirmSetup}
                  disabled={loading || code.length !== 6}
                  style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: theme.primary },
                    (loading || code.length !== 6 || pressed) && styles.buttonDim,
                  ]}
                >
                  <Text style={styles.buttonText}>{loading ? t("verifying") : t("mfaFinishSetup")}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.heading}>{t("mfaBackupCodesTitle")}</Text>
                <Text style={styles.hint}>{t("mfaBackupCodesHint")}</Text>
                <View style={styles.codesGrid}>
                  {backupCodes.map((c) => (
                    <Text key={c} selectable style={styles.backupCode}>
                      {c}
                    </Text>
                  ))}
                </View>
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Pressable
                  onPress={handleFinishSetup}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: theme.primary },
                    (loading || pressed) && styles.buttonDim,
                  ]}
                >
                  <Text style={styles.buttonText}>{loading ? t("verifying") : t("mfaDone")}</Text>
                </Pressable>
              </>
            )}
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
  qrWrap: { alignItems: "center", marginVertical: 12 },
  orText: { fontSize: 12, color: colors.textSecondary, textAlign: "center", marginTop: 4 },
  secret: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 6,
    marginBottom: 14,
    letterSpacing: 1,
  },
  codesGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginBottom: 6 },
  backupCode: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
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
