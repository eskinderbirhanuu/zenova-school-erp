"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import api from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { UserPlus, Shield, Search } from "lucide-react"

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "" })

  const load = async () => {
    setLoading(true)
    try { const [u, r] = await Promise.all([api.get("/users"), api.get("/roles")]); setUsers(u.data); setRoles(r.data) } catch { toast({ title: "Failed to load", variant: "destructive" }) }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try { await api.post("/auth/register", form); toast({ title: "User created" }); setShowForm(false); setForm({ email: "", password: "", full_name: "", role: "" }); load() } catch { toast({ title: "Failed", variant: "destructive" }) }
  }

  const toggleActive = async (id: string, active: boolean) => {
    try { await api.patch(`/users/${id}`, { is_active: !active }); toast({ title: active ? "Deactivated" : "Activated" }); load() } catch { toast({ title: "Failed", variant: "destructive" }) }
  }

  const filtered = users.filter((u: any) => u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Button onClick={() => setShowForm(!showForm)}><UserPlus className="mr-2 h-4 w-4" />{showForm ? "Cancel" : "New User"}</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Create User</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={createUser} className="grid gap-4 md:grid-cols-4">
              <Input placeholder="Full Name" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required />
              <Input placeholder="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              <Input placeholder="Password" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                <option value="">Select Role</option>
                {roles.map((r: any) => <option key={r.id || r.name} value={r.name}>{r.name}</option>)}
              </select>
              <Button type="submit" className="md:col-start-4">Create</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-4 font-medium">Name</th><th className="p-4 font-medium">Email</th><th className="p-4 font-medium">Role</th><th className="p-4 font-medium">Status</th><th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="p-8 text-center">Loading...</td></tr>}
              {!loading && filtered.map((u: any) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-4 font-medium">{u.full_name}</td>
                  <td className="p-4">{u.email}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                      <Shield className="h-3 w-3" />{u.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${u.is_active !== false ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {u.is_active !== false ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-4">
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(u.id, u.is_active !== false)}>
                      {u.is_active !== false ? "Deactivate" : "Activate"}
                    </Button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No users</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
