import { useCallback, useEffect, useState } from "react"
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import QRCode from "react-native-qrcode-svg"
import PortalScreen, { LoadingState, SectionCard } from "../components/PortalScreen"
import { useI18n } from "../i18n"
import { colors, type SchoolTheme } from "../theme/colors"
import { mfaSetup, mfaVerify, mfaDisable, mfaRegenerateBackupCodes, mfaStatus } from "../services/mfa"
import { SessionExpiredError } from "../services/api"

interface SecurityScreenProps {
  schoolUrl: string
  theme: SchoolTheme
  onBack: () => void
  onSessionExpired: () => void
}

type Phase = "idle" | "setup" | "confirm" | "codes"

export default function SecurityScreen({
  schoolUrl,
  theme,
  onBack,
  onSessionExpired,
}: SecurityScreenProps) {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<{ enabled: boolean } | null>(null)
  const [phase, setPhase] = useState<Phase>("idle")
  const [secret, setSecret] = useState("")
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [busy, setBusy] = useState(false)

  const loadStatus = useCallback(async () => {
    setError("")
    try {
      const s = await mfaStatus(schoolUrl)
      setStatus({ enabled: s.enabled })
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        onSessionExpired()
        return
      }
      setError(t("loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [schoolUrl, onSessionExpired, t])

  useEffect(() => {
    loadStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolUrl])

  const reset = () => {
    setPhase("idle")
    setCode("")
    setPassword("")
    setBackupCodes([])
    setSecret("")
    setQrCodeUrl("")
    setError("")
  }

  const handleEnable = async () => {
    if (busy) return
    setBusy(true)
    setError("")
    try {
      const result = await mfaSetup(schoolUrl)
      setSecret(result.secret)
      setQrCodeUrl(result.qrCodeUrl)
      setPhase("confirm")
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        onSessionExpired()
        return
      }
      setError(err instanceof Error ? err.message : t("loadFailed"))
    } finally {
      setBusy(false)
    }
  }

  const handleVerifyCode = async () => {
    if (code.length !== 6 || busy) return
    setBusy(true)
    setError("")
    try {
      const codes = await mfaVerify(schoolUrl, code)
      setBackupCodes(codes)
      setSuccess(t("mfaEnabledSuccess"))
      setPhase("codes")
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        onSessionExpired()
        return
      }
      setError(t("invalidMfaCode"))
    } finally {
      setBusy(false)
    }
  }

  const handleFinish = () => {
    reset()
    setSuccess("")
    setStatus({ enabled: true })
    loadStatus()
  }

  const handleDisable = async () => {
    if (!password || busy) return
    setBusy(true)
    setError("")
    setSuccess("")
    try {
      await mfaDisable(schoolUrl, password)
      setPassword("")
      setSuccess(t("mfaDisabledSuccess"))
      setStatus({ enabled: false })
      loadStatus()
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        onSessionExpired()
        return
      }
      setError(err instanceof Error ? err.message : t("loadFailed"))
    } finally {
      setBusy(false)
    }
  }

  const handleRegenerate = async () => {
    if (busy) return
    setBusy(true)
    setError("")
    try {
      const codes = await mfaRegenerateBackupCodes(schoolUrl)
      setBackupCodes(codes)
      setSuccess(t("codesRegenerated"))
      setPhase("codes")
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        onSessionExpired()
        return
      }
      setError(err instanceof Error ? err.message : t("loadFailed"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PortalScreen theme={theme} title={t("security")} onBack={onBack}>
      {loading ? <LoadingState /> : null}
      {!loading && status && phase === "idle" ? (
        <>
          {success ? <Text style={styles.success}>{success}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <SectionCard>
            <Text style={styles.cardTitle}>{t("securityTitle")}</Text>
            <Text style={styles.hint}>{t("securityHint")}</Text>
            {status.enabled ? (
              <>
                <Text style={styles.statusEnabled}>{t("mfaEnabled")}</Text>
                <Pressable
                  onPress={handleRegenerate}
                  disabled={busy}
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.dim]}
                >
                  <Text style={styles.secondaryText}>{t("regenerateCodes")}</Text>
                </Pressable>
                <Text style={styles.disableHint}>{t("disableMfaHint")}</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t("passwordPlaceholder")}
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                  secureTextEntry
                  autoCapitalize="none"
                />
                <Pressable
                  onPress={handleDisable}
                  disabled={busy || !password}
                  style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: colors.error },
                    (busy || !password || pressed) && styles.buttonDim,
                  ]}
                >
                  <Text style={styles.buttonText}>{busy ? t("verifying") : t("disableMfa")}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.statusDisabled}>{t("mfaDisabled")}</Text>
                <Pressable
                  onPress={handleEnable}
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: theme.primary },
                    (busy || pressed) && styles.buttonDim,
                  ]}
                >
                  <Text style={styles.buttonText}>{busy ? t("verifying") : t("enableMfa")}</Text>
                </Pressable>
              </>
            )}
          </SectionCard>
        </>
      ) : null}
      {!loading && phase === "confirm" ? (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <SectionCard>
            <Text style={styles.cardTitle}>{t("mfaSetupTitle")}</Text>
            <Text style={styles.hint}>{t("mfaSetupHint")}</Text>
            <View style={styles.qrWrap}>
              {qrCodeUrl ? <QRCode value={qrCodeUrl} size={176} backgroundColor="#fff" /> : null}
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
              onPress={handleVerifyCode}
              disabled={busy || code.length !== 6}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.primary },
                (busy || code.length !== 6 || pressed) && styles.buttonDim,
              ]}
            >
              <Text style={styles.buttonText}>{busy ? t("verifying") : t("mfaFinishSetup")}</Text>
            </Pressable>
            <Pressable onPress={reset} style={styles.back}>
              <Text style={styles.backText}>{t("back")}</Text>
            </Pressable>
          </SectionCard>
        </KeyboardAvoidingView>
      ) : null}
      {!loading && phase === "codes" ? (
        <SectionCard>
          <Text style={styles.cardTitle}>{t("mfaBackupCodesTitle")}</Text>
          <Text style={styles.hint}>{t("mfaBackupCodesHint")}</Text>
          <View style={styles.codesGrid}>
            {backupCodes.map((c) => (
              <Text key={c} selectable style={styles.backupCode}>
                {c}
              </Text>
            ))}
          </View>
          <Pressable
            onPress={handleFinish}
            disabled={busy}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.primary },
              (busy || pressed) && styles.buttonDim,
            ]}
          >
            <Text style={styles.buttonText}>{t("mfaDone")}</Text>
          </Pressable>
        </SectionCard>
      ) : null}
    </PortalScreen>
  )
}

const styles = StyleSheet.create({
  cardTitle: { fontSize: 15, fontWeight: "800", color: colors.textPrimary, marginBottom: 6 },
  hint: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  statusEnabled: {
    fontSize: 13,
    fontWeight: "700",
    color: "#16a34a",
    marginTop: 10,
    marginBottom: 4,
  },
  statusDisabled: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, marginTop: 10, marginBottom: 4 },
  disableHint: { fontSize: 12, color: colors.textSecondary, marginTop: 12 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    marginTop: 8,
  },
  codeInput: { fontSize: 22, letterSpacing: 8, textAlign: "center", fontWeight: "700" },
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
  codesGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginBottom: 6, marginTop: 12 },
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
  button: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  buttonDim: { opacity: 0.55 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondaryButton: { marginTop: 12, alignItems: "center" },
  secondaryText: { color: colors.textPrimary, fontSize: 14, fontWeight: "700", textDecorationLine: "underline" },
  error: { color: colors.error, fontSize: 13, marginTop: 10 },
  success: { color: "#16a34a", fontSize: 13, marginTop: 10, fontWeight: "600" },
  back: { alignItems: "center", marginTop: 14 },
  backText: { color: colors.textSecondary, fontSize: 13, textDecorationLine: "underline" },
  dim: { opacity: 0.7 },
})
