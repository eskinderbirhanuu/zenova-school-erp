"use client"

import type { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Button } from "./button"
import { EmptyState } from "./empty-state"
import { ArrowLeft, Edit } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

interface FieldProps {
  label: string
  value: ReactNode
}

function Field({ label, value }: FieldProps) {
  return (
    <div className="group">
      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground group-hover:text-foreground/60 transition-colors">{label}</label>
      <div className="mt-1 text-sm font-medium">{value || <span className="text-muted-foreground/40">—</span>}</div>
    </div>
  )
}

interface GenericDetailCardProps {
  title: string
  backHref?: string
  editHref?: string
  loading?: boolean
  error?: string
  fields: FieldProps[]
  sections?: { title: string; fields: FieldProps[] }[]
}

export function GenericDetailCard({ title, backHref, editHref, loading, error, fields, sections }: GenericDetailCardProps) {
  if (loading) return <EmptyState variant="loading" title="Loading..." />
  if (error) return <EmptyState variant="error" title="Error" description={error} />

  const DetailCard = ({ title, children }: { title?: string, children: ReactNode }) => (
    <div className="relative rounded-2xl border border-border/40 bg-card/70 backdrop-blur-xl shadow-sm overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-primary/[0.01]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      {title && (
        <div className="relative px-6 py-4 border-b border-border/30">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</CardTitle>
        </div>
      )}
      <div className="relative p-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{children}</div>
      </div>
    </div>
  )

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl border border-border/40 bg-gradient-to-br from-background via-background to-primary/5 p-5 shadow-sm overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--primary)/3%,transparent_60%)]" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            {backHref && (
              <Link href={backHref}>
                <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10 hover:text-primary transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          </div>
          {editHref && (
            <Link href={editHref}>
              <Button variant="outline" size="sm" className="rounded-xl">
                <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
              </Button>
            </Link>
          )}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <DetailCard>{fields.map((f) => <Field key={f.label} label={f.label} value={f.value} />)}</DetailCard>
      </motion.div>

      {sections?.map((section, i) => (
        <motion.div key={section.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (i + 1) * 0.05 }}>
          <DetailCard title={section.title}>
            {section.fields.map((f) => <Field key={f.label} label={f.label} value={f.value} />)}
          </DetailCard>
        </motion.div>
      ))}
    </div>
  )
}