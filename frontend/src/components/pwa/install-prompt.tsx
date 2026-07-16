"use client"

import { useState, useEffect } from "react"
import { Download } from "lucide-react"

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null)
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      if (!dismissed) setShow(true)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [dismissed])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    ;(deferredPrompt as any).prompt()
    await (deferredPrompt as any).userChoice
    setShow(false)
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShow(false)
    setDismissed(true)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="glass rounded-2xl p-4 shadow-2xl border border-white/10 max-w-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white">Install ZENOVA</h3>
            <p className="text-xs text-white/60 mt-0.5">
              Get the best experience with our app
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={handleInstall}
            className="flex-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-400 hover:to-purple-500 transition-all"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="text-xs px-3 py-1.5 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/5 transition-all"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
