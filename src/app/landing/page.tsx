'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  MessageSquare, 
  FileText, 
  Code2, 
  Briefcase, 
  Search, 
  Zap,
  Check,
  ArrowRight,
  Sparkles,
  Shield,
  Clock,
  ChevronDown,
  Menu,
  X
} from 'lucide-react'

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()

  const handleEmailSubmit = () => {
    if (!email || !email.includes('@')) return
    router.push(`/register?email=${encodeURIComponent(email)}`)
  }

  return (
    <div className="min-h-screen bg-vivk-bg">
      {/* Navigation */}
      <nav className="fixed w-full top-0 z-50 vivk-glass border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Image src="/vivk_logo.png" alt="VIVK" width={32} height={32} priority />
              <span className="text-xl font-bold vivk-gradient-text">VIVK</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-slate-600 hover:text-vivk-navy transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-vivk-navy transition-colors">How it Works</a>
              <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-vivk-navy transition-colors">Pricing</a>
              <a href="#faq" className="text-sm font-medium text-slate-600 hover:text-vivk-navy transition-colors">FAQ</a>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className="hidden sm:inline-flex text-sm font-medium text-slate-600 hover:text-vivk-navy transition-colors px-4 py-2">
                Sign In
              </Link>
              <button
                onClick={() => router.push('/register')}
                className="vivk-btn-primary text-sm px-5 py-2.5"
              >
                Start Free
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-slate-600 hover:text-vivk-navy rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Toggle menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-slate-100 py-3 animate-slide-down">
              <div className="flex flex-col gap-1">
                <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-slate-600 hover:text-vivk-navy px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">Features</a>
                <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-slate-600 hover:text-vivk-navy px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">How it Works</a>
                <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-slate-600 hover:text-vivk-navy px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">Pricing</a>
                <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-slate-600 hover:text-vivk-navy px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">FAQ</a>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-slate-600 hover:text-vivk-navy px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors sm:hidden">Sign In</Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-4 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-vivk-bg to-vivk-bg"></div>
        <div className="absolute top-20 left-[10%] w-[500px] h-[500px] bg-vivk-cyan/[0.06] rounded-full blur-[120px]"></div>
        <div className="absolute top-40 right-[10%] w-[400px] h-[400px] bg-vivk-violet/[0.06] rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-vivk-blue/[0.04] rounded-full blur-[100px]"></div>

        <div className="relative max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Copy */}
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-white border border-slate-200 rounded-full shadow-vivk-sm">
                <Sparkles className="w-4 h-4 text-vivk-blue" />
                <span className="text-sm font-medium text-slate-700">Intelligent AI Workspace</span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-[64px] font-extrabold text-vivk-navy leading-[1.08] tracking-tight mb-6">
                Think Faster.<br />
                Create Better.<br />
                <span className="vivk-gradient-text">With VIVK.</span>
              </h1>

              <p className="text-lg text-slate-600 leading-relaxed mb-8 max-w-lg">
                One intelligent AI workspace for writing, research, coding, business automation and everyday productivity.
              </p>

              {/* Email CTA */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 vivk-input shadow-vivk-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
                />
                <button
                  onClick={handleEmailSubmit}
                  className="vivk-btn-primary whitespace-nowrap flex items-center gap-2 px-6 py-3"
                >
                  Start Free <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-slate-500 flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Free to start</span>
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> No credit card required</span>
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Cancel anytime</span>
              </p>
            </div>

            {/* Right - Product Visual */}
            <div className="hidden lg:block relative">
              <div className="relative bg-vivk-navy rounded-[20px] shadow-vivk-lg overflow-hidden border border-slate-800/50">
                {/* Window chrome */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/70"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/70"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/70"></div>
                  </div>
                  <div className="flex-1 text-center">
                    <span className="text-xs text-slate-400 font-medium">VIVK — AI Workspace</span>
                  </div>
                </div>
                {/* Chat content mock */}
                <div className="p-6 space-y-4">
                  {/* User message */}
                  <div className="flex justify-end">
                    <div className="bg-vivk-blue/20 border border-vivk-blue/20 rounded-2xl rounded-br-md px-4 py-3 max-w-[80%]">
                      <p className="text-sm text-slate-200">Write a compelling product description for our new AI-powered analytics dashboard</p>
                    </div>
                  </div>
                  {/* AI response */}
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-lg bg-vivk-gradient flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%]">
                      <p className="text-sm text-slate-300 leading-relaxed">
                        <span className="text-white font-medium">Transform raw data into actionable insights</span> with our AI-powered analytics dashboard. Built for modern teams who need real-time intelligence...
                      </p>
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/[0.06]">
                        <button className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Copy</button>
                        <button className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Regenerate</button>
                      </div>
                    </div>
                  </div>
                  {/* Input mock */}
                  <div className="mt-4 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-slate-500">Ask VIVK anything...</span>
                    <div className="w-8 h-8 rounded-lg bg-vivk-gradient flex items-center justify-center">
                      <ArrowRight className="w-4 h-4 text-white rotate-[-90deg]" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Floating accent */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-vivk-gradient rounded-2xl opacity-20 blur-2xl"></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-vivk-cyan/30 rounded-full blur-3xl"></div>
            </div>
          </div>

          {/* Social Proof */}
          <div className="mt-16 pt-12 border-t border-slate-200/60">
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <span className="text-yellow-500">★★★★★</span>
                <span className="font-semibold text-vivk-navy">4.9/5</span> rating
              </div>
              <div className="w-px h-5 bg-slate-200 hidden sm:block"></div>
              <div><span className="font-semibold text-vivk-navy">500+</span> happy users</div>
              <div className="w-px h-5 bg-slate-200 hidden sm:block"></div>
              <div><span className="font-semibold text-vivk-navy">50+</span> businesses trust VIVK</div>
              <div className="w-px h-5 bg-slate-200 hidden sm:block"></div>
              <div><span className="font-semibold text-vivk-navy">70%</span> lower cost than alternatives</div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-vivk-blue mb-3 tracking-wide uppercase">Capabilities</p>
            <h2 className="text-3xl md:text-5xl font-bold text-vivk-navy mb-4 tracking-tight">
              One workspace. Every task.
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              From content creation to code generation, VIVK handles the work so you can focus on what matters.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: MessageSquare, title: 'AI Assistant', desc: 'Intelligent conversations with context retention. Ask questions, solve problems, brainstorm ideas.', color: 'text-vivk-blue', bg: 'bg-vivk-blue/[0.08]' },
              { icon: FileText, title: 'Content Creation', desc: 'Generate professional emails, blogs, social media posts, and marketing copy in minutes.', color: 'text-emerald-600', bg: 'bg-emerald-500/[0.08]' },
              { icon: Code2, title: 'Coding', desc: 'Generate, explain, debug and improve code. Support for all major programming languages.', color: 'text-vivk-violet', bg: 'bg-vivk-violet/[0.08]' },
              { icon: Briefcase, title: 'Business', desc: 'Draft contracts, create presentations, analyze reports, and automate business workflows.', color: 'text-amber-600', bg: 'bg-amber-500/[0.08]' },
              { icon: Search, title: 'Research', desc: 'Analyze information, summarize documents, compare options and generate actionable insights.', color: 'text-vivk-cyan', bg: 'bg-vivk-cyan/[0.08]' },
              { icon: Zap, title: 'Productivity', desc: 'Plan projects, organize tasks, draft templates, and complete everyday work faster.', color: 'text-rose-600', bg: 'bg-rose-500/[0.08]' },
            ].map((feature) => (
              <div key={feature.title} className="vivk-card p-7 vivk-card-hover group">
                <div className={`w-11 h-11 rounded-xl ${feature.bg} flex items-center justify-center mb-5`}>
                  <feature.icon className={`w-5 h-5 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-bold text-vivk-navy mb-2 group-hover:text-vivk-blue transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-vivk-blue mb-3 tracking-wide uppercase">How it works</p>
            <h2 className="text-3xl md:text-5xl font-bold text-vivk-navy mb-4 tracking-tight">
              Start in 30 seconds
            </h2>
            <p className="text-lg text-slate-600">No setup, no learning curve. Just results.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create your account', desc: 'Sign up for free with just an email. No credit card required.' },
              { step: '02', title: 'Ask VIVK anything', desc: 'Type your request naturally. VIVK understands context, intent, and nuance.' },
              { step: '03', title: 'Get results instantly', desc: 'Receive professional-quality responses with copy, edit, and export options.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-vivk-gradient flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{item.step}</span>
                </div>
                <h3 className="text-lg font-bold text-vivk-navy mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why VIVK */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm font-semibold text-vivk-blue mb-3 tracking-wide uppercase">Why VIVK</p>
              <h2 className="text-3xl md:text-4xl font-bold text-vivk-navy mb-6 tracking-tight">
                Built for India.<br />Priced for everyone.
              </h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                VIVK delivers the same advanced AI capabilities as international tools at 70% lower cost. Built to understand Indian context, culture, and business practices.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Shield, title: 'Enterprise-grade security', desc: 'Your data stays private. No training on your conversations.' },
                  { icon: Clock, title: 'Indian timezone support', desc: 'Built and supported during Indian business hours.' },
                  { icon: Sparkles, title: 'Advanced AI models', desc: 'Powered by state-of-the-art language models for premium results.' },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-xl bg-vivk-blue/[0.08] flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-vivk-blue" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-vivk-navy mb-0.5">{item.title}</h4>
                      <p className="text-sm text-slate-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Stats card */}
            <div className="vivk-card p-8 lg:p-10">
              <div className="grid grid-cols-2 gap-6">
                {[
                  { value: '70%', label: 'Lower cost than ChatGPT Plus' },
                  { value: '10x', label: 'Faster content creation' },
                  { value: '24/7', label: 'Available anytime' },
                  { value: '500+', label: 'Active users' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center p-4 rounded-xl bg-vivk-bg">
                    <p className="text-3xl font-extrabold vivk-gradient-text mb-1">{stat.value}</p>
                    <p className="text-xs text-slate-600 font-medium">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-vivk-blue mb-3 tracking-wide uppercase">Pricing</p>
            <h2 className="text-3xl md:text-5xl font-bold text-vivk-navy mb-4 tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-slate-600">Start free. Upgrade when you need more.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
            {/* Free */}
            <div className="vivk-card p-8 vivk-card-hover">
              <h3 className="text-lg font-bold text-vivk-navy mb-1">Free</h3>
              <p className="text-sm text-slate-500 mb-5">For getting started</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-vivk-navy">&#8377;0</span>
                <span className="text-slate-400 ml-1 text-sm">/forever</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['20 queries per day', 'Basic AI model', '7-day chat history', 'Standard support'].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-slate-600">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => router.push('/register')}
                className="w-full vivk-btn-secondary py-3"
              >
                Start Free
              </button>
            </div>

            {/* Pro - Featured */}
            <div className="relative vivk-card p-8 border-vivk-blue/30 shadow-vivk-lg md:-mt-4 md:mb-[-16px]">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-vivk-gradient text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-vivk-glow">
                  MOST POPULAR
                </span>
              </div>
              <h3 className="text-lg font-bold text-vivk-navy mb-1">Pro</h3>
              <p className="text-sm text-slate-500 mb-5">For professionals</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-vivk-navy">&#8377;999</span>
                <span className="text-slate-400 ml-1 text-sm">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Unlimited queries', 'Advanced AI model (Claude Sonnet)', 'Unlimited chat history', 'Priority support', 'Export conversations', 'API access'].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-slate-700">
                    <Check className="w-4 h-4 text-vivk-blue flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => router.push('/register?plan=pro')}
                className="w-full vivk-btn-primary py-3"
              >
                Start 7-Day Free Trial
              </button>
            </div>

            {/* Business */}
            <div className="vivk-card p-8 vivk-card-hover">
              <h3 className="text-lg font-bold text-vivk-navy mb-1">Business</h3>
              <p className="text-sm text-slate-500 mb-5">For teams & enterprises</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-vivk-navy">&#8377;4,999</span>
                <span className="text-slate-400 ml-1 text-sm">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Everything in Pro', 'Team collaboration', 'Custom integrations', 'Dedicated account manager', 'SLA guarantee', 'Custom AI fine-tuning'].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-slate-600">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => router.push('/register?plan=business')}
                className="w-full vivk-btn-secondary py-3"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-vivk-blue mb-3 tracking-wide uppercase">FAQ</p>
            <h2 className="text-3xl md:text-4xl font-bold text-vivk-navy tracking-tight">
              Frequently asked questions
            </h2>
          </div>

          <div className="space-y-3">
            {[
              { q: 'What AI model does VIVK use?', a: 'VIVK uses Claude by Anthropic. Free users get access to Claude Haiku (fast and efficient), while Pro and Business users get Claude Sonnet (advanced reasoning and generation).' },
              { q: 'How is VIVK different from ChatGPT?', a: 'VIVK is built specifically for the Indian market with local context understanding, Indian timezone support, and pricing in INR at 70% lower cost than international alternatives.' },
              { q: 'Can I cancel my subscription anytime?', a: 'Yes, you can cancel your subscription at any time. You\'ll maintain access until the end of your current billing period.' },
              { q: 'Is my data secure?', a: 'Absolutely. We use enterprise-grade encryption, never train AI models on your data, and follow strict data privacy practices.' },
              { q: 'Do you support Indian payment methods?', a: 'Yes, we support all major Indian payment methods through Razorpay including UPI, credit/debit cards, net banking, and wallets.' },
            ].map((item, i) => (
              <div key={i} className="vivk-card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                  aria-expanded={openFaq === i}
                >
                  <span className="font-semibold text-vivk-navy pr-4">{item.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 animate-fade-in">
                    <p className="text-sm text-slate-600 leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="vivk-card p-12 md:p-16 relative overflow-hidden">
            {/* Decorative gradient */}
            <div className="absolute inset-0 bg-vivk-gradient opacity-[0.03]"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-vivk-cyan/[0.08] rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-vivk-violet/[0.08] rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2"></div>

            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold text-vivk-navy mb-4 tracking-tight">
                Ready to work smarter?
              </h2>
              <p className="text-lg text-slate-600 mb-8 max-w-lg mx-auto">
                Join hundreds of professionals and businesses already using VIVK to transform their productivity.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => router.push('/register')}
                  className="vivk-btn-primary px-8 py-3.5 text-base flex items-center justify-center gap-2"
                >
                  Start Free <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className="vivk-btn-secondary px-8 py-3.5 text-base"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-vivk-navy text-slate-400 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Image src="/vivk_logo.png" alt="VIVK" width={28} height={28} />
                <span className="text-white font-bold text-lg">VIVK</span>
              </div>
              <p className="text-sm leading-relaxed max-w-sm mb-4">
                Intelligent AI workspace for writing, research, coding, business automation and everyday productivity. Built for India.
              </p>
              <p className="text-xs text-slate-500">
                Powered by advanced AI models. Enterprise-grade security.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-4">Product</h4>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Sign In</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs">&copy; 2026 VIVK. Made in India.</p>
            <p className="text-xs text-slate-500">Virtual Intelligent Versatile Knowledge</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
