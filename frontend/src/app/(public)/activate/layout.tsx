import { SetupProvider } from "@/services/setup-context"

export default function ActivateLayout({ children }: { children: React.ReactNode }) {
  return <SetupProvider><div className="min-h-screen">{children}</div></SetupProvider>
}
