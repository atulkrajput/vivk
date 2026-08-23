'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { AlertCircle, CheckCircle, Eye, EyeOff, FileText, Code2, Briefcase, Globe } from 'lucide-react'

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

  return (
    <>
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[45%] relative items-center justify-center p-12">
        <div className="relative max-w-md z-10">
          <div className="flex items-center mb-10">
            <Image src="/vivk_logo.png" alt="VIVK" width={247} height={85} className="h-[85px] w-auto" priority />
          </div>

          <h2 className="text-3xl font-bold text-vivk-navy mb-3 leading-tight">Start your AI journey</h2>
          <p className="text-slate-600 leading-relaxed mb-10">
            Join thousands of Indian businesses and individuals using VIVK to work smarter every day.
          </p>

          <div className="space-y-3">
            {[
              { icon: FileText, title: 'Create content in minutes', desc: 'Blog posts, emails, social media' },
              { icon: Briefcase, title: 'Automate business tasks', desc: 'Contracts, reports, presentations' },
              { icon: Code2, title: 'Get coding assistance', desc: 'Debug, explain, and write code' },
              { icon: Globe, title: 'Built for India', desc: 'Indian context, culture, and languages' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white border border-slate-100 shadow-vivk-sm">
                <div className="w-9 h-9 rounded-lg bg-vivk-blue/[0.08] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <item.icon className="w-4 h-4 text-vivk-blue" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-vivk-navy">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
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
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center mb-8 lg:hidden">
            <Image src="/vivk_logo.png" alt="VIVK" width={247} height={85} className="h-[85px] w-auto" priority />
          </div>

          <h1 className="text-2xl font-bold text-vivk-navy mb-1">Create your account</h1>
          <p className="text-sm text-slate-500 mb-6">
            Already have an account?{' '}
            <Link href="/login" className="text-vivk-blue hover:text-blue-700 font-medium transition-colors">Sign in</Link>
          </p>

          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${step >= 1 ? 'bg-vivk-blue text-white' : 'bg-slate-100 text-slate-400'}`}>1</div>
              <span className={`text-xs font-medium ${step >= 1 ? 'text-vivk-navy' : 'text-slate-400'}`}>Personal Info</span>
            </div>
            <div className={`flex-1 h-px ${step >= 2 ? 'bg-vivk-blue' : 'bg-slate-200'} transition-colors`}></div>
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${step >= 2 ? 'bg-vivk-blue text-white' : 'bg-slate-100 text-slate-400'}`}>2</div>
              <span className={`text-xs font-medium ${step >= 2 ? 'text-vivk-navy' : 'text-slate-400'}`}>Security</span>
            </div>
          </div>

          {selectedPlan !== 'free' && (
            <div className="mb-5 p-3 bg-vivk-blue/[0.06] border border-vivk-blue/10 rounded-[12px] text-sm text-vivk-blue flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Selected: <strong>{planLabels[selectedPlan]}</strong>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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

            {step === 1 && (
              <>
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                  <input id="fullName" type="text" required value={formData.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    className="w-full vivk-input" placeholder="Enter your full name" />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                  <input id="email" type="email" autoComplete="email" required value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="w-full vivk-input" placeholder="you@example.com" />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
                  <div className="flex gap-2">
                    <select
                      value={formData.countryCode}
                      onChange={(e) => updateField('countryCode', e.target.value)}
                      className="w-[120px] vivk-input appearance-none cursor-pointer"
                    >
                      {COUNTRY_CODES.map(c => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                    <input id="phone" type="tel" required value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value.replace(/[^0-9]/g, ''))}
                      className="flex-1 vivk-input" placeholder="9876543210" />
                  </div>
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Address <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea id="address" value={formData.address} rows={2}
                    onChange={(e) => updateField('address', e.target.value)}
                    className="w-full vivk-input resize-none" placeholder="City, State, Country" />
                </div>

                <button type="submit" disabled={!canProceedStep1}
                  className="w-full vivk-btn-primary py-3 text-sm mt-2">
                  Continue
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <div className="p-3.5 rounded-[12px] bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-vivk-gradient flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-semibold">{formData.fullName.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-vivk-navy">{formData.fullName}</p>
                      <p className="text-xs text-slate-500">{formData.email} · {formData.countryCode} {formData.phone}</p>
                    </div>
                    <button type="button" onClick={() => setStep(1)} className="ml-auto text-xs text-vivk-blue hover:text-blue-700 font-medium transition-colors">Edit</button>
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                  <div className="relative">
                    <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required value={formData.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      className="w-full vivk-input pr-10" placeholder="Min 8 characters" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Password strength */}
                  {formData.password.length > 0 && (
                    <div className="mt-2 flex gap-1">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                          formData.password.length >= i * 3
                            ? formData.password.length >= 12 ? 'bg-emerald-500' : formData.password.length >= 8 ? 'bg-vivk-blue' : 'bg-amber-500'
                            : 'bg-slate-200'
                        }`} />
                      ))}
                    </div>
                  )}
                  <p className="mt-1.5 text-xs text-slate-400">Must be at least 8 characters</p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
                  <input id="confirmPassword" type="password" autoComplete="new-password" required value={formData.confirmPassword}
                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                    className="w-full vivk-input" placeholder="Confirm your password" />
                  {formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword && (
                    <p className="mt-1.5 text-xs text-red-500">Passwords don&apos;t match</p>
                  )}
                </div>

                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={() => setStep(1)}
                    className="px-5 py-3 vivk-btn-secondary text-sm">
                    Back
                  </button>
                  <button type="submit" disabled={isLoading || !canProceedStep2}
                    className="flex-1 vivk-btn-primary py-3 text-sm">
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Creating account...
                      </span>
                    ) : 'Create account'}
                  </button>
                </div>
              </>
            )}

            <p className="text-xs text-slate-400 text-center pt-2">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </p>
          </form>
        </div>
      </div>
    </>
  )
}
