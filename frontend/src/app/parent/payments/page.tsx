"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import api from "@/services/api";
import { useParentPaymentsDashboard } from "@/hooks/queries";
import { useFeatures } from "@/hooks/use-features";
import {
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Download,
  ArrowRight,
  Users,
} from "lucide-react";

interface ChildBalance {
  id: string;
  name: string;
  student_id: string;
  total_fees: number;
  paid_amount: number;
  outstanding_balance: number;
}

interface PaymentHistory {
  id: string;
  amount: number;
  method: string;
  date: string;
  status: string;
  receipt_id: string | null;
  receipt_number: string | null;
}

interface Invoice {
  id: string;
  student_id: string;
  invoice_number: string;
  student_name: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: string;
  due_date: string;
  lines: { description: string; amount: number }[];
}

interface DashboardData {
  parent_id: string;
  total_outstanding: number;
  total_paid: number;
  children: ChildBalance[];
  payment_history: PaymentHistory[];
  recent_invoices: Invoice[];
}

export default function ParentPaymentsPage() {
  const router = useRouter();
  const { data: _dashboard, isLoading: loading } = useParentPaymentsDashboard();
  const { isChapaEnabled } = useFeatures();
  const dashboard = _dashboard as DashboardData | null;
  const [, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("telebirr");

  const handlePayNow = async (invoice: Invoice) => {
    if (paymentMethod === "chapa" && !isChapaEnabled) {
      toast({ title: "Chapa is coming soon — please use another method." });
      return;
    }

    if (paymentMethod === "chapa") {
      try {
        const sessionRes = await api.post("/parent-payments/create-session", null, {
          params: {
            student_id: invoice.student_id,
            amount: parseFloat(paymentAmount) || invoice.balance,
            payment_method: paymentMethod,
            invoice_id: invoice.id,
          },
        });

        const { session_id } = sessionRes.data;

        const initRes = await api.post(`/parent-payments/chapa/initialize?session_id=${session_id}`);
        const { checkout_url } = initRes.data;

        if (checkout_url) {
          window.location.assign(checkout_url);
        }
      } catch {
        toast({ title: "Failed to create payment session", variant: "destructive" });
      }
      return;
    }

    toast({ title: `Coming soon: ${paymentMethod} payments. Check back later.` });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "partial":
        return "bg-yellow-100 text-yellow-800";
      case "pending":
        return "bg-blue-100 text-blue-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Payment Center</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ETB {dashboard?.total_outstanding.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Across all children</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ETB {dashboard?.total_paid.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">This academic year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Children</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.children.length}</div>
            <p className="text-xs text-muted-foreground">Enrolled students</p>
          </CardContent>

        </Card>
      </div>

      <Tabs defaultValue="invoices" className="space-y-6">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
          <TabsTrigger value="children">Children</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Outstanding Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboard?.recent_invoices.map((invoice: any) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{invoice.invoice_number}</span>
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {invoice.student_name} • Due {new Date(invoice.due_date).toLocaleDateString()}
                      </p>
                      <div className="text-sm">
                        {invoice.lines.map((line: any, idx: number) => (
                          <span key={idx} className="text-muted-foreground">
                            {line.description}: ETB {line.amount.toLocaleString()}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="text-lg font-bold">
                        ETB {invoice.balance.toLocaleString()}
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" onClick={() => setSelectedInvoice(invoice)}>
                            Pay Now
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Make Payment</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Amount (ETB)</label>
                              <input
                                type="number"
                                className="w-full p-2 border rounded"
                                defaultValue={invoice.balance}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Payment Method</label>
                              <select
                                className="w-full p-2 border rounded"
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                              >
                                {isChapaEnabled ? (
                                  <option value="chapa">Chapa</option>
                                ) : (
                                  <option value="chapa" disabled>Chapa — Coming Soon</option>
                                )}
                                <option value="telebirr">Telebirr</option>
                                <option value="cbe">CBE Birr</option>
                                <option value="cash">Cash</option>
                                <option value="bank">Bank Transfer</option>
                              </select>
                            </div>
                            <Button
                              className="w-full"
                              onClick={() => handlePayNow(invoice)}
                            >
                              Proceed to Payment
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboard?.payment_history.map((payment: any) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-medium">
                          ETB {payment.amount.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {payment.method} • {new Date(payment.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {payment.receipt_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              const res = await api.get(`/parent-payments/receipts/${payment.receipt_id}/download`);
                              const receipt = res.data;
                              toast({ title: `Receipt: ${receipt.receipt_number} - ETB ${receipt.amount}` });
                            } catch {
                              toast({ title: "Failed to download receipt", variant: "destructive" });
                            }
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Receipt
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="children">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboard?.children.map((child: any) => (
              <Card key={child.id}>
                <CardHeader>
                  <CardTitle>{child.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Fees</span>
                    <span className="font-medium">
                      ETB {child.total_fees.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Paid</span>
                    <span className="font-medium text-green-600">
                      ETB {child.paid_amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Outstanding</span>
                    <span className="font-medium text-red-600">
                      ETB {child.outstanding_balance.toLocaleString()}
                    </span>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => router.push(`/parent/payments/${child.id}`)}
                  >
                    View Details
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
