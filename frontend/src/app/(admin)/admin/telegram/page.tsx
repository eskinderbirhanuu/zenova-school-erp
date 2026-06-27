"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/ui/page-header"
import { toast } from "@/hooks/use-toast"
import { MessageSquare, Link2, Link2Off, Bot, RefreshCw, Loader2, CheckCircle2, XCircle } from "lucide-react"
import api from "@/services/api"

export default function AdminTelegram() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [botConnected, setBotConnected] = useState(false)
  const [botInfo, setBotInfo] = useState({ bot_username: "", bot_name: "", logo_url: "" })
  const [token, setToken] = useState("")

  const fetchStatus = () => {
    setLoading(true)
    api.get("/telegram/bot/status")
      .then((res) => {
        const d = res.data?.data || res.data || {}
        if (d.bot_username) {
          setBotConnected(true)
          setBotInfo(d)
        } else {
          setBotConnected(false)
          setBotInfo({ bot_username: "", bot_name: "", logo_url: "" })
        }
      })
      .catch((err) => {
        toast({ title: "Failed to check bot status", description: err?.response?.data?.detail || err.message, variant: "destructive" })
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchStatus() }, [])

  const handleConnect = async () => {
    if (!token.trim()) {
      toast({ title: "Please enter a bot token", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      await api.post("/telegram/bot/connect", { bot_token: token.trim() })
      toast({ title: "Bot connected successfully" })
      setToken("")
      fetchStatus()
    } catch (err: any) {
      toast({ title: "Failed to connect bot", description: err?.response?.data?.detail || err.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm("Disconnect this Telegram bot? Parents linked via this bot will no longer receive notifications.")) return
    setDisconnecting(true)
    try {
      await api.post("/telegram/bot/disconnect")
      toast({ title: "Bot disconnected" })
      setBotConnected(false)
      setBotInfo({ bot_username: "", bot_name: "", logo_url: "" })
    } catch (err: any) {
      toast({ title: "Failed to disconnect bot", description: err?.response?.data?.detail || err.message, variant: "destructive" })
    } finally {
      setDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Telegram Bot"
        description="Connect a Telegram Bot to send absence alerts and notifications to parents"
      />

      <Card shadow="default">
        <CardHeader className="flex flex-row items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-2">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Bot Status</CardTitle>
            <CardDescription>
              {botConnected
                ? `Connected as @${botInfo.bot_username || botInfo.bot_name || "Unknown"}`
                : "No bot connected"}
            </CardDescription>
          </div>
          {botConnected ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm text-green-600 font-medium">Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-sm text-red-600 font-medium">Disconnected</span>
            </div>
          )}
        </CardHeader>
      </Card>

      {botConnected ? (
        <Card shadow="default">
          <CardHeader>
            <CardTitle className="text-lg">Connected Bot</CardTitle>
            <CardDescription>Your school is linked to this Telegram bot</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">Bot Name</p>
                <p className="text-sm text-muted-foreground">{botInfo.bot_name || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Bot Username</p>
                <p className="text-sm text-muted-foreground">@{botInfo.bot_username || "—"}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Parents can link their Telegram by sending <code className="bg-muted px-1 rounded">/link &lt;student_id&gt; &lt;password&gt;</code> to your bot.
            </p>
            <div className="pt-4">
              <Button variant="destructive" onClick={handleDisconnect} disabled={disconnecting}>
                {disconnecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2Off className="h-4 w-4 mr-2" />}
                {disconnecting ? "Disconnecting..." : "Disconnect Bot"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card shadow="default">
          <CardHeader className="flex flex-row items-start gap-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">Connect a Bot</CardTitle>
              <CardDescription>Paste the bot token from BotFather to connect</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Open Telegram and search for <strong>@BotFather</strong></li>
              <li>Send <code className="bg-muted px-1 rounded">/newbot</code> and follow the prompts</li>
              <li>Copy the HTTP API token (looks like <code className="bg-muted px-1 rounded">123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11</code>)</li>
              <li>Paste it below and click <strong>Connect</strong></li>
            </ol>
            <div className="flex gap-3">
              <Input
                placeholder="Enter bot token from BotFather"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="flex-1 font-mono text-sm"
              />
              <Button onClick={handleConnect} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
                {saving ? "Connecting..." : "Connect"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card shadow="default">
        <CardHeader className="flex flex-row items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-2">
            <RefreshCw className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">How It Works</CardTitle>
            <CardDescription>Parents receive absence alerts automatically</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Once connected, parents can link their Telegram account to your school bot by sending:</p>
          <p className="bg-muted p-2 rounded font-mono text-xs">/link &lt;StudentID&gt; &lt;ParentPassword&gt;</p>
          <p>When attendance is marked as absent, the system will:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Send an in-app notification (always)</li>
            <li>Send a Telegram message (if parent has linked and enabled Telegram)</li>
            <li>Send an email (if parent has enabled email notifications)</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
