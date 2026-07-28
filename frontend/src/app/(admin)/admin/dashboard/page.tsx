"use client"

import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Plus, GitBranch } from "lucide-react"
import Link from "next/link"
import { useDashboardOverview, useDashboardTrends } from "@/hooks/queries"
import DashboardShell from "@/components/dashboard/dashboard-shell"
import SetupWizardBannerWidget from "@/components/dashboard/widgets/setup-wizard-banner-widget"
import KpiGridWidget from "@/components/dashboard/widgets/kpi-grid-widget"
import EnrollmentChartWidget from "@/components/dashboard/widgets/enrollment-chart-widget"
import RevenueChartWidget from "@/components/dashboard/widgets/revenue-chart-widget"
import ActivityFeedWidget from "@/components/dashboard/widgets/activity-feed-widget"
import QuickActionsWidget from "@/components/dashboard/widgets/quick-actions-widget"

export default function AdminDashboard() {
  const { data: overview, isLoading } = useDashboardOverview()
  const { data: trends } = useDashboardTrends()

  return (
    <DashboardShell
      isLoading={isLoading}
      header={
        <PageHeader
          title="Control Center"
          description="School overview and key metrics at a glance."
          actions={
            <>
              <Link href="/admin/directors/new">
                <Button variant="outline"><Plus className="h-4 w-4 mr-2" /> Add Director</Button>
              </Link>
              <Link href="/admin/branches/new">
                <Button><GitBranch className="h-4 w-4 mr-2" /> New Branch</Button>
              </Link>
            </>
          }
        />
      }
      widgets={[
        <SetupWizardBannerWidget key="setup" widgetId="setup-wizard-banner" />,
        <KpiGridWidget key="kpi" widgetId="kpi-grid" />,
        <div key="charts" className="grid gap-6 lg:grid-cols-2">
          <EnrollmentChartWidget widgetId="enrollment-chart" data={trends?.enrollment_trend} />
          <RevenueChartWidget widgetId="revenue-chart" data={trends?.revenue_trend} />
        </div>,
        <div key="bottom" className="grid gap-6 lg:grid-cols-7">
          <div className="lg:col-span-4">
            <ActivityFeedWidget widgetId="activity-feed" />
          </div>
          <div className="lg:col-span-3">
            <QuickActionsWidget widgetId="quick-actions" />
          </div>
        </div>,
      ]}
    />
  )
}
