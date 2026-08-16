import * as SecureStore from "expo-secure-store"
import { submitAttendance, type AttendanceBulkItem } from "./teacher"
import { SessionExpiredError } from "./api"

const QUEUE_KEY = "zenova.pending.attendance"

export interface PendingAttendance {
  id: string
  baseUrl: string
  records: AttendanceBulkItem[]
  queuedAt: number
  attempts: number
}

export interface QueueStatus {
  pending: number
  lastSyncAt: number | null
  error: string
}

/**
 * Persisted offline queue for attendance actions (APU_SYNC_ARCHITECTURE §3.2).
 * Each queued op carries a server-side idempotency key so replay is at-least-once.
 */
export async function getPendingAttendance(): Promise<PendingAttendance[]> {
  try {
    const raw = await SecureStore.getItemAsync(QUEUE_KEY)
    return raw ? (JSON.parse(raw) as PendingAttendance[]) : []
  } catch {
    return []
  }
}

export async function enqueueAttendance(
  baseUrl: string,
  records: AttendanceBulkItem[],
): Promise<PendingAttendance> {
  const existing = await getPendingAttendance()
  const op: PendingAttendance = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    baseUrl,
    records,
    queuedAt: Date.now(),
    attempts: 0,
  }
  await SecureStore.setItemAsync(QUEUE_KEY, JSON.stringify([...existing, op]))
  return op
}

async function saveQueue(queue: PendingAttendance[]): Promise<void> {
  if (queue.length === 0) {
    await SecureStore.deleteItemAsync(QUEUE_KEY)
  } else {
    await SecureStore.setItemAsync(QUEUE_KEY, JSON.stringify(queue))
  }
}

/**
 * Replay loop (FIFO). 200/201 -> remove; 4xx -> drop (failed, surface last error);
 * SessionExpired -> abort; 5xx/timeout -> keep for the next drain with the
 * caller's backoff (the op's attempts counter is bumped).
 */
export async function drainAttendanceQueue(
  baseUrl: string,
): Promise<QueueStatus> {
  const queue = await getPendingAttendance()
  const ops = queue.filter((o) => o.baseUrl === baseUrl)
  if (ops.length === 0) {
    return { pending: 0, lastSyncAt: Date.now(), error: "" }
  }

  const kept: PendingAttendance[] = []
  let lastError = ""
  for (const op of ops) {
    try {
      const result = await submitAttendance(baseUrl, op.records, op.id)
      if (result.errors && result.errors.length > 0) {
        lastError = `Some marks were skipped: ${result.errors[0].reason}`
      }
      // success -> drop
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        throw err
      }
      const status = err && typeof err === "object" && "status" in err ? (err as { status?: number }).status : undefined
      if (status !== undefined && status >= 400 && status < 500) {
        lastError = err instanceof Error ? err.message : `Replay failed (${status})`
        // 4xx (other than expired) -> drop, surface error
      } else {
        op.attempts += 1
        kept.push(op)
        lastError = err instanceof Error ? err.message : "Waiting for connection"
      }
    }
  }

  const remaining = [...queue.filter((o) => o.baseUrl !== baseUrl), ...kept]
  await saveQueue(remaining)

  return { pending: kept.length, lastSyncAt: Date.now(), error: lastError }
}

export async function clearPendingAttendance(): Promise<void> {
  await saveQueue([])
}
