import { redirect } from "next/navigation"
export default function LegacyStudentDetail({ params }: { params: { id: string } }) { redirect(`/admin/students/${params.id}`) }
