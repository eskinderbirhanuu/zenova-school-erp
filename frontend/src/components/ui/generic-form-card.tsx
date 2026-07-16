"use client"

import type { ReactNode } from "react"

import { Button } from "./button"
import { Loader2, ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

interface GenericFormCardProps {
  title: string
  description?: string
  backHref?: string
  onSubmit?: () => void
  loading?: boolean
  saveLabel?: string
  children: ReactNode
}

export function GenericFormCard({ title, description, backHref, onSubmit, loading, saveLabel = "Save", children }: GenericFormCardProps) {
  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl border border-border/40 bg-gradient-to-br from-background via-background to-primary/5 p-5 shadow-sm overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--primary)/3%,transparent_60%)] pointer-events-none" />
        <div className="relative flex items-center gap-4">
          {backHref && (
            <Link href={backHref}>
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10 hover:text-primary transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="relative rounded-2xl border border-border/40 bg-card/70 backdrop-blur-xl shadow-sm overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-primary/[0.01]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="relative p-6">
          <div className="space-y-5">{children}</div>
        </div>
      </motion.div>

      {onSubmit && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-end gap-3"
        >
          {backHref && <Link href={backHref}><Button type="button" variant="outline" className="rounded-xl h-11 px-6">Cancel</Button></Link>}
          <Button onClick={onSubmit} disabled={loading} className="rounded-xl h-11 px-6 shadow-lg shadow-primary/20">
            {loading ? (
              <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving...</span>
            ) : <><Save className="mr-2 h-4 w-4" />{saveLabel}</>}
          </Button>
        </motion.div>
      )}
    </div>
  )
}