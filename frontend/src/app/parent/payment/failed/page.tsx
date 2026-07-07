"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { XCircle, AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";

interface SessionDetails {
  session_id: string;
  status: string;
  error_message: string | null;
  amount: number;
  student_name: string;
}

export default function PaymentFailedPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const [session, setSession] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await api.get(`/parent-payments/session/${sessionId}`);
        setSession(res.data);
      } catch {
        toast.error("Failed to load session details");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  const handleRetry = () => {
    window.location.href = "/parent/payments";
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
      <div className="max-w-lg mx-auto text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 p-4">
            <XCircle className="h-16 w-16 text-red-600" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-red-700">Payment Failed</h1>
        <p className="text-muted-foreground">
          Unfortunately, your payment could not be processed.
        </p>

        {session && (
          <Card>
            <CardHeader>
              <CardTitle>Error Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-left">
              {session.session_id && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Session ID</span>
                  <span className="font-mono text-sm">{session.session_id}</span>
                </div>
              )}
              {session.student_name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Student</span>
                  <span className="font-medium">{session.student_name}</span>
                </div>
              )}
              {session.amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">ETB {session.amount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize">{session.status}</span>
              </div>
              {session.error_message && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                    <span className="text-sm text-red-700">{session.error_message}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!session && sessionId && (
          <Card>
            <CardContent className="py-6">
              <p className="text-muted-foreground">
                Session <span className="font-mono text-sm">{sessionId}</span> was not found or has expired.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={handleRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/parent/payments">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Payments
            </Link>
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          If the problem persists, please contact{" "}
          <a href="mailto:support@zenova.app" className="text-primary underline">
            support@zenova.app
          </a>
        </p>
      </div>
    </div>
  );
}
