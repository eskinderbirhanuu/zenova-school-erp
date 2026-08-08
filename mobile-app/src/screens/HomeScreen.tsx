import { Pressable, StyleSheet, Text, View } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useI18n } from "../i18n"
import { colors, gradientColors } from "../theme/colors"

interface HomeScreenProps {
  schoolName: string
  roleName: string | null
  onSignOut: () => void
}

export default function HomeScreen({ schoolName, roleName, onSignOut }: HomeScreenProps) {
  const { t } = useI18n()
  return (
    <LinearGradient colors={[...gradientColors] as [string, string, string, string]} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.signedIn}>{t("signedIn")}</Text>
        <Text style={styles.school} numberOfLines={1}>
          {schoolName}
        </Text>
        {roleName ? <Text style={styles.role}>{roleName}</Text> : null}
        <Text style={styles.note}>ZENOVA mobile v1.0</Text>
        <Pressable onPress={onSignOut} style={({ pressed }) => [styles.button, pressed && styles.buttonDim]}>
          <Text style={styles.buttonText}>{t("signOut")}</Text>
        </Pressable>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    padding: 28,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  signedIn: { fontSize: 13, fontWeight: "700", color: colors.success, letterSpacing: 1 },
  school: { fontSize: 22, fontWeight: "800", color: colors.textPrimary, marginTop: 8 },
  role: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  note: { fontSize: 12, color: colors.textSecondary, marginTop: 16 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 40,
    alignItems: "center",
    marginTop: 20,
  },
  buttonDim: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
})
