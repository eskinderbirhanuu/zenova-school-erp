"use client"

import { useState, useEffect } from "react"
import { Fingerprint, Plus, Trash2, Loader2, Smartphone, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { listPasskeys, registerPasskey, deletePasskey, type WebAuthnCredential } from "@/lib/webauthn"

export function PasskeyManager() {
  const [credentials, setCredentials] = useState<WebAuthnCredential[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)

  const fetchCredentials = async () => {
    try {
      const creds = await listPasskeys()
      setCredentials(creds)
    } catch {
      // Not supported or not available
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchCredentials() }, [])

  const handleRegister = async () => {
    setRegistering(true)
    try {
      const deviceName = `Browser on ${navigator.platform || "Unknown"}`
      await registerPasskey(deviceName)
      toast({ title: "Passkey registered", description: "You can now use your passkey to sign in." })
      await fetchCredentials()
    } catch (err: any) {
      if (err.message === "User cancelled") return
      toast({ title: "Failed to register passkey", description: err.message, variant: "destructive" })
    } finally {
      setRegistering(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deletePasskey(id)
      setCredentials((prev) => prev.filter((c) => c.id !== id))
      toast({ title: "Passkey deleted" })
    } catch (err: any) {
      toast({ title: "Failed to delete passkey", description: err.message, variant: "destructive" })
    }
  }

  if (!window.PublicKeyCredential) {
    return null
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Passkeys
          </CardTitle>
          <CardDescription>
            Sign in with your fingerprint, face, or device PIN — faster and more secure than a password.
          </CardDescription>
        </div>
        <Button onClick={handleRegister} disabled={registering} size="sm" variant="outline">
          {registering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {registering ? "Registering..." : "Add Passkey"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : credentials.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <AlertCircle className="h-8 w-8" />
            <p>No passkeys registered yet.</p>
            <p className="text-xs">Add a passkey to sign in without a password.</p>
          </div>
        ) : (
          credentials.map((cred) => (
            <div
              key={cred.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <Smartphone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{cred.device_name || "Unknown device"}</p>
                  <p className="text-xs text-muted-foreground">
                    Added {cred.created_at ? new Date(cred.created_at).toLocaleDateString() : "Unknown"}
                    {cred.last_used_at ? ` · Last used ${new Date(cred.last_used_at).toLocaleDateString()}` : ""}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => handleDelete(cred.id)}
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
