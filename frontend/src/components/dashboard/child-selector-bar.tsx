"use client"

import { cn } from "@/lib/utils"
import { FadeInUp } from "@/components/3d/micro-animations"

interface Child {
  id: string
  name: string
  initials: string
  grade: string
}

interface ChildSelectorBarProps {
  children: Child[]
  selectedId?: string
  onSelect: (id: string) => void
  delay?: number
}

export default function ChildSelectorBar({ children, selectedId, onSelect, delay = 0.1 }: ChildSelectorBarProps) {
  return (
    <FadeInUp delay={delay}>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        {children.map((child) => (
          <button
            key={child.id}
            onClick={() => onSelect(child.id)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all whitespace-nowrap shrink-0",
              selectedId === child.id
                ? "bg-primary/10 border-primary/40 shadow-sm ring-1 ring-primary/20"
                : "bg-card/60 border-border/40 hover:bg-muted/50"
            )}
          >
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
              selectedId === child.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {child.initials}
            </div>
            <div className="text-left">
              <p className={cn("text-sm font-semibold", selectedId === child.id ? "text-foreground" : "text-muted-foreground")}>{child.name}</p>
              <p className="text-xs text-muted-foreground">Grade {child.grade}</p>
            </div>
          </button>
        ))}
      </div>
    </FadeInUp>
  )
}
