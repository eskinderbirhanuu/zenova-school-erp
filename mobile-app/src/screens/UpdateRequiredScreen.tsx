import { StyleSheet, Text, View } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useI18n } from "../i18n"
import { colors, type SchoolTheme } from "../theme/colors"
import { APP_VERSION } from "../config/app"

interface UpdateRequiredScreenProps {
  theme: SchoolTheme
  maintenance: boolean
  message: string
}

export default function UpdateRequiredScreen({ theme, maintenance, message }: UpdateRequiredScreenProps) {
  const { t } = useI18n()
  return (
    <LinearGradient colors={theme.gradient} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>
          {maintenance ? t("maintenanceMode") : t("updateRequiredTitle")}
        </Text>
        <Text style={styles.body}>
          {maintenance ? message || t("maintenanceMode") : t("updateRequired")}
        </Text>
        <Text style={styles.version}>
          {t("appVersion")}: {APP_VERSION}
        </Text>
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
  title: { fontSize: 20, fontWeight: "800", color: colors.textPrimary, textAlign: "center" },
  body: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginTop: 12, lineHeight: 21 },
  version: { fontSize: 12, color: colors.textSecondary, marginTop: 20 },
})
