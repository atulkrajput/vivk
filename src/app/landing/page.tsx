'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const router = useRouter()

  const handleEmailSubmit = () => {
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address')
      return
    }
    router.push(`/register?email=${encodeURIComponent(email)}`)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed w-full top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="VIVK" className="h-9 w-auto" />
              <span className="text-xl font-bold gradient-text">VIVK</span>
              <span className="ml-1 text-xs text-gray-400 hidden sm:inline tracking-wide">
                Virtual Intelligent Versatile Knowledge
              </span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#features" className="text-sm text-gray-500 hover:text-gray-900 transition hidden md:inline">Features</a>
              <a href="#pricing" className="text-sm text-gray-500 hover:text-gray-900 transition hidden md:inline">Pricing</a>
              <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition hidden sm:inline">Sign in</Link>
              <button onClick={() => router.push('/register')}
                className="bg-gray-900 text-white text-sm px-5 py-2 rounded-full hover:bg-gray-800 transition-all hover:shadow-lg">
                Get Started Free
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-orange-50"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-orange-200/20 rounded-full blur-3xl"></div>

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full text-sm text-blue-700 font-medium">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            🚀 Made in India, Made for India
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-[1.1] tracking-tight">
            India&apos;s Smartest<br/>
            <span className="gradient-text">AI Assistant</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Your intelligent companion for work, creativity, and learning. Built for Indian businesses and individuals. Starting at just ₹499/month.
          </p>

          {/* Email CTA */}
          <div className="max-w-lg mx-auto mb-8">
            <div className="flex flex-col sm:flex-row gap-3 p-2 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-5 py-3.5 text-gray-800 rounded-xl bg-gray-50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
              />
              <button onClick={handleEmailSubmit}
                className="bg-gray-900 text-white px-8 py-3.5 rounded-xl hover:bg-gray-800 transition-all font-semibold text-sm whitespace-nowrap hover:shadow-lg">
                Start Free Trial →
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              ✓ Free for 7 days &nbsp;•&nbsp; ✓ No credit card required &nbsp;•&nbsp; ✓ Cancel anytime
            </p>
          </div>

          {/* Social Proof */}
          <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <span className="text-yellow-400">★★★★★</span>
              <span className="font-medium text-gray-700">4.9/5</span> rating
            </div>
            <div className="w-px h-4 bg-gray-200 hidden sm:block"></div>
            <div><span className="font-semibold text-gray-700">500+</span> happy users</div>
            <div className="w-px h-4 bg-gray-200 hidden sm:block"></div>
            <div><span className="font-semibold text-gray-700">50+</span> businesses trust us</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-blue-600 mb-3 tracking-wide uppercase">Features</p>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
              Everything You Need to Work Smarter
            </h2>
            <p className="text-lg text-gray-500">One AI assistant for all your needs</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '✍️', title: 'Content Creation', desc: 'Write emails, blogs, social media posts, product descriptions - all in minutes.', color: 'from-blue-500/10 to-blue-600/5' },
              { icon: '💼', title: 'Business Automation', desc: 'Draft contracts, create presentations, analyze data, prepare reports.', color: 'from-orange-500/10 to-orange-600/5' },
              { icon: '💻', title: 'Coding Help', desc: 'Debug code, learn programming, build applications.', color: 'from-green-500/10 to-green-600/5' },
            ].map((f) => (
              <div key={f.title} className={`group relative p-8 rounded-2xl bg-gradient-to-br ${f.color} border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300`}>
                <div className="text-4xl mb-5">{f.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{f.title}</h3>
                <p className="text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-blue-600 mb-3 tracking-wide uppercase">Pricing</p>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-gray-500">Start free, upgrade when you&apos;re ready</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
            {/* Free */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 hover:shadow-lg transition-all duration-300">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Free</h3>
              <div className="mb-6"><span className="text-4xl font-bold text-gray-900">₹0</span><span className="text-gray-400 ml-1">/forever</span></div>
              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-center gap-2 text-gray-600"><span className="text-green-500 text-lg">✓</span>20 queries per day</li>
                <li className="flex items-center gap-2 text-gray-600"><span className="text-green-500 text-lg">✓</span>Basic AI model</li>
                <li className="flex items-center gap-2 text-gray-600"><span className="text-green-500 text-lg">✓</span>7-day chat history</li>
              </ul>
              <button onClick={() => router.push('/register')}
                className="w-full py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition text-sm">
                Start Free
              </button>
            </div>

            {/* Pro */}
            <div className="relative bg-gray-900 rounded-2xl p-8 text-white shadow-2xl shadow-gray-900/20 md:-mt-4 md:mb-[-16px]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-1 rounded-full text-xs font-bold tracking-wide">
                  MOST POPULAR
                </span>
              </div>
              <h3 className="text-lg font-semibold mb-1">Pro</h3>
              <div className="mb-6"><span className="text-4xl font-bold">₹499</span><span className="text-gray-400 ml-1">/month</span></div>
              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-center gap-2 text-gray-300"><span className="text-green-400 text-lg">✓</span><strong className="text-white">Unlimited</strong> queries</li>
                <li className="flex items-center gap-2 text-gray-300"><span className="text-green-400 text-lg">✓</span><strong className="text-white">Advanced</strong> AI model</li>
                <li className="flex items-center gap-2 text-gray-300"><span className="text-green-400 text-lg">✓</span>Unlimited chat history</li>
                <li className="flex items-center gap-2 text-gray-300"><span className="text-green-400 text-lg">✓</span>API access</li>
              </ul>
              <button onClick={() => router.push('/register?plan=pro')}
                className="w-full py-3 rounded-xl bg-white text-gray-900 font-semibold hover:bg-gray-100 transition text-sm">
                Start 7-Day Free Trial
              </button>
            </div>

            {/* Business */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 hover:shadow-lg transition-all duration-300">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Business</h3>
              <div className="mb-6"><span className="text-4xl font-bold text-gray-900">₹2,999</span><span className="text-gray-400 ml-1">/month</span></div>
              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-center gap-2 text-gray-600"><span className="text-green-500 text-lg">✓</span><strong>Everything in Pro</strong></li>
                <li className="flex items-center gap-2 text-gray-600"><span className="text-green-500 text-lg">✓</span>Team collaboration</li>
                <li className="flex items-center gap-2 text-gray-600"><span className="text-green-500 text-lg">✓</span>Custom integrations</li>
                <li className="flex items-center gap-2 text-gray-600"><span className="text-green-500 text-lg">✓</span>Dedicated support</li>
              </ul>
              <button onClick={() => router.push('/register?plan=business')}
                className="w-full py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition text-sm">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src="/logo_white.svg" alt="VIVK" className="h-8 w-auto" />
            <span className="text-white font-bold text-lg">VIVK</span>
          </div>
          <p className="text-sm mb-8">India&apos;s smartest AI assistant. Built for Indian businesses and individuals.</p>
          <div className="flex justify-center gap-8 text-sm mb-8">
            <Link href="/login" className="hover:text-white transition">Sign In</Link>
            <Link href="/register" className="hover:text-white transition">Register</Link>
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
          </div>
          <div className="border-t border-gray-800 pt-8">
            <p className="text-xs">© 2026 VIVK. Made with ❤️ in India.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}