'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { AlertCircle, CheckCircle, ArrowLeft, KeyRound } from 'lucide-react'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [mode, setMode] = useState<'request' | 'reset'>('request')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  useEffect(() => {
    if (token) {
      fetch(`/api/auth/reset-password?token=${token}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setMode('reset')
          } else {
            setError('Invalid or expired reset link. Please request a new one.')
          }
        })
        .catch(() => {
          setError('Error verifying reset link. Please try again.')
        })
    }
  }, [token])

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(data.message)
        if (data.resetLink) {
          setSuccess(`${data.message}\n\nDevelopment link: ${data.resetLink}`)
        }
      } else {
        setError(data.error || 'Failed to send reset email. Please try again.')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(data.message)
        setTimeout(() => router.push('/login'), 2000)
      } else {
        setError(data.error || 'Failed to reset password. Please try again.')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center mb-8">
          <Image src="/vivk_logo.png" alt="VIVK" width={36} height={36} priority />
        </div>

        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-vivk-blue/[0.08] flex items-center justify-center mb-5">
          <KeyRound className="w-6 h-6 text-vivk-blue" />
        </div>

        <h1 className="text-2xl font-bold text-vivk-navy mb-1">
          {mode === 'request' ? 'Reset your password' : 'Set new password'}
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          {mode === 'request'
            ? 'Enter your email and we\'ll send you a reset link.'
            : 'Choose a new password for your account.'
          }
        </p>
        
        {mode === 'request' ? (
          <form onSubmit={handleRequestReset} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-[12px] text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
            
            {success && (
              <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-100 rounded-[12px] text-sm text-emerald-700 whitespace-pre-line">
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email address
              </label>
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
              <p className="mt-1.5 text-xs text-slate-400">
                We&apos;ll send you a link to reset your password
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full vivk-btn-primary py-3 text-sm"
            >
              {isLoading ? 'Sending...' : 'Send reset link'}
            </button>

            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-vivk-navy font-medium transition-colors pt-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </Link>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-[12px] text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
            
            {success && (
              <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-100 rounded-[12px] text-sm text-emerald-700">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                {success}
              </div>
            )}
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                New Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full vivk-input"
                placeholder="Enter new password"
              />
              <p className="mt-1.5 text-xs text-slate-400">
                Must be at least 8 characters with uppercase, lowercase, and number
              </p>
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full vivk-input"
                placeholder="Confirm new password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full vivk-btn-primary py-3 text-sm"
            >
              {isLoading ? 'Updating...' : 'Update password'}
            </button>

            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-vivk-navy font-medium transition-colors pt-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
