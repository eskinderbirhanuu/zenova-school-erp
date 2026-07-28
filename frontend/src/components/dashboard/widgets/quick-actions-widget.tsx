"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FadeInUp } from "@/components/3d/micro-animations"
import { School, UserPlus, GitBranch, Calendar, TrendingUp, ArrowRight } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import type { WidgetProps } from "../types"

interface QuickActionLink {
  href: string
  label: string
  icon: LucideIcon
}

interface QuickActionsWidgetProps extends WidgetProps {
  links?: QuickActionLink[]
  title?: string
  description?: string
  icon?: LucideIcon
}

const DEFAULT_LINKS: QuickActionLink[] = [
  { href: "/admin/directors/new", label: "Add Director", icon: UserPlus },
  { href: "/admin/branches/new", label: "New Branch", icon: GitBranch },
  { href: "/admin/academic-years", label: "Manage Academic Years", icon: Calendar },
  { href: "/admin/reports", label: "View Reports", icon: TrendingUp },
]

export default function QuickActionsWidget({ links = DEFAULT_LINKS, title = "Quick Actions", description = "Frequently used management tasks", icon: TitleIcon = School }: QuickActionsWidgetProps) {
  return (
    <FadeInUp delay={0.6}>
      <Card shadow="default">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TitleIcon className="h-4 w-4 text-primary" /> {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {links.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2"><link.icon className="h-4 w-4" /> {link.label}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </FadeInUp>
  )
}
