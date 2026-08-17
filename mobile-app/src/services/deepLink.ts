import type { Notification } from "./notifications"

export type DeepLinkTarget =
  | { portal: "student"; view: "dashboard" | "assignments" | "exams" | "finance" | "documents" }
  | { portal: "parent"; view: "dashboard" | "invoices" | "receipts" }
  | { portal: "notifications"; tab: "notifications" | "messages" }
  | { portal: "announcements" }
  | { portal: "teacher"; view: "subjects" | "roster" | "timetable" | "attendance" | "marksheet" }
  | null

/**
 * Map a notification (its notification_type / reference_type + the user's
 * role) to a deep-link destination. Pure function so it is easy to test.
 *
 * Types produced by the backend (see backend services):
 *   invoice_created (ref invoice), exam_results (ref exam), attendance,
 *   message (ref message), student_enrolled (ref student), device_login,
 *   device_review (ref device / device_change_requests).
 */
export function resolveNotificationTarget(
  roleName: string | null,
  n: Pick<Notification, "notification_type" | "reference_type">,
): DeepLinkTarget {
  const type = n.notification_type ?? ""
  const ref = n.reference_type ?? ""
  const role = (roleName ?? "").toUpperCase()

  if (type === "message" || ref === "message") {
    return { portal: "notifications", tab: "messages" }
  }
  if (type === "invoice_created" || ref === "invoice") {
    if (role.includes("STUDENT")) return { portal: "student", view: "finance" }
    return { portal: "parent", view: "invoices" }
  }
  if (type === "exam_results" || ref === "exam") {
    if (role.includes("TEACHER")) return { portal: "teacher", view: "marksheet" }
    if (role.includes("STUDENT")) return { portal: "student", view: "exams" }
    return { portal: "parent", view: "dashboard" }
  }
  if (type === "attendance" || ref === "attendance") {
    if (role.includes("TEACHER")) return { portal: "teacher", view: "attendance" }
    if (role.includes("STUDENT")) return { portal: "student", view: "dashboard" }
    return { portal: "parent", view: "dashboard" }
  }
  if (type === "student_enrolled" || ref === "student") {
    return { portal: "student", view: "dashboard" }
  }
  if (ref === "announcement" || type === "announcement") {
    return { portal: "announcements" }
  }
  return null
}

/**
 * Resolve a push-notification payload (the FCM `data` map) to a deep-link
 * target. Push data carries the notification_type as `type`; reference info is
 * not in the push payload, so this is a best-effort role-less mapping.
 */
export function resolvePushTarget(
  data: Record<string, string | number | boolean | null> | undefined,
): DeepLinkTarget {
  const type = data?.type ? String(data.type) : ""
  if (type === "message") return { portal: "notifications", tab: "messages" }
  if (type === "invoice_created") return { portal: "parent", view: "invoices" }
  if (type === "exam_results") return { portal: "student", view: "exams" }
  if (type === "attendance") return { portal: "student", view: "dashboard" }
  return null
}