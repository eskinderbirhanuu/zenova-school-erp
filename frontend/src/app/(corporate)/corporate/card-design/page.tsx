"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageHeader } from "@/components/ui/page-header"
import { toast } from "@/hooks/use-toast"
import { nfcV2Service, cardDesignService } from "@/services/api"
import { CreditCard, Download, Save, Upload, Loader2 } from "lucide-react"

export default function CardDesignPage() {
  const [side, setSide] = useState<"front" | "back">("front")
  const [cardType, setCardType] = useState("student")
  const [cardTier, setCardTier] = useState<"standard" | "premium">("standard")
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [schoolId, setSchoolId] = useState<string>("")
  const [form, setForm] = useState({
    full_name: "Abebe Kebede",
    student_id: "STU-001",
    grade: "Grade 10",
    section: "A",
    school_name: "ZENOVA International School",
    address: "Addis Ababa, Ethiopia",
    website: "www.zenova.edu.et",
    emergency: "+251-911-000000",
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Try to load saved design
    const stored = localStorage.getItem("zenova_school_id")
    if (stored) {
      setSchoolId(stored)
      cardDesignService.get(stored)
        .then(res => {
          const data = res.data
          if (data.logo_url) setSchoolLogo(data.logo_url)
          if (data.design_json) {
            try {
              const saved = JSON.parse(data.design_json)
              setForm(prev => ({ ...prev, ...saved }))
              if (saved.cardTier) setCardTier(saved.cardTier)
            } catch { /* ignore */ }
          }
        })
        .catch(() => { /* no saved design */ })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setSchoolLogo(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleChange = (f: string, v: string) => setForm(prev => ({ ...prev, [f]: v }))

  const saveDesign = async () => {
    if (!schoolId) {
      toast({ title: "No school ID", description: "Set school ID in localStorage: zenova_school_id", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const designJson = JSON.stringify({ ...form, cardTier })
      await cardDesignService.save(schoolId, {
        logo_url: schoolLogo,
        design_json: designJson,
      })
      toast({ title: "Card design saved!" })
    } catch {
      toast({ title: "Failed to save design", variant: "destructive" })
    }
    setSaving(false)
  }

  const downloadPdf = async () => {
    try {
      const refId = form.student_id || "STU-001"
      const res = await nfcV2Service.downloadCardPdf(cardType, refId)
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }))
      const a = document.createElement("a")
      a.href = url
      a.download = `${cardType}_${refId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: "PDF downloaded" })
    } catch {
      toast({ title: "Failed to generate PDF", description: "Ensure the reference ID exists in the system", variant: "destructive" })
    }
  }

  const tierLabel = cardTier === "premium" ? "DESFire EV2" : "MIFARE Classic 1K"
  const tierColor = cardTier === "premium"
    ? "from-slate-800 to-slate-900 text-white border-slate-700"
    : "from-blue-50 to-white text-slate-900 border-blue-200"

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Card Designer"
        description="Design your NFC ID card front & back with ZENOVA branding"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={saveDesign} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Design
            </Button>
            <Button variant="outline" onClick={downloadPdf}>
              <Download className="h-4 w-4 mr-2" /> Download PDF
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" /> Card Preview
              </CardTitle>
              <CardDescription>{side === "front" ? "Front" : "Back"} side — {tierLabel} chip</CardDescription>
            </div>
            <div className="flex gap-1">
              <Button
                variant={side === "front" ? "default" : "outline"} size="sm"
                onClick={() => setSide("front")}
              >Front</Button>
              <Button
                variant={side === "back" ? "default" : "outline"} size="sm"
                onClick={() => setSide("back")}
              >Back</Button>
            </div>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <div className={`relative w-[380px] h-[240px] rounded-xl border-2 bg-gradient-to-br ${tierColor} shadow-lg overflow-hidden`}>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                <span className="text-5xl font-black text-black/5 tracking-[0.2em] -rotate-12">ZENOVA</span>
              </div>

              {side === "front" ? (
                <div className="relative z-10 p-5 h-full flex flex-col">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        {schoolLogo ? (
                          <img src={schoolLogo} alt="School" className="h-8 w-8 rounded-full object-cover" />
                        ) : "S"}
                      </div>
                      <span className="text-xs font-semibold opacity-80">{form.school_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {cardTier === "premium" ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 border border-amber-400/40 px-1.5 py-0.5 rounded">DESFire</span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 border border-blue-400/40 px-1.5 py-0.5 rounded">MIFARE</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1" />
                  <div className="space-y-0.5">
                    <p className="text-lg font-bold">{form.full_name}</p>
                    <p className="text-xs opacity-75">{form.student_id}</p>
                    <div className="flex gap-4 text-[11px] opacity-70 mt-1">
                      <span>{form.grade}</span>
                      <span>Section {form.section}</span>
                    </div>
                  </div>
                  <div className="mt-auto pt-2 border-t border-white/10 flex items-center justify-between text-[9px] opacity-50">
                    <span>Powered By ZENOVA</span>
                    <span className="font-mono">{tierLabel}</span>
                  </div>
                </div>
              ) : (
                <div className="relative z-10 p-5 h-full flex flex-col justify-between">
                  <div className="flex items-center justify-center flex-1">
                    <div className="h-24 w-24 border-2 border-dashed border-current/20 rounded flex items-center justify-center text-[10px] opacity-40">QR Code</div>
                  </div>
                  <div className="space-y-1 text-[10px] opacity-60 text-center">
                    <p>{form.emergency}</p>
                    <p>{form.address}</p>
                    <p className="font-mono text-[8px]">{form.website}</p>
                    <div className="pt-1 border-t border-white/10 flex items-center justify-center gap-1 text-[8px]">
                      <span className="font-semibold tracking-wider">ZENOVA</span>
                      <span>NFC Technology</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Card Type</Label>
              <Select value={cardType} onValueChange={setCardType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="employee">Corporate Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>NFC Chip Tier</Label>
              <Select value={cardTier} onValueChange={(v) => setCardTier(v as "standard" | "premium")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard (MIFARE Classic 1K) — $0.50</SelectItem>
                  <SelectItem value="premium">Premium (MIFARE DESFire EV2) — $2.50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>School Logo</Label>
              <div className="flex gap-2">
                <Input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> Upload Logo
                </Button>
                {schoolLogo && (
                  <Button variant="ghost" size="icon" onClick={() => setSchoolLogo(null)}>×</Button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={form.full_name} onChange={e => handleChange("full_name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>ID / Student ID</Label>
              <Input value={form.student_id} onChange={e => handleChange("student_id", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Grade</Label>
                <Input value={form.grade} onChange={e => handleChange("grade", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Section</Label>
                <Input value={form.section} onChange={e => handleChange("section", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>School Name</Label>
              <Input value={form.school_name} onChange={e => handleChange("school_name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Emergency Phone</Label>
              <Input value={form.emergency} onChange={e => handleChange("emergency", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={form.address} onChange={e => handleChange("address", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input value={form.website} onChange={e => handleChange("website", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>School ID (for save)</Label>
              <Input value={schoolId} onChange={e => {
                setSchoolId(e.target.value)
                localStorage.setItem("zenova_school_id", e.target.value)
              }} placeholder="Enter school UUID" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
