import { Platform } from "react-native"
import * as Device from "expo-device"
import * as Notifications from "expo-notifications"
import { apiDelete, apiGet, apiPost } from "./api"

export interface Features {
  push: boolean
}

/**
 * Per-school push feature flag from the school backend
 * (`GET /config/features`, no auth required).
 */
export async function isPushEnabled(baseUrl: string): Promise<boolean> {
  try {
    const features = await apiGet<Features>(baseUrl, "/config/features")
    return features.push ?? false
  } catch {
    return false
  }
}

/**
 * Best-effort device-token registration (Gap N2). Called after sign-in.
 * Non-blocking: never throws to the caller. When the push channel is disabled
 * on the school backend (or permission is denied), it silently no-ops.
 */
export async function registerDeviceForPush(baseUrl: string): Promise<void> {
  try {
    if (!(await isPushEnabled(baseUrl))) return
    if (!Device.isDevice) return
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "ZENOVA",
        importance: Notifications.AndroidImportance.HIGH,
      })
    }
    const { status } = await Notifications.getPermissionsAsync()
    if (status !== "granted") {
      const req = await Notifications.requestPermissionsAsync()
      if (req.status !== "granted") return
    }
    const token = await Notifications.getDevicePushTokenAsync()
    if (!token?.data) return
    await apiPost(baseUrl, "/notifications/device-token", {
      platform: Platform.OS === "ios" ? "ios" : "android",
      token: typeof token.data === "string" ? token.data : JSON.stringify(token.data),
    })
  } catch {
    // Push is best-effort; a failure must never break the signed-in flow.
  }
}

/**
 * Best-effort unregistration on sign-out (leaves the token inert on the
 * school backend).
 */
export async function unregisterDeviceForPush(baseUrl: string): Promise<void> {
  try {
    if (!(await isPushEnabled(baseUrl))) return
    const token = await Notifications.getDevicePushTokenAsync().catch(() => null)
    if (!token?.data) return
    const raw = typeof token.data === "string" ? token.data : JSON.stringify(token.data)
    await apiDelete(baseUrl, `/notifications/device-token/${encodeURIComponent(raw)}`)
  } catch {
    // Best-effort.
  }
}
