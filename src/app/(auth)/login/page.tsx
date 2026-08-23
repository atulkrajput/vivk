'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, AlertCircle, Sparkles, Shield, Clock } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/chat'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        console.error('Login error:', result.error)
        setError('Invalid email or password. Please try again.')
      } else if (result?.ok) {
        router.push(callbackUrl)
        router.refresh()
      } else {
        setError('Login failed. Please try again.')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[45%] relative items-center justify-center p-12">
        <div className="relative max-w-md z-10">
          <div className="flex items-center mb-10">
            <Image src="/vivk_logo.png" alt="VIVK" width={247} height={85} className="h-[85px] w-auto" priority />
          </div>

          <h2 className="text-3xl font-bold text-vivk-navy mb-3 leading-tight">Welcome back</h2>
          <p className="text-slate-600 leading-relaxed mb-10">
            India&apos;s smartest AI workspace. Your intelligent companion for work, creativity, and learning.
          </p>

          {/* Feature highlights */}
          <div className="space-y-3">
            {[
              { icon: Sparkles, value: '10x', label: 'Faster content creation' },
              { icon: Shield, value: '70%', label: 'Lower cost than alternatives' },
              { icon: Clock, value: '24/7', label: 'Available anytime you need' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-100 shadow-vivk-sm">
                <div className="w-10 h-10 rounded-lg bg-vivk-blue/[0.08] flex items-center justify-center flex-shrink-0">
                  <stat.icon className="w-5 h-5 text-vivk-blue" />
                </div>
                <div>
                  <span className="text-lg font-bold text-vivk-navy">{stat.value}</span>
                  <span className="text-sm text-slate-500 ml-2">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex gap-6 text-xs text-slate-500">
            <div><span className="font-semibold text-vivk-navy">500+</span> users</div>
            <div className="w-px h-3.5 bg-slate-200 mt-0.5"></div>
            <div><span className="text-yellow-500">★</span> <span className="font-semibold text-vivk-navy">4.9</span> rating</div>
            <div className="w-px h-3.5 bg-slate-200 mt-0.5"></div>
            <div><span className="font-semibold text-vivk-navy">50+</span> businesses</div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center mb-8 lg:hidden">
            <Image src="/vivk_logo.png" alt="VIVK" width={247} height={85} className="h-[85px] w-auto" priority />
          </div>

          <h1 className="text-2xl font-bold text-vivk-navy mb-1">Sign in</h1>
          <p className="text-sm text-slate-500 mb-8">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-vivk-blue hover:text-blue-700 font-medium transition-colors">Create one</Link>
          </p>

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
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full vivk-input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">Password</label>
                <Link href="/reset-password" className="text-xs text-vivk-blue hover:text-blue-700 font-medium transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full vivk-input pr-10"
                  placeholder="Enter your password"
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full vivk-btn-primary py-3 text-sm"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400 text-center">
              Protected by enterprise-grade security. Your data stays private.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
