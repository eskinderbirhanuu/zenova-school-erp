"use client"

import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertCircle className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        An unexpected error occurred while loading this page. You can try again or
        contact support if the problem persists.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-muted-foreground/60">
          Error ID: {error.digest}
        </p>
      )}
      <Button onClick={reset} variant="outline" className="mt-6" size="sm">
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  )
}
