import { redirect } from "next/navigation"
export default async function LegacyStudentDetail({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; redirect(`/admin/students/${id}`) }
