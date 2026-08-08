import { createContext, useContext, useMemo, useState } from "react"
import type { ReactNode } from "react"

export type Language = "en" | "am"

const en = {
  appName: "ZENOVA",
  tagline: "Smart School • Limitless Possibilities",
  findSchool: "Find your school",
  searchPlaceholder: "Search by school name",
  orEnterManually: "or enter your school address manually",
  manualPlaceholder: "https://school.zenova.et",
  continue: "Continue",
  useThisSchool: "Use this school",
  signInTo: "Sign in to",
  email: "Email Address",
  employeeId: "Employee ID",
  emailPlaceholder: "you@school.com",
  employeeIdPlaceholder: "ZNV-XXX-XXXX",
  password: "Password",
  passwordPlaceholder: "Enter your password",
  signIn: "Sign In",
  signingIn: "Signing in...",
  or: "or",
  forgotPassword: "Forgot your password?",
  invalidCredentials: "Invalid credentials. Please try again.",
  ourPartners: "Our Partners",
  welcomeBack: "Welcome Back",
  signedIn: "Signed in",
  signOut: "Sign Out",
  selectSchool: "Select your school",
  noSchoolsFound: "No schools found. Try a different search or enter the address manually.",
  schoolRequired: "Select or enter your school first.",
  language: "English",
  languageShort: "EN",
  changeSchool: "Change school",
  entering: "Entering...",
}

const am: typeof en = {
  appName: "ZENOVA",
  tagline: "ብልህ ትምህርት ቤት • ያልተገደበ እድል",
  findSchool: "ትምህርት ቤትዎን ያግኙ",
  searchPlaceholder: "በትምህርት ቤት ስም ይፈልጉ",
  orEnterManually: "ወይም የትምህርት ቤቱን አድራሻ በእጅ ያስገቡ",
  manualPlaceholder: "https://school.zenova.et",
  continue: "ቀጥል",
  useThisSchool: "ይህንን ትምህርት ቤት ተጠቀም",
  signInTo: "ወደ ውስጥ ግባ",
  email: "የኢሜል አድራሻ",
  employeeId: "የሰራተኛ መለያ",
  emailPlaceholder: "you@school.com",
  employeeIdPlaceholder: "ZNV-XXX-XXXX",
  password: "የይለፍ ቃል",
  passwordPlaceholder: "የይለፍ ቃልዎን ያስገቡ",
  signIn: "ግባ",
  signingIn: "በመግባት ላይ...",
  or: "ወይም",
  forgotPassword: "የይለፍ ቃል ረስተዋል?",
  invalidCredentials: "የተሳሳተ የመግቢያ መረጃ። እባክዎ እንደገና ይሞክሩ።",
  ourPartners: "አጋሮቻችን",
  welcomeBack: "እንኳን ደህና መጡ",
  signedIn: "ገብተዋል",
  signOut: "ውጣ",
  selectSchool: "ትምህርት ቤትዎን ይምረጡ",
  noSchoolsFound: "ምንም ትምህርት ቤት አልተገኘም። በሌላ ስም ይፈልጉ ወይም አድራሻውን በእጅ ያስገቡ።",
  schoolRequired: "በመጀመሪያ ትምህርት ቤትዎን ይምረጡ ወይም ያስገቡ።",
  language: "አማርኛ",
  languageShort: "አማ",
  changeSchool: "ትምህርት ቤት ቀይር",
  entering: "በመግባት ላይ...",
}

const translations: Record<Language, typeof en> = { en, am }

interface I18nContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: keyof typeof en) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en")
  const value = useMemo(
    () => ({ language, setLanguage, t: (key: keyof typeof en) => translations[language][key] }),
    [language],
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used within I18nProvider")
  return ctx
}
