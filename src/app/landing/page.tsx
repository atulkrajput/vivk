'use client'

import { useState } from 'react'

export default function LandingPage() {
  const [email, setEmail] = useState('')

  const handleEmailSubmit = () => {
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address')
      return
    }
    alert('🎉 Thanks for joining! Check your email for next steps.')
    setEmail('')
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Navigation */}
      <nav className="bg-white shadow-sm fixed w-full top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img 
                src="/logo.svg" 
                alt="VIVK Logo" 
                className="h-12 w-auto mr-2"
              />
              <span className="text-2xl font-bold gradient-text">VIVK</span>
              <span className="ml-2 text-sm text-gray-600 hidden sm:inline">
                Virtual Intelligent Versatile Knowledge
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <a href="#features" className="text-gray-600 hover:text-blue-600 hidden md:inline">
                Features
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-blue-600 hidden md:inline">
                Pricing
              </a>
              <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
                Get Started Free
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="gradient-bg text-white pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-block mb-4 px-4 py-2 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">
            🚀 Made in India, Made for India
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            India&apos;s Smartest<br/>AI Assistant
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
            Your intelligent companion for work, creativity, and learning. Built for Indian businesses and individuals. Starting at just ₹499/month.
          </p>
          
          {/* Waitlist Form */}
          <div className="max-w-md mx-auto mb-8">
            <div className="bg-white rounded-lg p-2 shadow-xl flex flex-col sm:flex-row gap-2">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="flex-1 px-4 py-3 text-gray-800 rounded-md focus:outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button 
                onClick={handleEmailSubmit}
                className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 transition font-semibold whitespace-nowrap"
              >
                Start Free Trial
              </button>
            </div>
            <p className="text-sm text-blue-100 mt-3">
              ✓ Free for 7 days • ✓ No credit card required • ✓ Cancel anytime
            </p>
          </div>

          {/* Social Proof */}
          <div className="flex justify-center items-center space-x-8 text-sm">
            <div className="flex items-center">
              <span className="text-2xl mr-2">⭐⭐⭐⭐⭐</span>
              <span>4.9/5 rating</span>
            </div>
            <div>
              <span className="font-bold text-lg">500+</span>
              <span className="ml-1">happy users</span>
            </div>
            <div>
              <span className="font-bold text-lg">50+</span>
              <span className="ml-1">businesses trust us</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Work Smarter
            </h2>
            <p className="text-xl text-gray-600">One AI assistant for all your needs</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="feature-card bg-white p-8 rounded-xl border-2 border-gray-200">
              <div className="text-4xl mb-4">✍️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Content Creation</h3>
              <p className="text-gray-600">
                Write emails, blogs, social media posts, product descriptions - all in minutes.
              </p>
            </div>

            <div className="feature-card bg-white p-8 rounded-xl border-2 border-gray-200">
              <div className="text-4xl mb-4">💼</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Business Automation</h3>
              <p className="text-gray-600">
                Draft contracts, create presentations, analyze data, prepare reports.
              </p>
            </div>

            <div className="feature-card bg-white p-8 rounded-xl border-2 border-gray-200">
              <div className="text-4xl mb-4">💻</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Coding Help</h3>
              <p className="text-gray-600">
                Debug code, learn programming, build applications.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600">Start free, upgrade when you&apos;re ready</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">₹0</span>
                <span className="text-gray-600">/forever</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700">20 queries per day</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700">Basic AI model</span>
                </li>
              </ul>
              <button className="w-full bg-gray-100 text-gray-900 py-3 rounded-lg hover:bg-gray-200 transition font-semibold">
                Start Free
              </button>
            </div>

            {/* Pro Plan */}
            <div className="bg-white border-4 border-blue-600 rounded-2xl p-8 relative transform scale-105">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  MOST POPULAR
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Pro</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">₹499</span>
                <span className="text-gray-600">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700"><strong>Unlimited</strong> queries</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700"><strong>Advanced</strong> AI model</span>
                </li>
              </ul>
              <button className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold">
                Start 7-Day Free Trial
              </button>
            </div>

            {/* Business Plan */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Business</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">₹2,999</span>
                <span className="text-gray-600">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700"><strong>Everything in Pro</strong></span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700">Team collaboration</span>
                </li>
              </ul>
              <button className="w-full bg-gray-100 text-gray-900 py-3 rounded-lg hover:bg-gray-200 transition font-semibold">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <div className="flex items-center justify-center mb-4">
              <img 
                src="/logo_white.svg" 
                alt="VIVK Logo" 
                className="h-10 w-auto mr-2"
              />
              <h3 className="text-white font-bold text-xl gradient-text">VIVK</h3>
            </div>
            <p className="text-sm">
              India&apos;s smartest AI assistant. Built for Indian businesses and individuals.
            </p>
          </div>
          
          <div className="border-t border-gray-800 pt-8">
            <p className="text-sm">
              © 2026 VIVK. Made with ❤️ in India.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}