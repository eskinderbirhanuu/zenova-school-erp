"use client"

import type { ReactNode } from "react"

interface ChartsGridProps {
  children: [ReactNode, ReactNode]
  className?: string
}

export default function ChartsGrid({ children, className = "lg:grid-cols-7" }: ChartsGridProps) {
  return <div className={`grid gap-6 ${className}`}>{children}</div>
}
