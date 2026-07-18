"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Building, Users, Palette, Printer, ArrowRight, CheckCircle2 } from "lucide-react"
import Link from "next/link"

const SETUP_STEPS = [
  { title: "Create Departments", description: "Set up your organizational structure", href: "/corporate/departments/new", icon: Building },
  { title: "Add Employees", description: "Register your corporate employees", href: "/corporate/employees/new", icon: Users },
  { title: "Design Cards", description: "Customize NFC card appearance", href: "/corporate/card-design", icon: Palette },
  { title: "Print Cards", description: "Generate and print employee cards", href: "/corporate/card-printing", icon: Printer },
]

export default function CorporateSetupPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Corporate Setup Wizard"
        description="Configure your corporate account — departments, employees, and card access"
      />
      <div className="grid gap-6 md:grid-cols-2">
        {SETUP_STEPS.map((step, i) => (
          <Card key={step.href}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {i + 1}
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <step.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
              <CardTitle className="mt-4 text-lg">{step.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full gap-2">
                <Link href={step.href}>
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-base">Quick Tips</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Departments help organize employees by function (e.g. Finance, HR, Operations)</p>
          <p>• Each employee needs a department before a card can be issued</p>
          <p>• Card designs support your school logo, colors, and layout preferences</p>
          <p>• Printed cards use NFC technology for secure access control</p>
        </CardContent>
      </Card>
    </div>
  )
}
