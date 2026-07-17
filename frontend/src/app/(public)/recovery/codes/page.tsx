"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { recoveryService } from "@/services/api"
import { Loader2, Shield, Copy, CheckCircle2, AlertCircle } from "lucide-react"

interface CodeItem {
  id: string
  prefix: string
  is_used: boolean
  created_at: string
  expires_at: string | null
}

export default function RecoveryCodesPage() {
  const [codes, setCodes] = useState<CodeItem[]>([])
  const [newCodes, setNewCodes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState(-1)

  const fetchCodes = async () => {
    try {
      const res = await recoveryService.listRecoveryCodes()
      setCodes(res.data?.codes || [])
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCodes()
  }, [])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await recoveryService.generateRecoveryCodes()
      setNewCodes(res.data?.codes || [])
      toast({ title: "Recovery codes generated — save them securely!" })
      await fetchCodes()
    } catch {
      toast({ title: "Failed to generate codes", variant: "destructive" })
    }
    setGenerating(false)
  }

  const handleCopy = (code: string, index: number) => {
    navigator.clipboard.writeText(code)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(-1), 2000)
  }

  const remaining = codes.filter(c => !c.is_used).length

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="text-xl">Recovery Codes</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {remaining} unused code{remaining !== 1 ? "s" : ""} remaining
                </p>
              </div>
            </div>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Generate New
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {newCodes.length > 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-yellow-700" />
                <span className="text-sm font-medium text-yellow-800">Save these codes in a secure place!</span>
              </div>
              <div className="space-y-2">
                {newCodes.map((code, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white rounded p-2 border">
                    <code className="font-mono text-sm tracking-widest">{code}</code>
                    <Button variant="ghost" size="sm" onClick={() => handleCopy(code, idx)}>
                      {copiedIndex === idx ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-yellow-700 mt-2">Each code can be used only once. These will not be shown again.</p>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : codes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No recovery codes generated yet.</p>
              <p className="text-sm mt-1">Generate recovery codes for offline password recovery.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {codes.map((code) => (
                <div key={code.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <code className="font-mono text-sm">{code.prefix}••••••••</code>
                    <Badge variant={code.is_used ? "secondary" : "outline"}>
                      {code.is_used ? "Used" : "Active"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
