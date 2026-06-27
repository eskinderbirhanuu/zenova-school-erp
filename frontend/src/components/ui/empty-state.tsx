"use client"

import { Loader2, Inbox, AlertCircle } from "lucide-react"
import { Button } from "./button"
import { motion } from "framer-motion"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  variant?: "empty" | "loading" | "error"
}

export function EmptyState({ icon, title, description, action, variant = "empty" }: EmptyStateProps) {
  const icons = {
    empty: <Inbox className="h-10 w-10" />,
    loading: <Loader2 className="h-10 w-10 animate-spin" />,
    error: <AlertCircle className="h-10 w-10" />,
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-border/60 bg-muted/10 backdrop-blur-sm"
    >
      <div className="mb-4 text-muted-foreground/60">
        {icon ?? icons[variant]}
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && (
        <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </motion.div>
  )
}