"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface SetupData {
  mainKey: string
  branchKey: string
  schoolName: string
  schoolCode: string
  logoUrl: string
  country: string
  region: string
  city: string
  address: string
  phone: string
  email: string
  timezone: string
  adminFullName: string
  adminEmail: string
  adminPhone: string
  adminPassword: string
}

interface SetupContextType {
  data: SetupData
  update: (partial: Partial<SetupData>) => void
  reset: () => void
}

const defaultData: SetupData = {
  mainKey: "", branchKey: "",
  schoolName: "", schoolCode: "", logoUrl: "",
  country: "", region: "", city: "",
  address: "", phone: "", email: "", timezone: "",
  adminFullName: "", adminEmail: "", adminPhone: "", adminPassword: "",
}

const SetupContext = createContext<SetupContextType | undefined>(undefined)

export function SetupProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SetupData>(defaultData)

  const update = (partial: Partial<SetupData>) => setData(prev => ({ ...prev, ...partial }))
  const reset = () => setData(defaultData)

  return (
    <SetupContext.Provider value={{ data, update, reset }}>
      {children}
    </SetupContext.Provider>
  )
}

export function useSetup() {
  const ctx = useContext(SetupContext)
  if (!ctx) throw new Error("useSetup must be used within SetupProvider")
  return ctx
}
