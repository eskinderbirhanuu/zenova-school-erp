"use client"

import type { ReactNode } from "react"
import { motion } from "framer-motion"

interface Column<T> {
  key: string
  header: string
  render: (item: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string
  onRowClick?: (item: T) => void
}

export function DataTable<T>({ columns, data, keyExtractor, onRowClick }: DataTableProps<T>) {
  return (
    <div className="relative rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-primary/[0.01]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <table className="w-full relative">
        <thead>
          <tr className="border-b border-border/40 bg-muted/30">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground ${col.className ?? ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <motion.tr
              key={keyExtractor(item)}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.02 }}
              className={`group border-b border-border/30 last:border-0 transition-all duration-150
                ${onRowClick ? "cursor-pointer" : ""}
                hover:bg-gradient-to-r hover:from-primary/[0.04] hover:via-primary/[0.02] hover:to-transparent`}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-5 py-3.5 text-sm ${col.className ?? ""}`}>
                  {col.render(item)}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}