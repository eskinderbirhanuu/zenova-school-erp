"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ShieldAlert } from "lucide-react"

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <ShieldAlert className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Access Denied</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            You do not have permission to access this area. Please contact your administrator.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Link href="/login"><Button className="w-full">Back to Login</Button></Link>
        </CardContent>
      </Card>
    </div>
  )
}
