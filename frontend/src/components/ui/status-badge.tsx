import { cn } from "@/lib/utils"
import {
  CheckCircle2, XCircle, AlertTriangle, Info, MinusCircle,
  Clock, PauseCircle, ShieldCheck, Sparkles, type LucideIcon
} from "lucide-react"

interface StatusBadgeProps {
  status: string
  variant?: "default" | "success" | "warning" | "destructive" | "info" | "purple"
  className?: string
  showIcon?: boolean
  size?: "sm" | "md"
}

const variantStyles: Record<string, string> = {
  default: "bg-muted text-muted-foreground border-muted",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
  warning: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  destructive: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  info: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  purple: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
}

const autoMap: Record<string, "success" | "destructive" | "warning" | "info" | "default" | "purple"> = {
  active: "success", operational: "success", completed: "success", paid: "success", graded: "success",
  inactive: "default", down: "destructive", error: "destructive", critical: "destructive",
  pending: "warning", overdue: "warning", low_stock: "warning",
  suspended: "destructive", expired: "destructive",
  info: "info", submitted: "info",
  new: "purple",
}

const iconMap: Record<string, LucideIcon> = {
  success: CheckCircle2,
  destructive: XCircle,
  warning: AlertTriangle,
  info: Info,
  default: MinusCircle,
  purple: Sparkles,
}

const statusIconOverride: Record<string, LucideIcon> = {
  active: ShieldCheck,
  suspended: PauseCircle,
  pending: Clock,
  overdue: AlertTriangle,
  expired: XCircle,
  paid: CheckCircle2,
}

export function StatusBadge({ status, variant, className, showIcon = true, size = "sm" }: StatusBadgeProps) {
  const resolvedVariant = variant || autoMap[status?.toLowerCase()] || "default"
  const Icon = statusIconOverride[status?.toLowerCase()] || iconMap[resolvedVariant]
  const statusLabel = status || "Unknown"

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium gap-1",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        variantStyles[resolvedVariant],
        className
      )}
      role="status"
      aria-label={`${statusLabel}: ${resolvedVariant}`}
    >
      {showIcon && <Icon className={cn("shrink-0", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} aria-hidden />}
      {statusLabel}
      <span className="sr-only">({resolvedVariant})</span>
    </span>
  )
}

type StatusVariant = "active" | "inactive" | "pending" | "suspended" | "expired" | "operational" | "degraded" | "down"

const statusMap: Record<StatusVariant, { label: string; variant: "success" | "destructive" | "warning" | "info" | "default" | "purple" }> = {
  active: { label: "Active", variant: "success" },
  inactive: { label: "Inactive", variant: "default" },
  pending: { label: "Pending", variant: "warning" },
  suspended: { label: "Suspended", variant: "destructive" },
  expired: { label: "Expired", variant: "destructive" },
  operational: { label: "Operational", variant: "success" },
  degraded: { label: "Degraded", variant: "warning" },
  down: { label: "Down", variant: "destructive" },
}

export function MappedStatusBadge({ status, className }: { status: StatusVariant; className?: string }) {
  const mapped = statusMap[status] || { label: status, variant: "default" as const }
  return <StatusBadge status={mapped.label} variant={mapped.variant} className={className} />
}
