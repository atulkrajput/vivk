import { getAdminSession } from '@/lib/admin'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAdminSession()

  if (!session) {
    redirect('/admin/login')
  }

  return (
    <div className="h-screen flex bg-vivk-bg overflow-hidden">
      <AdminSidebar userEmail={session.email} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
