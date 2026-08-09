import * as SecureStore from "expo-secure-store"

const SCHOOL_KEY = "zenova.schoolUrl"
const TOKEN_KEY = "zenova.accessToken"
const REFRESH_KEY = "zenova.refreshToken"
const BRANDING_KEY = "zenova.schoolBranding"
const FEED_CACHE_KEY = "zenova.partnerFeedCache"

export async function getStoredSchoolUrl(): Promise<string | null> {
  return SecureStore.getItemAsync(SCHOOL_KEY)
}

export async function setStoredSchoolUrl(url: string): Promise<void> {
  await SecureStore.setItemAsync(SCHOOL_KEY, url.replace(/\/+$/, ""))
}

export async function clearStoredSchoolUrl(): Promise<void> {
  await SecureStore.deleteItemAsync(SCHOOL_KEY)
}

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY)
}

export async function getStoredRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY)
}

export async function setStoredSession(accessToken: string, refreshToken: string | null): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, accessToken)
  if (refreshToken) await SecureStore.setItemAsync(REFRESH_KEY, refreshToken)
}

export async function clearStoredSession(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
  await SecureStore.deleteItemAsync(REFRESH_KEY)
}

export async function setStoredSchoolBranding(branding: unknown): Promise<void> {
  if (branding == null) {
    await SecureStore.deleteItemAsync(BRANDING_KEY)
    return
  }
  await SecureStore.setItemAsync(BRANDING_KEY, JSON.stringify(branding))
}

export async function getStoredSchoolBranding<T>(): Promise<T | null> {
  try {
    const raw = await SecureStore.getItemAsync(BRANDING_KEY)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

interface FeedCache<T> {
  savedAt: number
  data: T
}

export async function readCachedFeed<T>(key: string): Promise<T | null> {
  try {
    const raw = await SecureStore.getItemAsync(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as FeedCache<T>
    return parsed.data
  } catch {
    return null
  }
}

export async function writeCachedFeed<T>(key: string, data: T): Promise<void> {
  const entry: FeedCache<T> = { savedAt: Date.now(), data }
  await SecureStore.setItemAsync(key, JSON.stringify(entry))
}

export const PARTNER_FEED_CACHE = `${FEED_CACHE_KEY}.partners`
