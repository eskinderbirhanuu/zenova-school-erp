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
  schoolId: "Enter School ID",
  schoolIdPlaceholder: "e.g. OMEGA or omega.zenova.et",
  resolveSchool: "Resolve school",
  resolving: "Resolving...",
  schoolNotFound: "School not found. Check the ID or search by name below.",
  resolveError: "Could not resolve school. Check your connection.",
  updateRequiredTitle: "Update required",
  updateRequired: "This version of ZENOVA is no longer supported. Please update the app to continue.",
  maintenanceMode: "ZENOVA is undergoing maintenance. Please try again later.",
  appVersion: "Version",
  mfaCode: "Verification code",
  mfaCodePlaceholder: "6-digit code",
  verify: "Verify",
  verifying: "Verifying...",
  invalidMfaCode: "Invalid code. Please try again.",
  mfaHint: "Enter the 6-digit code from your authenticator app.",
  backToLogin: "Back to sign in",
  dashboard: "Dashboard",
  roleParent: "Parent",
  roleStudent: "Student",
  roleTeacher: "Teacher",
  roleAdmin: "Administrator",
  featureAttendance: "Attendance",
  featureResults: "Results",
  featureExams: "Exams",
  featureFees: "Fees",
  featureChildren: "Children",
  featureSchedule: "Schedule",
  featureAnnouncements: "Announcements",
  featureMessages: "Messages",
  featureLibrary: "Library",
  featureCafeteria: "Cafeteria",
  featureComingSoon: "Coming soon",
  signedInAs: "Signed in as",
  menuMyChildren: "My children",
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
  schoolId: "የትምህርት ቤት መለያ ያስገቡ",
  schoolIdPlaceholder: "ለምሳሌ OMEGA ወይም omega.zenova.et",
  resolveSchool: "ትምህርት ቤት ፈልግ",
  resolving: "በመፈለግ ላይ...",
  schoolNotFound: "ትምህርት ቤት አልተገኘም። መለያውን ያረጋግጡ ወይም በስም ይፈልጉ።",
  resolveError: "ትምህርት ቤቱን መፈለግ አልተቻለም። ግንኙነትዎን ያረጋግጡ።",
  updateRequiredTitle: "ማዘመን ያስፈልጋል",
  updateRequired: "ይህ የ ZENOVA ስሪት ከእንግዲህ አይደገፍም። ለመቀጠል እባክዎ መተግበሪያውን ያዘምኑ።",
  maintenanceMode: "ZENOVA ጥገና እየተደረገበት ነው። እባክዎ በኋላ ይሞክሩ።",
  appVersion: "ስሪት",
  mfaCode: "የማረጋገጫ ኮድ",
  mfaCodePlaceholder: "ባለ 6 አሃዝ ኮድ",
  verify: "አረጋግጥ",
  verifying: "በማረጋገጥ ላይ...",
  invalidMfaCode: "የተሳሳተ ኮድ። እባክዎ እንደገና ይሞክሩ።",
  mfaHint: "ከ authenticator መተግበሪያዎ ባለ 6 አሃዝ ኮድ ያስገቡ።",
  backToLogin: "ወደ መግቢያ ተመለስ",
  dashboard: "ዳሽቦርድ",
  roleParent: "ወላጅ",
  roleStudent: "ተማሪ",
  roleTeacher: "መምህር",
  roleAdmin: "አስተዳዳሪ",
  featureAttendance: "መገኘት",
  featureResults: "ውጤቶች",
  featureExams: "ፈተናዎች",
  featureFees: "ክፍያዎች",
  featureChildren: "ልጆች",
  featureSchedule: "መርሃ ግብር",
  featureAnnouncements: "ማስታወቂያዎች",
  featureMessages: "መልዕክቶች",
  featureLibrary: "ቤተ-መጻሕፍት",
  featureCafeteria: "ካፊቴሪያ",
  featureComingSoon: "በቅርቡ",
  signedInAs: "የገቡት በ",
  menuMyChildren: "ልጆቼ",
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
