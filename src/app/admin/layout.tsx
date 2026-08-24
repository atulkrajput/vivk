import { auth } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user?.email) {
    redirect('/login')
  }

  if (!isAdminEmail(session.user.email)) {
    redirect('/chat')
  }

  return (
    <div className="h-screen flex bg-vivk-bg overflow-hidden">
      <AdminSidebar userEmail={session.user.email} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
