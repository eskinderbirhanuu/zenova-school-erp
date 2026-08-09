import { useCallback, useEffect, useState } from "react"
import { readCachedFeedEntry, writeCachedFeed } from "../services/storage"
import { SessionExpiredError } from "../services/api"

export interface CachedResource<T> {
  data: T | null
  freshness: number | null
  loading: boolean
  error: string
  sessionExpired: boolean
  reload: () => void
}

/**
 * Load a resource through the authenticated API client, serving a cached copy
 * first (offline-first) and refreshing in the background. Tracks freshness so
 * screens can show a stale badge. Throwing SessionExpiredError surfaces as
 * `sessionExpired` so the app can route to login.
 */
export function useCachedResource<T>(
  loader: () => Promise<T>,
  cacheKey: string | null,
): CachedResource<T> {
  const [data, setData] = useState<T | null>(null)
  const [freshness, setFreshness] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [sessionExpired, setSessionExpired] = useState(false)
  const [reloadTick, setReloadTick] = useState(0)

  const reload = useCallback(() => setReloadTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError("")
      setSessionExpired(false)
      if (cacheKey) {
        const cached = await readCachedFeedEntry<T>(cacheKey)
        if (cached && !cancelled) {
          setData(cached.data)
          setFreshness(cached.savedAt)
        }
      }
      try {
        const fresh = await loader()
        if (cancelled) return
        setData(fresh)
        setFreshness(Date.now())
        if (cacheKey) await writeCachedFeed(cacheKey, fresh)
      } catch (err) {
        if (cancelled) return
        if (err instanceof SessionExpiredError) {
          setSessionExpired(true)
        } else {
          setError(err instanceof Error ? err.message : "Load failed")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reloadTick, loader, cacheKey])

  return { data, freshness, loading, error, sessionExpired, reload }
}

export function formatFreshness(savedAt: number | null): string | null {
  if (!savedAt) return null
  const minutes = Math.max(0, Math.floor((Date.now() - savedAt) / 60000))
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
