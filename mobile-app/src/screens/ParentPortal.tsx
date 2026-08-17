import { useCallback, useState } from "react"
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import PortalScreen, { LoadingState, ErrorState, FreshnessBadge, SectionCard } from "../components/PortalScreen"
import { useCachedResource } from "../hooks/useCachedResource"
import {
  fetchParentDashboard,
  fetchParentPaymentDashboard,
  fetchReceipts,
  makeParentPayment,
  type ParentChild,
  type ParentPaymentDashboard,
  type Receipt,
} from "../services/parent"
import { useI18n } from "../i18n"
import { colors, type SchoolTheme } from "../theme/colors"
import { SessionExpiredError } from "../services/api"

interface ParentPortalProps {
  schoolUrl: string
  schoolName: string
  theme: SchoolTheme
  onBack: () => void
  onSessionExpired: () => void
  initialView?: PortalView
}

type PortalView = "dashboard" | "invoices" | "receipts" | "pay"

const DASHBOARD_CACHE = "zenova.cache.parent.dashboard"
const PAYMENTS_CACHE = "zenova.cache.parent.payments"
const RECEIPTS_CACHE = "zenova.cache.parent.receipts"

export default function ParentPortal({ schoolUrl, schoolName, theme, onBack, onSessionExpired, initialView }: ParentPortalProps) {
  const [view, setView] = useState<PortalView>(initialView ?? "dashboard")

  return (
    <ParentView
      schoolUrl={schoolUrl}
      schoolName={schoolName}
      theme={theme}
      view={view}
      setView={setView}
      onBack={onBack}
      onSessionExpired={onSessionExpired}
    />
  )
}

function ParentView({
  schoolUrl,
  schoolName,
  theme,
  view,
  setView,
  onBack,
  onSessionExpired,
}: {
  schoolUrl: string
  schoolName: string
  theme: SchoolTheme
  view: PortalView
  setView: (v: PortalView) => void
  onBack: () => void
  onSessionExpired: () => void
}) {
  const { t } = useI18n()

  const dash = useCachedResource(
    useCallback(() => fetchParentDashboard(schoolUrl), [schoolUrl]),
    DASHBOARD_CACHE,
  )
  const payments = useCachedResource(
    useCallback(() => fetchParentPaymentDashboard(schoolUrl), [schoolUrl]),
    PAYMENTS_CACHE,
  )
  const receipts = useCachedResource(
    useCallback(() => fetchReceipts(schoolUrl), [schoolUrl]),
    RECEIPTS_CACHE,
  )

  if (dash.sessionExpired || payments.sessionExpired || receipts.sessionExpired) {
    onSessionExpired()
  }

  if (view === "dashboard") {
    return (
      <PortalScreen theme={theme} title={t("menuMyChildren")} subtitle={schoolName} onBack={onBack}>
        <View style={styles.tabs}>
          <Tab active label={t("menuMyChildren")} onPress={() => setView("dashboard")} />
          <Tab label={t("invoices")} onPress={() => setView("invoices")} />
          <Tab label={t("receipts")} onPress={() => setView("receipts")} />
        </View>
        {dash.loading && !dash.data ? <LoadingState /> : null}
        {dash.error && !dash.data ? <ErrorState message={dash.error} onRetry={dash.reload} /> : null}
        {dash.data ? (
          <>
            <FreshnessBadge freshness={dash.freshness} />
            {dash.data.children.length === 0 ? (
              <SectionCard>
                <Text style={styles.empty}>{t("noChildren")}</Text>
              </SectionCard>
            ) : (
              dash.data.children.map((child) => (
                <ChildCard
                  key={child.id}
                  child={child}
                  outstanding={payments.data?.children.find((c) => c.id === child.id)?.outstanding_balance ?? null}
                  onPay={() => setView("pay")}
                />
              ))
            )}
          </>
        ) : null}
      </PortalScreen>
    )
  }

  if (view === "invoices") {
    return (
      <PortalScreen theme={theme} title={t("invoices")} subtitle={schoolName} onBack={() => setView("dashboard")}>
        <View style={styles.tabs}>
          <Tab label={t("menuMyChildren")} onPress={() => setView("dashboard")} />
          <Tab active label={t("invoices")} onPress={() => setView("invoices")} />
          <Tab label={t("receipts")} onPress={() => setView("receipts")} />
        </View>
        <InvoicesView
          payments={payments.data}
          loading={payments.loading}
          error={payments.error}
          onRetry={payments.reload}
          freshness={payments.freshness}
          onPay={() => setView("pay")}
        />
      </PortalScreen>
    )
  }

  if (view === "pay") {
    return (
      <PortalScreen theme={theme} title={t("payNow")} subtitle={schoolName} onBack={() => setView("invoices")}>
        <PayFlow
          schoolUrl={schoolUrl}
          theme={theme}
          onDone={() => {
            payments.reload()
            receipts.reload()
            setView("invoices")
          }}
        />
      </PortalScreen>
    )
  }

  return (
    <PortalScreen theme={theme} title={t("receipts")} subtitle={schoolName} onBack={() => setView("dashboard")}>
      <View style={styles.tabs}>
        <Tab label={t("menuMyChildren")} onPress={() => setView("dashboard")} />
        <Tab label={t("invoices")} onPress={() => setView("invoices")} />
        <Tab active label={t("receipts")} onPress={() => setView("receipts")} />
      </View>
      <ReceiptsView
        receipts={receipts.data}
        loading={receipts.loading}
        error={receipts.error}
        onRetry={receipts.reload}
        freshness={receipts.freshness}
      />
    </PortalScreen>
  )
}

function Tab({ active, label, onPress }: { active?: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  )
}

function ChildCard({
  child,
  outstanding,
  onPay,
}: {
  child: ParentChild
  outstanding: number | null
  onPay: () => void
}) {
  const { t } = useI18n()
  return (
    <SectionCard>
      <Text style={styles.childName}>{child.full_name}</Text>
      <Text style={styles.childMeta}>
        {child.class_name} • {child.relationship}
      </Text>
      <View style={styles.statRow}>
        <Stat label={t("attendance")} value={`${child.attendance_pct}%`} />
        <Stat label={t("gradesCount")} value={`${child.grades.length}`} />
        <Stat
          label={t("outstanding")}
          value={outstanding != null ? formatMoney(outstanding) : "—"}
        />
      </View>
      {child.fees.length > 0 ? (
        <View style={styles.feesList}>
          {child.fees.slice(0, 3).map((fee, i) => (
            <View key={i} style={styles.feeRow}>
              <Text style={styles.feeLabel} numberOfLines={1}>
                {fee.label}
              </Text>
              <Text style={styles.feeAmount}>{formatMoney(Number(fee.amount))}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>{t("noFees")}</Text>
      )}
      <Pressable onPress={onPay} style={({ pressed }) => [styles.payButton, pressed && styles.dim]}>
        <Text style={styles.payButtonText}>{t("payNow")}</Text>
      </Pressable>
    </SectionCard>
  )
}

function InvoicesView({
  payments,
  loading,
  error,
  onRetry,
  freshness,
  onPay,
}: {
  payments: ParentPaymentDashboard | null
  loading: boolean
  error: string
  onRetry: () => void
  freshness: number | null
  onPay: () => void
}) {
  const { t } = useI18n()
  if (loading && !payments) return <LoadingState />
  if (error && !payments) return <ErrorState message={error} onRetry={onRetry} />
  if (!payments) return null
  return (
    <>
      <FreshnessBadge freshness={freshness} />
      <View style={styles.summaryRow}>
        <SummaryBox label={t("totalOutstanding")} value={formatMoney(payments.total_outstanding)} />
        <SummaryBox label={t("totalPaid")} value={formatMoney(payments.total_paid)} />
      </View>
      {payments.recent_invoices.length === 0 ? (
        <SectionCard>
          <Text style={styles.empty}>{t("noInvoices")}</Text>
        </SectionCard>
      ) : (
        payments.recent_invoices.map((inv) => (
          <SectionCard key={inv.id} title={inv.invoice_number}>
            <Text style={styles.childMeta}>{inv.student_name}</Text>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>{t("balance")}</Text>
              <Text style={styles.feeAmount}>{formatMoney(inv.balance)}</Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>{t("status")}</Text>
              <Text style={styles.statusText}>{inv.status}</Text>
            </View>
            <Pressable onPress={onPay} style={({ pressed }) => [styles.payButton, pressed && styles.dim]}>
              <Text style={styles.payButtonText}>{t("payNow")}</Text>
            </Pressable>
          </SectionCard>
        ))
      )}
    </>
  )
}

function ReceiptsView({
  receipts,
  loading,
  error,
  onRetry,
  freshness,
}: {
  receipts: Receipt[] | null
  loading: boolean
  error: string
  onRetry: () => void
  freshness: number | null
}) {
  const { t } = useI18n()
  if (loading && !receipts) return <LoadingState />
  if (error && !receipts) return <ErrorState message={error} onRetry={onRetry} />
  if (!receipts) return null
  return (
    <>
      <FreshnessBadge freshness={freshness} />
      {receipts.length === 0 ? (
        <SectionCard>
          <Text style={styles.empty}>{t("noReceipts")}</Text>
        </SectionCard>
      ) : (
        receipts.map((r) => (
          <SectionCard key={r.id}>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>{r.receipt_number}</Text>
              <Text style={styles.feeAmount}>{formatMoney(r.amount_paid)}</Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>{t("method")}</Text>
              <Text style={styles.childMeta}>{r.payment_method}</Text>
            </View>
            <Text style={styles.childMeta}>{r.payment_date?.slice(0, 10)}</Text>
          </SectionCard>
        ))
      )}
    </>
  )
}

export function PayFlow({ schoolUrl, theme, onDone }: { schoolUrl: string; theme: SchoolTheme; onDone: () => void }) {
  const { t } = useI18n()
  const [amount, setAmount] = useState("")
  const [invoiceId, setInvoiceId] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const pay = useCallback(async () => {
    if (busy || !amount || !invoiceId) return
    setBusy(true)
    setError("")
    setMessage("")
    try {
      await makeParentPayment(schoolUrl, invoiceId, Number(amount))
      setMessage(t("paymentSuccess"))
      setAmount("")
      setInvoiceId("")
      setTimeout(onDone, 1500)
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        setError(t("sessionExpired"))
      } else {
        setError(err instanceof Error ? err.message : t("paymentFailed"))
      }
    } finally {
      setBusy(false)
    }
  }, [busy, amount, invoiceId, schoolUrl, onDone, t])

  return (
    <SectionCard title={t("payNow")}>
      <TextInputField label={t("invoiceId")} value={invoiceId} onChangeText={setInvoiceId} />
      <TextInputField label={t("amount")} value={amount} onChangeText={setAmount} keyboardType="numeric" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}
      <Pressable
        onPress={pay}
        disabled={busy || !amount || !invoiceId}
        style={({ pressed }) => [styles.payButton, { backgroundColor: theme.primary }, (busy || !amount || !invoiceId || pressed) && styles.dim]}
      >
        <Text style={styles.payButtonText}>{busy ? t("paying") : t("payNow")}</Text>
      </Pressable>
    </SectionCard>
  )
}

function TextInputField({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string
  value: string
  onChangeText: (v: string) => void
  keyboardType?: "numeric"
}) {
  return (
    <View style={styles.inputRow}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInputStyled value={value} onChangeText={onChangeText} keyboardType={keyboardType} />
    </View>
  )
}

function TextInputStyled({
  value,
  onChangeText,
  keyboardType,
}: {
  value: string
  onChangeText: (v: string) => void
  keyboardType?: "numeric"
}) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType ?? "default"}
      placeholderTextColor={colors.textSecondary}
      autoCapitalize="none"
      autoCorrect={false}
    />
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryBox}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  )
}

function formatMoney(n: number): string {
  return `${n.toLocaleString()} ETB`
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: "center" },
  tabActive: { backgroundColor: "rgba(255,255,255,0.92)" },
  tabText: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.9)" },
  tabTextActive: { color: colors.textPrimary },
  childName: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
  childMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  statRow: { flexDirection: "row", marginTop: 10, gap: 8 },
  stat: { flex: 1, backgroundColor: "#F3F4F6", borderRadius: 10, padding: 8, alignItems: "center" },
  statValue: { fontSize: 15, fontWeight: "800", color: colors.textPrimary },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  feesList: { marginTop: 10, gap: 6 },
  feeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 2 },
  feeLabel: { fontSize: 13, color: colors.textPrimary, flex: 1 },
  feeAmount: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  empty: { fontSize: 13, color: colors.textSecondary, paddingVertical: 6 },
  payButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    marginTop: 12,
  },
  payButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  dim: { opacity: 0.6 },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  summaryBox: { flex: 1, backgroundColor: "rgba(255,255,255,0.96)", borderRadius: 14, padding: 14 },
  summaryValue: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
  summaryLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  statusText: { fontSize: 13, fontWeight: "700", color: colors.warning, textTransform: "capitalize" },
  inputRow: { marginBottom: 10 },
  inputLabel: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 4 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.textPrimary,
  },
  error: { color: colors.error, fontSize: 13, marginTop: 6 },
  success: { color: colors.success, fontSize: 13, marginTop: 6, fontWeight: "700" },
})
