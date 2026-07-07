"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import api from "@/services/api";
import {
  TrendingUp,
  Banknote,
  FileText,
  CheckCircle,
  Clock,
  Building2,
  DollarSign,
  ArrowUpDown,
  Layers,
} from "lucide-react";

interface SchoolRanking {
  school_id: string;
  school_name: string;
  transactions: number;
  revenue: number;
}

interface AdminDashboardData {
  month: number;
  year: number;
  total_transactions: number;
  pending_fees: number;
  invoiced_fees: number;
  paid_fees: number;
  total_revenue: number;
  school_rankings: SchoolRanking[];
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function PlatformAdminPage() {
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get("/platform/admin/dashboard");
      setDashboard(response.data);
    } catch {
      toast({ title: "Failed to load platform admin dashboard", variant: "destructive" });
    } finally {
      setLoading(false);
    }
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
        <Layers className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Platform Revenue</h1>
          <p className="text-muted-foreground">
            {MONTHS[dashboard!.month - 1]} {dashboard!.year}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.total_transactions}</div>
            <p className="text-xs text-muted-foreground">Current month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Fees</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              ETB {dashboard?.pending_fees.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting invoicing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoiced Fees</CardTitle>
            <FileText className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ETB {dashboard?.invoiced_fees.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Fees</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ETB {dashboard?.paid_fees.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              ETB {dashboard?.total_revenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">All time this month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            School Rankings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dashboard?.school_rankings && dashboard.school_rankings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-3 font-medium">#</th>
                    <th className="pb-3 font-medium">School</th>
                    <th className="pb-3 font-medium text-right">
                      <span className="inline-flex items-center gap-1">
                        <ArrowUpDown className="h-3 w-3" />
                        Transactions
                      </span>
                    </th>
                    <th className="pb-3 font-medium text-right">
                      <span className="inline-flex items-center gap-1">
                        <Banknote className="h-3 w-3" />
                        Revenue
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.school_rankings.map((school, index) => (
                    <tr key={school.school_id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3">
                        <Badge
                          variant={index < 3 ? "default" : "outline"}
                          className={index === 0 ? "bg-yellow-100 text-yellow-800" : index === 1 ? "bg-gray-200 text-gray-800" : index === 2 ? "bg-orange-100 text-orange-800" : ""}
                        >
                          {index + 1}
                        </Badge>
                      </td>
                      <td className="py-3 font-medium">{school.school_name}</td>
                      <td className="py-3 text-right">{school.transactions}</td>
                      <td className="py-3 text-right font-medium">
                        ETB {school.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No School Data</h3>
              <p className="text-muted-foreground">
                No transaction data available for the current month.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
