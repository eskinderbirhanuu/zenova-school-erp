"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { recoveryService } from "@/services/api"
import { Loader2, Key, Shield, Terminal, AlertCircle, CheckCircle2 } from "lucide-react"

export default function AdminPasswordRecoveryPage() {
  const [activeTab, setActiveTab] = useState<"temp" | "codes" | "emergency">("temp")

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Password Recovery Management</h1>

      <div className="flex gap-2 mb-6">
        <Button variant={activeTab === "temp" ? "default" : "outline"} onClick={() => setActiveTab("temp")}>
          <Key className="h-4 w-4 mr-2" /> Temp Password
        </Button>
        <Button variant={activeTab === "codes" ? "default" : "outline"} onClick={() => setActiveTab("codes")}>
          <Shield className="h-4 w-4 mr-2" /> Recovery Codes
        </Button>
        <Button variant={activeTab === "emergency" ? "default" : "outline"} onClick={() => setActiveTab("emergency")}>
          <Terminal className="h-4 w-4 mr-2" /> Emergency Token
        </Button>
      </div>

      {activeTab === "temp" && <GenerateTempPassword />}
      {activeTab === "codes" && <ManageCodes />}
      {activeTab === "emergency" && <GenerateEmergencyToken />}
    </div>
  )
}

function GenerateTempPassword() {
  const [targetUserId, setTargetUserId] = useState("")
  const [reason, setReason] = useState("Administrator-initiated password reset")
  const [result, setResult] = useState<{ temp_password: string; expires_at: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const res = await recoveryService.generateTempPassword({ target_user_id: targetUserId, reason })
      setResult(res.data)
      toast({ title: "Temporary password generated" })
    } catch (err: any) {
      toast({ title: err?.response?.data?.detail || "Failed to generate", variant: "destructive" })
    }
    setLoading(false)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Temporary Password</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Target User ID</label>
            <Input placeholder="User UUID" value={targetUserId} onChange={e => setTargetUserId(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Reason</label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Generate Temporary Password
          </Button>
        </form>

        {result && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-700" />
              <span className="text-sm font-medium text-yellow-800">Temporary Password (one-time use)</span>
            </div>
            <div className="flex items-center justify-between bg-white rounded p-3 border">
              <code className="font-mono text-lg tracking-widest">{result.temp_password}</code>
              <Button variant="outline" size="sm" onClick={() => handleCopy(result.temp_password)}>
                {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-yellow-700">
              Expires: {new Date(result.expires_at).toLocaleString()} &middot; User must change on first login
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ManageCodes() {
  const [codes, setCodes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState(-1)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await recoveryService.generateRecoveryCodes()
      setCodes(res.data?.codes || [])
      toast({ title: "10 recovery codes generated" })
    } catch {
      toast({ title: "Failed to generate", variant: "destructive" })
    }
    setLoading(false)
  }

  const handleCopy = (code: string, index: number) => {
    navigator.clipboard.writeText(code)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(-1), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recovery Codes</CardTitle>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Generate 10 Codes
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {codes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recovery codes generated. Click Generate 10 Codes to create new recovery codes for the current user.</p>
        ) : (
          <div className="space-y-2">
            {codes.map((code, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 border rounded">
                <code className="font-mono text-sm tracking-widest">{code}</code>
                <Button variant="ghost" size="sm" onClick={() => handleCopy(code, idx)}>
                  {copiedIndex === idx ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : "Copy"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function GenerateEmergencyToken() {
  const [targetUserId, setTargetUserId] = useState("")
  const [result, setResult] = useState<{ token: string; expires_at: string; command: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const res = await recoveryService.generateEmergencyToken({ target_user_id: targetUserId })
      setResult(res.data)
      toast({ title: "Emergency token generated" })
    } catch (err: any) {
      toast({ title: err?.response?.data?.detail || "Failed to generate", variant: "destructive" })
    }
    setLoading(false)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Emergency Recovery Token</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Target User ID</label>
            <Input placeholder="User UUID" value={targetUserId} onChange={e => setTargetUserId(e.target.value)} required />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Generate Token
          </Button>
        </form>

        {result && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-orange-700" />
              <span className="text-sm font-medium text-orange-800">Emergency Recovery Token</span>
            </div>
            <div className="bg-white rounded p-3 border">
              <p className="text-xs text-muted-foreground mb-1">Server command:</p>
              <code className="text-sm font-mono block bg-gray-100 p-2 rounded">{result.command}</code>
            </div>
            <div className="flex items-center justify-between bg-white rounded p-3 border">
              <code className="text-xs font-mono break-all">{result.token}</code>
              <Button variant="outline" size="sm" onClick={() => handleCopy(result.token)}>
                {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-orange-700">Expires: {new Date(result.expires_at).toLocaleString()}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
