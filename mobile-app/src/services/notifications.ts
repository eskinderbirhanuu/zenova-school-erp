import { apiGet, apiPost } from "./api"

export interface Notification {
  id: string
  user_id: string
  title: string
  message?: string | null
  notification_type?: string | null
  reference_type?: string | null
  reference_id?: string | null
  is_read: boolean
  read_at?: string | null
  created_at?: string | null
}

export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  subject: string
  message?: string | null
  is_read: boolean
  read_at?: string | null
  sender_name?: string | null
  created_at?: string | null
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export function fetchNotifications(
  baseUrl: string,
  unreadOnly = false,
  page = 1,
  pageSize = 50,
): Promise<Paginated<Notification>> {
  const q = `?unread_only=${unreadOnly}&page=${page}&page_size=${pageSize}`
  return apiGet<Paginated<Notification>>(baseUrl, `/notifications${q}`)
}

export function markNotificationRead(baseUrl: string, notificationId: string): Promise<{ message: string }> {
  return apiPost(baseUrl, `/notifications/${notificationId}/read`, {})
}

export function markAllNotificationsRead(baseUrl: string): Promise<{ message: string }> {
  return apiPost(baseUrl, "/notifications/read-all", {})
}

export function fetchMessages(
  baseUrl: string,
  includeSent = false,
  page = 1,
  pageSize = 50,
): Promise<Paginated<Message>> {
  const q = `?include_sent=${includeSent}&page=${page}&page_size=${pageSize}`
  return apiGet<Paginated<Message>>(baseUrl, `/messages${q}`)
}

export function markMessageRead(baseUrl: string, messageId: string): Promise<{ message: string }> {
  return apiPost(baseUrl, `/messages/${messageId}/read`, {})
}
