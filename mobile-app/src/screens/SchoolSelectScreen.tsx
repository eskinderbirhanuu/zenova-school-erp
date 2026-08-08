import { useEffect, useRef, useState } from "react"
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { searchSchools } from "../services/schools"
import type { School } from "../services/schools"
import { useI18n } from "../i18n"
import { colors, gradientColors } from "../theme/colors"

interface SchoolSelectScreenProps {
  onSelect: (schoolUrl: string, schoolName: string) => void
}

export default function SchoolSelectScreen({ onSelect }: SchoolSelectScreenProps) {
  const { t } = useI18n()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<School[]>([])
  const [manual, setManual] = useState("")
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      const schools = await searchSchools(query.trim())
      setResults(schools)
      setLoading(false)
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const normalizedManual = manual.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "").toLowerCase()
  const manualReady = normalizedManual.includes(".")

  const handleManual = () => {
    if (!manualReady) return
    onSelect(`https://${normalizedManual}`, normalizedManual)
  }

  return (
    <LinearGradient colors={[...gradientColors] as [string, string, string, string]} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <Text style={styles.title}>ZENOVA</Text>
          <Text style={styles.subtitle}>{t("tagline")}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>{t("findSchool")}</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("searchPlaceholder")}
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            autoCorrect={false}
            autoCapitalize="words"
          />

          {loading ? (
            <Text style={styles.hint}>...</Text>
          ) : results.length > 0 ? (
            <FlatList
              data={results}
              keyExtractor={(item) => item.domain}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              renderItem={({ item }) => (
                <Pressable style={styles.result} onPress={() => onSelect(`https://${item.domain}`, item.name)}>
                  <Text style={styles.resultText}>{item.name}</Text>
                  <Text style={styles.resultDomain}>{item.domain}</Text>
                </Pressable>
              )}
            />
          ) : query.trim() && !loading ? (
            <Text style={styles.hint}>{t("noSchoolsFound")}</Text>
          ) : null}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t("orEnterManually")}</Text>
            <View style={styles.dividerLine} />
          </View>

          <TextInput
            value={manual}
            onChangeText={setManual}
            placeholder={t("manualPlaceholder")}
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            autoCorrect={false}
            autoCapitalize="none"
            keyboardType="url"
          />
          <Pressable
            onPress={handleManual}
            disabled={!manualReady}
            style={({ pressed }) => [
              styles.button,
              (!manualReady || pressed) && styles.buttonDim,
            ]}
          >
            <Text style={styles.buttonText}>{t("continue")}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1, justifyContent: "center", padding: 24 },
  header: { alignItems: "center", marginBottom: 28 },
  title: { color: colors.textOnDark, fontSize: 34, fontWeight: "800", letterSpacing: 1 },
  subtitle: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 6, letterSpacing: 2 },
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
  heading: { fontSize: 16, fontWeight: "700", color: colors.textPrimary, marginBottom: 12 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 10,
  },
  list: { maxHeight: 220, marginBottom: 4 },
  result: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  resultText: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  resultDomain: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  hint: { color: colors.textSecondary, fontSize: 13, marginBottom: 10, paddingVertical: 6 },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 14 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  dividerText: { marginHorizontal: 10, fontSize: 12, color: colors.textSecondary },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDim: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
})
