"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { GenericFormCard } from "@/components/ui/generic-form-card"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { useBranch, useUpdateBranch } from "@/hooks/queries"

export default function EditBranchPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { data: branch, isLoading: fetching } = useBranch(id)
  const updateBranch = useUpdateBranch()
  const [form, setForm] = useState({ name: "", code: "", address: "", phone: "", email: "" })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (branch) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({ name: branch.name || "", code: branch.code || "", address: branch.address || "", phone: branch.phone || "", email: (branch as any).email || "" })
    }
  }, [branch])

  const update = (p: Partial<typeof form>) => setForm(prev => ({ ...prev, ...p }))

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await updateBranch.mutateAsync({ id, data: form as any })
      toast({ title: "Branch updated" })
      router.push("/admin/branches")
    } catch (err: any) {
      toast({ title: err?.response?.data?.detail || "Failed to update", variant: "destructive" })
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <GenericFormCard title="Edit Branch" backHref="/admin/branches" onSubmit={handleSubmit} loading={loading || fetching} saveLabel="Save Changes">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Branch Name</label>
            <Input value={form.name} onChange={e => update({ name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Branch Code</label>
            <Input value={form.code} onChange={e => update({ code: e.target.value })} required />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Address</label>
          <Input value={form.address} onChange={e => update({ address: e.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Phone</label>
            <Input type="tel" value={form.phone} onChange={e => update({ phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input type="email" value={form.email} onChange={e => update({ email: e.target.value })} />
          </div>
        </div>
      </GenericFormCard>
    </div>
  )
}
