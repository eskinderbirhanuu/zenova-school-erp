import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"

interface TrendIndicatorProps {
  value: string | number
  positive: boolean
  className?: string
}

export function TrendIndicator({ value, positive, className }: TrendIndicatorProps) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", positive ? "text-emerald-600" : "text-red-600", className)}>
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {value}
    </span>
  )
}
