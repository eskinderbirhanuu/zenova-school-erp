"use client"

import dynamic from "next/dynamic"

export const DynamicAnimatedBackground = dynamic(
  () => import("@/components/3d/animated-background").then((m) => m.AnimatedBackground),
  { ssr: false },
)

export const DynamicGradientMeshBackground = dynamic(
  () => import("@/components/3d/gradient-mesh").then((m) => m.GradientMeshBackground),
  { ssr: false },
)
