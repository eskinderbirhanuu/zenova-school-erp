export async function getDeviceFingerprint(): Promise<string | null> {
  try {
    const parts: string[] = []

    parts.push(navigator.userAgent || "")
    parts.push(navigator.language || "")
    parts.push(screen.width + "x" + screen.height + "x" + screen.colorDepth)
    parts.push(navigator.hardwareConcurrency?.toString() || "")
    parts.push(navigator.platform || "")

    const canvas = document.createElement("canvas")
    canvas.width = 200
    canvas.height = 50
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.textBaseline = "top"
      ctx.font = "14px Arial"
      ctx.fillStyle = "#f60"
      ctx.fillRect(125, 1, 62, 20)
      ctx.fillStyle = "#069"
      ctx.fillText("zenova", 2, 15)
      parts.push(canvas.toDataURL())
    }

    const raw = parts.join("|")
    const enc = new TextEncoder().encode(raw)
    const hash = await crypto.subtle.digest("SHA-256", enc)
    return Array.from(new Uint8Array(hash)).map((b: any) => b.toString(16).padStart(2, "0")).join("")
  } catch {
    return null
  }
}
