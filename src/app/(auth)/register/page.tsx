'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1', country: 'USA', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+7', country: 'Russia', flag: '🇷🇺' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷' },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
  { code: '+66', country: 'Thailand', flag: '🇹🇭' },
  { code: '+62', country: 'Indonesia', flag: '🇮🇩' },
  { code: '+63', country: 'Philippines', flag: '🇵🇭' },
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
  { code: '+92', country: 'Pakistan', flag: '🇵🇰' },
  { code: '+94', country: 'Sri Lanka', flag: '🇱🇰' },
  { code: '+977', country: 'Nepal', flag: '🇳🇵' },
]

const planLabels: Record<string, string> = {
  free: 'Free Plan',
  pro: 'Pro Plan — ₹999/mo',
  business: 'Business Plan — ₹4,999/mo',
}

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    countryCode: '+91',
    address: '',
    password: '',
    confirmPassword: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedPlan, setSelectedPlan] = useState('free')
  const [step, setStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const emailParam = searchParams.get('email')
    const planParam = searchParams.get('plan')
    if (emailParam) setFormData(prev => ({ ...prev, email: decodeURIComponent(emailParam) }))
    if (planParam && ['free', 'pro', 'business'].includes(planParam)) setSelectedPlan(planParam)
  }, [searchParams])

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const canProceedStep1 = formData.fullName.length >= 2 && formData.email.includes('@') && formData.phone.length >= 6
  const canProceedStep2 = formData.password.length >= 8 && formData.password === formData.confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step === 1) {
      if (canProceedStep1) setStep(2)
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await response.json()

      if (response.ok) {
        setSuccess(data.message)
        setTimeout(() => router.push('/login'), 2000)
      } else if (response.status === 503) {
        setError('Service is currently being set up. Please try again in a few minutes.')
      } else {
        setError(data.error || 'Registration failed. Please try again.')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass = "w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 focus:bg-white/[0.05] transition placeholder-gray-600"

  return (
    <div className="min-h-screen flex bg-[#0a0a12]">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 via-transparent to-blue-600/10"></div>
        <div className="absolute top-20 -left-20 w-80 h-80 bg-orange-500/8 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-blue-500/8 rounded-full blur-[100px]"></div>

        <div className="relative max-w-md">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <span className="text-white text-sm font-bold">V</span>
            </div>
            <span className="text-2xl font-bold text-white tracking-wide">VIVK</span>
          </div>

          <h2 className="text-3xl font-bold text-white mb-3 leading-tight">Start your AI journey</h2>
          <p className="text-gray-500 leading-relaxed mb-10">
            Join thousands of Indian businesses and individuals using VIVK to work smarter every day.
          </p>

          <div className="space-y-4">
            {[
              { icon: '✍️', title: 'Create content in minutes', desc: 'Blog posts, emails, social media' },
              { icon: '💼', title: 'Automate business tasks', desc: 'Contracts, reports, presentations' },
              { icon: '💻', title: 'Get coding assistance', desc: 'Debug, explain, and write code' },
              { icon: '🇮🇳', title: 'Built for India', desc: 'Indian context, culture, and languages' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <span className="text-lg mt-0.5">{item.icon}</span>
                <div>
                  <p className="text-sm font-medium text-gray-300">{item.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex gap-6 text-xs text-gray-600">
            <div><span className="text-white font-semibold">500+</span> users</div>
            <div className="w-px h-3.5 bg-white/10 mt-0.5"></div>
            <div><span className="text-yellow-400">★</span> <span className="text-white font-semibold">4.9</span> rating</div>
            <div className="w-px h-3.5 bg-white/10 mt-0.5"></div>
            <div><span className="text-white font-semibold">50+</span> businesses</div>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <span className="text-white text-xs font-bold">V</span>
            </div>
            <span className="text-lg font-bold text-white">VIVK</span>
          </div>

          <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
          <p className="text-sm text-gray-500 mb-6">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Sign in</Link>
          </p>

          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-white/[0.06] text-gray-500'}`}>1</div>
              <span className={`text-xs font-medium ${step >= 1 ? 'text-gray-300' : 'text-gray-600'}`}>Personal Info</span>
            </div>
            <div className={`flex-1 h-px ${step >= 2 ? 'bg-blue-600' : 'bg-white/[0.06]'} transition-colors`}></div>
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-white/[0.06] text-gray-500'}`}>2</div>
              <span className={`text-xs font-medium ${step >= 2 ? 'text-gray-300' : 'text-gray-600'}`}>Security</span>
            </div>
          </div>

          {selectedPlan !== 'free' && (
            <div className="mb-5 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-blue-400 flex items-center gap-2">
              <span>🎯</span> Selected: <strong>{planLabels[selectedPlan]}</strong>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-sm text-green-400">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                {success}
              </div>
            )}

            {step === 1 && (
              <>
                <div>
                  <label htmlFor="fullName" className="block text-xs font-medium text-gray-400 mb-1.5">Full Name</label>
                  <input id="fullName" type="text" required value={formData.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    className={inputClass} placeholder="Enter your full name" />
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-medium text-gray-400 mb-1.5">Email Address</label>
                  <input id="email" type="email" autoComplete="email" required value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className={inputClass} placeholder="you@example.com" />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-xs font-medium text-gray-400 mb-1.5">Phone Number</label>
                  <div className="flex gap-2">
                    <select
                      value={formData.countryCode}
                      onChange={(e) => updateField('countryCode', e.target.value)}
                      className="w-[120px] px-3 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition appearance-none cursor-pointer"
                    >
                      {COUNTRY_CODES.map(c => (
                        <option key={c.code} value={c.code} className="bg-[#1a1a2e] text-white">
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                    <input id="phone" type="tel" required value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value.replace(/[^0-9]/g, ''))}
                      className={`flex-1 ${inputClass}`} placeholder="9876543210" />
                  </div>
                </div>

                <div>
                  <label htmlFor="address" className="block text-xs font-medium text-gray-400 mb-1.5">
                    Address <span className="text-gray-600">(optional)</span>
                  </label>
                  <textarea id="address" value={formData.address} rows={2}
                    onChange={(e) => updateField('address', e.target.value)}
                    className={`${inputClass} resize-none`} placeholder="City, State, Country" />
                </div>

                <button type="submit" disabled={!canProceedStep1}
                  className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed mt-2">
                  Continue
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/80 to-purple-600/80 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-semibold">{formData.fullName.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-300">{formData.fullName}</p>
                      <p className="text-xs text-gray-600">{formData.email} · {formData.countryCode} {formData.phone}</p>
                    </div>
                    <button type="button" onClick={() => setStep(1)} className="ml-auto text-xs text-blue-400 hover:text-blue-300 transition-colors">Edit</button>
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
                  <div className="relative">
                    <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required value={formData.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      className={inputClass} placeholder="Min 8 characters" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors">
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      )}
                    </button>
                  </div>
                  {/* Password strength */}
                  {formData.password.length > 0 && (
                    <div className="mt-2 flex gap-1">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                          formData.password.length >= i * 3
                            ? formData.password.length >= 12 ? 'bg-green-500' : formData.password.length >= 8 ? 'bg-blue-500' : 'bg-yellow-500'
                            : 'bg-white/[0.06]'
                        }`} />
                      ))}
                    </div>
                  )}
                  <p className="mt-1.5 text-[11px] text-gray-600">Must be at least 8 characters</p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-xs font-medium text-gray-400 mb-1.5">Confirm Password</label>
                  <input id="confirmPassword" type="password" autoComplete="new-password" required value={formData.confirmPassword}
                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                    className={inputClass} placeholder="Confirm your password" />
                  {formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword && (
                    <p className="mt-1.5 text-[11px] text-red-400">Passwords don't match</p>
                  )}
                </div>

                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={() => setStep(1)}
                    className="px-5 py-3 rounded-xl border border-white/[0.08] text-gray-400 text-sm font-medium hover:bg-white/[0.04] transition-all">
                    Back
                  </button>
                  <button type="submit" disabled={isLoading || !canProceedStep2}
                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                        Creating account...
                      </span>
                    ) : 'Create account'}
                  </button>
                </div>
              </>
            )}

            <p className="text-[11px] text-gray-600 text-center pt-2">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
