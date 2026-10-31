'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Eye, EyeOff, AlertCircle, Shield } from 'lucide-react'

// Only allow redirects back into the admin panel
function getNextPath(): string {
  const next = new URLSearchParams(window.location.search).get('next')
  return next && /^\/admin(\/|$)/.test(next) && !next.startsWith('/admin/login') ? next : '/admin'
}

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (res.ok) {
        window.location.href = getNextPath()
        return
      }

      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Login failed. Please try again.')
    } catch {
      setError('An error occurred. Please try again.')
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-vivk-bg p-6">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-vivk-sm p-8">
        <Image src="/vivk_logo.png" alt="VIVK" width={124} height={43} className="h-[40px] w-auto" priority />
        <div className="flex items-center gap-1.5 mt-3 mb-6">
          <Shield className="w-3.5 h-3.5 text-vivk-violet" />
          <span className="text-xs font-semibold text-vivk-violet uppercase tracking-wide">Admin Panel</span>
        </div>

        <h1 className="text-2xl font-bold text-vivk-navy mb-1">Admin sign in</h1>
        <p className="text-sm text-slate-500 mb-6">Restricted to VIVK administrators.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-[12px] text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full vivk-input"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full vivk-input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="w-full vivk-btn-primary py-3 text-sm">
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
