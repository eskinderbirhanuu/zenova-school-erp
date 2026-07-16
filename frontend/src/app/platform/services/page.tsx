"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import api from "@/services/api";
import { usePlatformDashboard } from "@/hooks/queries";
import {
  CreditCard,
  Receipt,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  FileText,
  Building2,
} from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function PlatformServicesPage() {
  const { data: _dashboard, isLoading: loading } = usePlatformDashboard();
  const dashboard = _dashboard as any;
  const [paying, setPaying] = useState(false);

  const handlePayNow = async (invoiceId: string) => {
    setPaying(true);
    try {
      const response = await api.post(`/platform/invoice/${invoiceId}/pay`);
      const { checkout_url } = response.data;
      if (checkout_url) {
        window.location.href = checkout_url;
      } else {
        toast({ title: "No checkout URL returned", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to initialize payment", variant: "destructive" });
    } finally {
      setPaying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      paid: "bg-green-100 text-green-800",
      pending: "bg-blue-100 text-blue-800",
      invoiced: "bg-yellow-100 text-yellow-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Building2 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Platform Services</h1>
          <p className="text-muted-foreground">
            {MONTHS[dashboard.current_month - 1]} {dashboard.current_year}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Month Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.transactions_this_month}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fee Per Transaction</CardTitle>
            <CreditCard className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">ETB {dashboard?.platform_fee_per_transaction}</div>
            <p className="text-xs text-muted-foreground">Platform commission</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount Due</CardTitle>
            <Receipt className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ETB {dashboard?.total_due.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboard?.pending_fees} pending {dashboard?.pending_fees === 1 ? "fee" : "fees"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Current Invoice */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Current Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          {dashboard?.current_invoice ? (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{dashboard.current_invoice.invoice_number}</span>
                  <Badge className={getStatusBadge(dashboard.current_invoice.status)}>
                    {dashboard.current_invoice.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {dashboard.current_invoice.transaction_count} transactions
                </p>
              </div>
              <div className="text-right space-y-2">
                <div className="text-lg font-bold">
                  ETB {dashboard.current_invoice.total_amount.toLocaleString()}
                </div>
                {dashboard.current_invoice.status === "pending" && (
                  <Button
                    size="sm"
                    onClick={() => handlePayNow(dashboard.current_invoice!.id)}
                    disabled={paying}
                  >
                    {paying ? "Redirecting..." : "Pay Now"}
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Invoice Yet</h3>
              <p className="text-muted-foreground">
                An invoice will be generated at the end of the month based on your transaction volume.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          {dashboard?.invoice_history && dashboard.invoice_history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-3 font-medium">Invoice</th>
                    <th className="pb-3 font-medium">Month / Year</th>
                    <th className="pb-3 font-medium text-right">Transactions</th>
                    <th className="pb-3 font-medium text-right">Total Amount</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Paid At</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.invoice_history.map((inv: any) => (
                    <tr key={inv.id} className="border-b last:border-0">
                      <td className="py-3 font-medium">{inv.invoice_number}</td>
                      <td className="py-3">
                        {MONTHS[inv.month - 1]} {inv.year}
                      </td>
                      <td className="py-3 text-right">{inv.transaction_count}</td>
                      <td className="py-3 text-right font-medium">
                        ETB {inv.total_amount.toLocaleString()}
                      </td>
                      <td className="py-3">
                        <Badge className={getStatusBadge(inv.status)}>
                          {inv.status === "paid" ? (
                            <CheckCircle className="h-3 w-3 mr-1 inline" />
                          ) : inv.status === "pending" ? (
                            <Clock className="h-3 w-3 mr-1 inline" />
                          ) : (
                            <AlertCircle className="h-3 w-3 mr-1 inline" />
                          )}
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-sm text-muted-foreground">
                        {inv.paid_at
                          ? new Date(inv.paid_at).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Invoices Yet</h3>
              <p className="text-muted-foreground">
                Invoices will appear here once your first monthly billing cycle completes.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
