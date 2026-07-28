"use client"

import { FadeInUp } from "@/components/3d/micro-animations"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useSetupWizardStatus } from "@/hooks/queries"
import type { WidgetProps } from "../types"

export default function SetupWizardBannerWidget({ widgetId }: WidgetProps) {
  const { data: wizard } = useSetupWizardStatus()

  if (!wizard || wizard.all_done) return null

  const missingSteps = Object.entries(wizard.steps)
    .filter(([, v]) => !v)
    .map(([k]) => k.replace(/_/g, " "))

  return (
    <FadeInUp>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="font-medium text-amber-800">Setup incomplete</p>
          <p className="text-sm text-amber-700 mt-1">
            Missing: {missingSteps.join(", ")}.
          </p>
        </div>
        <Link href="/admin/setup">
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">Complete Setup</Button>
        </Link>
      </div>
    </FadeInUp>
  )
}
