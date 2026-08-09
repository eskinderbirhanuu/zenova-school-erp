import { apiGet } from "./api"

export interface Announcement {
  id: string
  title: string
  content: string
  target_roles?: string | null
  is_published: boolean
  created_by: string
  created_at?: string | null
}

export function fetchAnnouncements(baseUrl: string): Promise<Announcement[]> {
  return apiGet<Announcement[]>(baseUrl, "/announcements")
}
