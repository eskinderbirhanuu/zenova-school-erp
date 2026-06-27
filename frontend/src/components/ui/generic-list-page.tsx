"use client"

import { useState, type ReactNode, useEffect } from "react"
import { Search, Plus } from "lucide-react"
import { Input } from "./input"
import { Button } from "./button"
import { PageHeader } from "./page-header"
import { DataTable } from "./data-table"
import { EmptyState } from "./empty-state"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface Column<T> {
  key: string
  header: string
  render: (item: T) => ReactNode
  className?: string
}

interface GenericListPageProps<T> {
  title: string
  description?: string
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string
  loading?: boolean
  error?: string
  searchPlaceholder?: string
  onSearch?: (query: string) => void
  onRowClick?: (item: T) => void
  onCreateLabel?: string
  onCreateClick?: () => void
  emptyTitle?: string
  emptyDescription?: string
  actions?: ReactNode
  extraFilters?: ReactNode
}

export function GenericListPage<T>({
  title, description, columns, data, keyExtractor,
  loading, error, searchPlaceholder = "Search...",
  onSearch, onRowClick,
  onCreateLabel, onCreateClick,
  emptyTitle, emptyDescription, actions, extraFilters,
}: GenericListPageProps<T>) {
  const [searchInput, setSearchInput] = useState("")
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const handleSearch = (val: string) => {
    setSearchInput(val)
    onSearch?.(val)
  }

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative rounded-2xl border border-border/40 bg-gradient-to-br from-background via-background to-primary/5 p-6 shadow-sm overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--primary)/3%,transparent_60%)] pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {actions}
            {onCreateClick && (
              <Button onClick={onCreateClick} className="shadow-md shadow-primary/20">
                <Plus className="mr-1.5 h-4 w-4" />{onCreateLabel || "Create"}
              </Button>
            )}
          </div>
        </div>

        {onSearch && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="relative mt-4 max-w-md"
          >
            <div className="relative group">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  className="pl-10 pr-4 h-11 bg-background/80 backdrop-blur-sm border-border/60 rounded-xl shadow-sm
                    focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200
                    placeholder:text-muted-foreground/60"
                  placeholder={searchPlaceholder}
                  value={searchInput}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>
          </motion.div>
        )}

        {extraFilters && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="flex items-center gap-2 mt-3 flex-wrap"
          >
            {extraFilters}
          </motion.div>
        )}
      </motion.div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </motion.div>
        ) : error ? (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <EmptyState variant="error" title="Error" description={error} />
          </motion.div>
        ) : data.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <EmptyState
              title={emptyTitle || "No items found"}
              description={emptyDescription}
              action={onCreateClick ? { label: onCreateLabel || "Create", onClick: onCreateClick } : undefined}
            />
          </motion.div>
        ) : (
          <motion.div
            key="data"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <DataTable
              columns={columns}
              data={data}
              keyExtractor={keyExtractor}
              onRowClick={onRowClick}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}