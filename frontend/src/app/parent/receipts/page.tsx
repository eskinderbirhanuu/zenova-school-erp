"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import api from "@/services/api";
import { useReceipts } from "@/hooks/queries";
import { Receipt, Download, ArrowLeft, FileText } from "lucide-react";

interface ReceiptItem {
  id: string;
  receipt_number: string;
  amount_paid: number;
  payment_method: string;
  payment_date: string;
  status: string;
  transaction_id: string;
}

export default function ReceiptsPage() {
  const { data: receipts, isLoading: loading } = useReceipts();

  const handleDownload = async (receiptId: string) => {
    try {
      const res = await api.get(`/parent-payments/receipts/${receiptId}/download`);
      const data = res.data;
      toast({
        title: `Receipt: ${data.receipt_number} — ETB ${data.amount_paid.toLocaleString()}`,
      });
    } catch {
      toast({ title: "Failed to download receipt", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      paid: "bg-green-100 text-green-800",
      completed: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      failed: "bg-red-100 text-red-800",
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
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/parent/payments">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Receipts</h1>
        </div>
        <Receipt className="h-8 w-8 text-muted-foreground" />
      </div>

      {(receipts ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Receipts Yet</h2>
            <p className="text-muted-foreground mb-6">
              You have no payment receipts yet. Make a payment to receive one.
            </p>
            <Link href="/parent/payments">
              <Button>Make a Payment</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {(receipts ?? []).map((receipt: any) => (
            <Card key={receipt.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{receipt.receipt_number}</span>
                      <Badge className={getStatusBadge(receipt.status)}>
                        {receipt.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {receipt.payment_method} •{" "}
                      {new Date(receipt.payment_date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      TXN: {receipt.transaction_id}
                    </p>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="text-lg font-bold">
                      ETB {receipt.amount_paid.toLocaleString()}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(receipt.id)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
