'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Save, Check, AlertCircle, Edit2 } from 'lucide-react'

interface Plan {
  id: string
  name: string
  tier: 'free' | 'pro' | 'business'
  price: number
  dailyLimit: number
  features: string[]
  aiModel: string
  enabled: boolean
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editingPlan, setEditingPlan] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/admin/plans')
      if (response.ok) {
        const data = await response.json()
        setPlans(data.plans)
      }
    } catch (error) {
      console.error('Failed to load plans:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plans }),
      })
      if (response.ok) {
        setMessage({ type: 'success', text: 'Plans updated successfully' })
        setEditingPlan(null)
      } else {
        setMessage({ type: 'error', text: 'Failed to save plans' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save plans' })
    } finally {
      setIsSaving(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const updatePlan = (tier: string, field: keyof Plan, value: any) => {
    setPlans(prev => prev.map(p => p.tier === tier ? { ...p, [field]: value } : p))
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-100 rounded w-1/3"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-64 bg-slate-100 rounded-xl"></div>)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-vivk-navy">Plan Management</h1>
          <p className="text-sm text-slate-500 mt-1">Configure subscription plans, pricing, and limits</p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="vivk-btn-primary text-sm flex items-center gap-2">
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-3.5 rounded-xl flex items-center gap-2 text-sm ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.tier} className={`vivk-card p-6 ${!plan.enabled ? 'opacity-60' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className={`w-4 h-4 ${plan.tier === 'pro' ? 'text-vivk-blue' : plan.tier === 'business' ? 'text-vivk-violet' : 'text-slate-400'}`} />
                <h3 className="font-bold text-vivk-navy">{plan.name}</h3>
              </div>
              <button
                onClick={() => setEditingPlan(editingPlan === plan.tier ? null : plan.tier)}
                className="p-1.5 text-slate-400 hover:text-vivk-blue hover:bg-vivk-blue/[0.06] rounded-lg transition-colors"
                aria-label="Edit plan"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            {/* Price */}
            <div className="mb-4">
              {editingPlan === plan.tier ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">₹</span>
                  <input
                    type="number"
                    value={plan.price}
                    onChange={(e) => updatePlan(plan.tier, 'price', parseInt(e.target.value) || 0)}
                    className="w-24 vivk-input text-sm py-1.5"
                  />
                  <span className="text-xs text-slate-400">/month</span>
                </div>
              ) : (
                <p className="text-2xl font-bold text-vivk-navy">
                  ₹{plan.price.toLocaleString('en-IN')}
                  <span className="text-sm font-normal text-slate-400">/mo</span>
                </p>
              )}
            </div>

            {/* Daily Limit */}
            <div className="mb-4">
              <label className="text-xs font-medium text-slate-500 block mb-1">Daily Message Limit</label>
              {editingPlan === plan.tier ? (
                <input
                  type="number"
                  value={plan.dailyLimit}
                  onChange={(e) => updatePlan(plan.tier, 'dailyLimit', parseInt(e.target.value) || 0)}
                  className="w-full vivk-input text-sm py-1.5"
                  placeholder="-1 for unlimited"
                />
              ) : (
                <p className="text-sm text-vivk-navy font-medium">
                  {plan.dailyLimit === -1 ? 'Unlimited' : `${plan.dailyLimit} messages/day`}
                </p>
              )}
            </div>

            {/* AI Model */}
            <div className="mb-4">
              <label className="text-xs font-medium text-slate-500 block mb-1">AI Model</label>
              {editingPlan === plan.tier ? (
                <input
                  type="text"
                  value={plan.aiModel}
                  onChange={(e) => updatePlan(plan.tier, 'aiModel', e.target.value)}
                  className="w-full vivk-input text-sm py-1.5"
                />
              ) : (
                <p className="text-sm text-vivk-navy">{plan.aiModel}</p>
              )}
            </div>

            {/* Enabled Toggle */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-500">Plan Active</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={plan.enabled}
                  onChange={(e) => updatePlan(plan.tier, 'enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-checked:bg-vivk-blue rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
