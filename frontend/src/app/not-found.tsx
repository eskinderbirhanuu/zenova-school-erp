import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 text-7xl font-bold text-primary/20">404</div>
      <h2 className="text-xl font-semibold text-foreground">Page not found</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The page you are looking for doesn&apos;t exist or has been moved.
      </p>
      <Button asChild className="mt-6" size="sm">
        <Link href="/login">
          <Home className="h-4 w-4" />
          Go to Login
        </Link>
      </Button>
    </div>
  )
}
