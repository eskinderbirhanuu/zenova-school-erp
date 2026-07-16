"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { usePaymentSession } from "@/hooks/queries";
import { CheckCircle, Receipt, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const { data: session, isLoading: loading, refetch } = usePaymentSession(sessionId || undefined);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!session || session.receipt_id) return;
    let attempts = 0;
    const maxAttempts = 3;
    const interval = setInterval(async () => {
      attempts++;
      const { data } = await refetch();
      if (data?.receipt_id || attempts >= maxAttempts) {
        clearInterval(interval);
        if (data?.receipt_id) {
          toast({ title: "Receipt ready" });
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [session?.receipt_id, refetch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">No Session Found</h2>
            <p className="text-muted-foreground mb-6">No payment session was provided.</p>
            <Link href="/parent/payments">
              <Button>Back to Payments</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-lg mx-auto text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-100 p-4">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-green-700">Payment Successful!</h1>
        <p className="text-muted-foreground">Your payment has been processed successfully.</p>

        {session && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-left">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Session ID</span>
                <span className="font-mono text-sm">{session.session_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Student</span>
                <span className="font-medium">{session.student_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice</span>
                <span className="font-medium">{session.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="font-bold text-lg">
                  ETB {session.amount.toLocaleString()}
                </span>
              </div>
              {session.receipt_number && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Receipt</span>
                  <span className="font-medium">{session.receipt_number}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {session && !session.receipt_id && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Waiting for receipt...
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {session?.receipt_id && (
            <Link href="/parent/receipts">
              <Button>
                <Receipt className="h-4 w-4 mr-2" />
                View Receipt
              </Button>
            </Link>
          )}
          <Link href="/parent/payments">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Payments
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
