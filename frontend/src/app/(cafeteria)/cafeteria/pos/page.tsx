"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cafeteriaService } from "@/services/api"
import { toast } from "@/hooks/use-toast"
import { ShoppingCart, Trash2, Plus, Minus, Search, Coffee } from "lucide-react"

export default function CafeteriaPosPage() {
  const [products, setProducts] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [cart, setCart] = useState<{ product: any; qty: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState(false)

  useEffect(() => {
    setLoading(true)
    cafeteriaService.products.list({ limit: 50 })
      .then((r: any) => setProducts(r.data))
      .catch(() => toast({ title: "Failed to load products", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

  const filtered = products.filter((p: any) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  )

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id)
      if (existing) return prev.map((c) => c.product.id === product.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { product, qty: 1 }]
    })
  }

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) => prev.map((c) => {
      if (c.product.id !== productId) return c
      const newQty = c.qty + delta
      return newQty <= 0 ? null : { ...c, qty: newQty }
    }).filter(Boolean) as any)
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.product.id !== productId))
  }

  const total = cart.reduce((s, c) => s + Number(c.product.price || c.product.unit_price || 0) * c.qty, 0)

  const handleCheckout = async () => {
    if (cart.length === 0) return
    setCheckingOut(true)
    try {
      await cafeteriaService.orders.create({
        items: cart.map((c) => ({ product_id: c.product.id, quantity: c.qty, unit_price: c.product.price || c.product.unit_price })),
        total_amount: total,
      })
      toast({ title: "Order placed successfully" })
      setCart([])
    } catch {
      toast({ title: "Failed to place order", variant: "destructive" })
    } finally {
      setCheckingOut(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Point of Sale</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {loading ? (
            <p className="text-center text-muted-foreground">Loading...</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {filtered.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="rounded-lg border p-4 text-left hover:bg-muted/50 hover:border-primary/50 transition-all"
                >
                  <Coffee className="mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="font-medium text-sm truncate">{p.name}</p>
                  <p className="text-sm font-mono text-green-600">${Number(p.price || p.unit_price || 0).toFixed(2)}</p>
                </button>
              ))}
              {filtered.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">No products found</p>}
            </div>
          )}
        </div>

        <div>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" />Cart</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Cart is empty</p>
              ) : (
                <>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {cart.map((c) => {
                      const price = Number(c.product.price || c.product.unit_price || 0)
                      return (
                        <div key={c.product.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-medium">{c.product.name}</p>
                            <p className="text-xs text-muted-foreground">${price.toFixed(2)} each</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQty(c.product.id, -1)}><Minus className="h-3 w-3" /></Button>
                            <span className="w-6 text-center text-sm font-medium">{c.qty}</span>
                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQty(c.product.id, 1)}><Plus className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeFromCart(c.product.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span><span>${total.toFixed(2)}</span>
                    </div>
                    <Button className="w-full mt-3" size="lg" onClick={handleCheckout} disabled={checkingOut || cart.length === 0}>
                      {checkingOut ? "Processing..." : `Checkout $${total.toFixed(2)}`}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
