'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Code2,
  Key,
  AlertTriangle,
  Settings,
  LogOut,
  BarChart3,
  Shield,
} from 'lucide-react'

interface AdminSidebarProps {
  userEmail: string
}

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/admin/tracking', label: 'Tracking Codes', icon: Code2 },
  { href: '/admin/plans', label: 'Plan Management', icon: BarChart3 },
  { href: '/admin/ai-keys', label: 'AI Keys', icon: Key },
  { href: '/admin/errors', label: 'Errors & Usage', icon: AlertTriangle },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminSidebar({ userEmail }: AdminSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0">
      {/* Header */}
      <div className="px-5 py-5 border-b border-slate-100">
        <Link href="/admin" className="flex items-center gap-3">
          <Image src="/vivk_logo.png" alt="VIVK" width={124} height={43} className="h-[36px] w-auto" />
        </Link>
        <div className="flex items-center gap-1.5 mt-2">
          <Shield className="w-3 h-3 text-vivk-violet" />
          <span className="text-[11px] font-semibold text-vivk-violet uppercase tracking-wide">Admin Panel</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-vivk-blue/[0.08] text-vivk-blue'
                    : 'text-slate-600 hover:text-vivk-navy hover:bg-slate-50'
                }`}
              >
                <item.icon className={`w-4 h-4 ${active ? 'text-vivk-blue' : 'text-slate-400'}`} />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-100 p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-vivk-gradient flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">
              {userEmail.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-vivk-navy truncate">{userEmail}</p>
            <p className="text-[10px] text-slate-400">Administrator</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
