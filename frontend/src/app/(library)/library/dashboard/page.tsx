"use client"

import { KPICard } from "@/components/ui/kpi-card"
import { SectionHeader } from "@/components/ui/section-header"
import { PageHeader } from "@/components/ui/page-header"
import { useBooks, useBorrowings } from "@/hooks/queries"
import { BookOpen, ArrowUp, ArrowDown, DollarSign, BarChart3, BookPlus, ClipboardCheck, Users } from "lucide-react"

import DashboardShell from "@/components/dashboard/dashboard-shell"
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/3d/micro-animations"
import AreaChartCard from "@/components/dashboard/area-chart-card"
import FeedCard from "@/components/dashboard/feed-card"
import PlaceholderCard from "@/components/dashboard/placeholder-card"
import QuickActionsWidget from "@/components/dashboard/widgets/quick-actions-widget"
import ChartsGrid from "@/components/dashboard/charts-grid"

const borrowTrend = [
  { day: "Mon", borrowed: 12, returned: 8 },
  { day: "Tue", borrowed: 19, returned: 15 },
  { day: "Wed", borrowed: 15, returned: 10 },
  { day: "Thu", borrowed: 22, returned: 18 },
  { day: "Fri", borrowed: 18, returned: 12 },
  { day: "Sat", borrowed: 5, returned: 3 },
]

const recentLibrary = [
  { action: "Book borrowed", book: "The Great Gatsby", time: "10 min ago", badge: "success" as const },
  { action: "Book returned", book: "1984", time: "25 min ago", badge: "info" as const },
  { action: "Overdue notice", book: "To Kill a Mockingbird", time: "1 hour ago", badge: "warning" as const },
  { action: "New book added", book: "Sapiens", time: "2 hours ago", badge: "purple" as const },
  { action: "Fine collected", book: "The Catcher in the Rye", time: "3 hours ago", badge: "success" as const },
]

export default function LibraryDashboard() {
  const { data: books } = useBooks({ limit: 1 })
  const { data: borrowings } = useBorrowings({ limit: 1 })

  const bookCount = Array.isArray(books) ? books.length : 0
  const borrowedCount = Array.isArray(borrowings) ? borrowings.length : 0
  const available = bookCount - borrowedCount

  return (
    <DashboardShell
      header={
        <FadeInUp>
          <PageHeader title="Library Hub" description="Catalogue, borrowings, and circulation management." />
        </FadeInUp>
      }
      widgets={[
        <StaggerContainer key="kpi">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StaggerItem><KPICard title="Total Books" value={bookCount} icon={BookOpen} trend={{ value: "+24", positive: true }} /></StaggerItem>
            <StaggerItem><KPICard title="Currently Borrowed" value={borrowedCount} icon={ArrowUp} trend={{ value: "+5", positive: true }} accentColor="bg-amber-500" /></StaggerItem>
            <StaggerItem><KPICard title="Available" value={available} icon={ArrowDown} trend={{ value: "-3", positive: false }} /></StaggerItem>
            <StaggerItem><KPICard title="Overdue Fines" value="$0.00" icon={DollarSign} trend={{ value: "0", positive: true }} /></StaggerItem>
          </div>
        </StaggerContainer>,
        <FadeInUp delay={0.2} key="section"><SectionHeader title="Circulation Analytics" description="Daily borrowing and returns" /></FadeInUp>,
        <ChartsGrid key="charts">
          <AreaChartCard
            title="Borrowing Trend"
            description="Books borrowed and returned this week"
            data={borrowTrend}
            xKey="day"
            series={[
              { dataKey: "borrowed", name: "Borrowed", color: "hsl(var(--primary))" },
              { dataKey: "returned", name: "Returned", color: "hsl(var(--chart-2))" },
            ]}
            delay={0.3}
            height={250}
            icon={BarChart3}
          />
          <FeedCard
            title="Recent Activity"
            description="Latest library events"
            items={recentLibrary.map((a) => ({
              label: a.action,
              detail: `${a.book} — ${a.time}`,
              icon: BookOpen,
              badge: {
                text: a.badge === "success" ? "Success" : a.badge === "warning" ? "Pending" : a.badge === "purple" ? "Update" : "Info",
                variant: a.badge,
              },
            }))}
            icon={ClipboardCheck}
            delay={0.4}
          />
        </ChartsGrid>,
        <ChartsGrid key="more">
          <PlaceholderCard title="Member Stats" description="Active library members this month" icon={Users} />
          <QuickActionsWidget
            title="Quick Actions"
            description="Common library tasks"
            icon={BookPlus}
            links={[
              { href: "/library/books", label: "Add Book", icon: BookPlus },
              { href: "/library/borrow", label: "Borrow Book", icon: ClipboardCheck },
              { href: "/library/returns", label: "Process Return", icon: ArrowDown },
            ]}
          />
        </ChartsGrid>,
      ]}
    />
  )
}
