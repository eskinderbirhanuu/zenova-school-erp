"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Coffee, ShoppingCart, TrendingUp, Package } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function CafeteriaPage() {
  const [products, setProducts] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [name, setName] = useState(""); const [price, setPrice] = useState(""); const [stock, setStock] = useState(""); const [category, setCategory] = useState("")
  const [showForm, setShowForm] = useState(false); const [tab, setTab] = useState<"pos" | "orders">("pos")
  const [cart, setCart] = useState<{id: string; name: string; price: number; qty: number}[]>([])
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : ""
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }

  const load = () => {
    fetch(`${API}/cafeteria/products`, { headers }).then((r) => r.json()).then(setProducts).catch(() => {})
    fetch(`${API}/cafeteria/orders`, { headers }).then((r) => r.json()).then(setOrders).catch(() => {})
  }
  useEffect(() => { load() }, [])

  const createProduct = async () => {
    const res = await fetch(`${API}/cafeteria/products`, {
      method: "POST", headers, body: JSON.stringify({ name, price: Number(price), stock: Number(stock) || 0, category })
    })
    if (res.ok) { toast({ title: "Product added" }); setName(""); setPrice(""); setStock(""); setCategory(""); setShowForm(false); load() }
    else { const e = await res.json(); toast({ title: "Error", description: e.detail, variant: "destructive" }) }
  }

  const addToCart = (p: any) => {
    setCart((prev) => {
      const exist = prev.find((c) => c.id === p.id)
      if (exist) return prev.map((c) => c.id === p.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { id: p.id, name: p.name, price: Number(p.price), qty: 1 }]
    })
  }

  const checkout = async () => {
    const items = cart.map((c) => ({ product_id: c.id, quantity: c.qty }))
    const res = await fetch(`${API}/cafeteria/orders`, {
      method: "POST", headers, body: JSON.stringify({ customer_type: "student", items, payment_method: "cash" })
    })
    if (res.ok) { toast({ title: "Order completed!" }); setCart([]); load() }
    else { const e = await res.json(); toast({ title: "Error", description: e.detail, variant: "destructive" }) }
  }

  const totalRevenue = orders.reduce((s: number, o: any) => s + Number(o.total), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Cafeteria</h1>
        <Button onClick={() => setShowForm(!showForm)}><Package className="mr-2 h-4 w-4" />Add Product</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Products</CardTitle><Coffee className="h-4 w-4 text-blue-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{products.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Orders Today</CardTitle><ShoppingCart className="h-4 w-4 text-orange-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{orders.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Revenue</CardTitle><TrendingUp className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Low Stock</CardTitle><Package className="h-4 w-4 text-red-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{products.filter((p: any) => p.stock <= 5).length}</div></CardContent></Card>
      </div>
      <div className="flex gap-2">
        <Button variant={tab === "pos" ? "default" : "outline"} onClick={() => setTab("pos")}>POS</Button>
        <Button variant={tab === "orders" ? "default" : "outline"} onClick={() => setTab("orders")}>Orders</Button>
      </div>
      {showForm && (
        <Card><CardHeader><CardTitle>New Product</CardTitle></CardHeader>
          <CardContent className="flex gap-4 items-end flex-wrap">
            <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Price</Label><Input value={price} onChange={(e) => setPrice(e.target.value)} type="number" step="0.01" /></div>
            <div className="space-y-2"><Label>Stock</Label><Input value={stock} onChange={(e) => setStock(e.target.value)} type="number" /></div>
            <div className="space-y-2"><Label>Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} /></div>
            <Button onClick={createProduct}>Save</Button>
          </CardContent>
        </Card>
      )}
      {tab === "pos" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card><CardHeader><CardTitle>Products</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {products.map((p: any) => (
                    <Card key={p.id} className="cursor-pointer hover:bg-accent transition-colors" onClick={() => addToCart(p)}>
                      <CardContent className="p-4 text-center">
                        <Coffee className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <div className="font-medium text-sm">{p.name}</div>
                        <div className="text-lg font-bold">${Number(p.price).toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">Stock: {p.stock}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card><CardHeader><CardTitle>Cart ({cart.reduce((s, c) => s + c.qty, 0)})</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {cart.map((c) => (
                  <div key={c.id} className="flex justify-between text-sm">
                    <span>{c.name} × {c.qty}</span>
                    <span className="font-medium">${(c.price * c.qty).toFixed(2)}</span>
                  </div>
                ))}
                {cart.length === 0 && <p className="text-sm text-muted-foreground">Click products to add</p>}
                {cart.length > 0 && (
                  <>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total</span>
                      <span>${cart.reduce((s, c) => s + c.price * c.qty, 0).toFixed(2)}</span>
                    </div>
                    <Button className="w-full" onClick={checkout}><ShoppingCart className="mr-2 h-4 w-4" />Checkout</Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      {tab === "orders" && (
        <Card><CardHeader><CardTitle>Order History</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">ID</th><th className="pb-3 font-medium">Total</th>
                  <th className="pb-3 font-medium">Payment</th><th className="pb-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o: any) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-3 text-xs">{o.id.substring(0, 8)}</td>
                    <td className="py-3 font-medium">${Number(o.total).toFixed(2)}</td>
                    <td className="py-3">{o.payment_method || "—"}</td>
                    <td className="py-3 text-xs text-muted-foreground">{o.created_at ? new Date(o.created_at).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
