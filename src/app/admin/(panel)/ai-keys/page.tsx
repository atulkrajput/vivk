'use client'

import { useState, useEffect } from 'react'
import { Key, Save, Eye, EyeOff, Check, AlertCircle, RefreshCw, Activity } from 'lucide-react'

interface AIKeyConfig {
  id: string
  provider: string
  label: string
  keyMasked: string
  keyValue: string
  enabled: boolean
  usageToday: number
  usageMonth: number
  monthlyLimit: number
  lastUsed: string | null
}

export default function AdminAIKeysPage() {
  const [keys, setKeys] = useState<AIKeyConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchKeys()
  }, [])

  const fetchKeys = async () => {
    try {
      const response = await fetch('/api/admin/ai-keys')
      if (response.ok) {
        const data = await response.json()
        setKeys(data.keys)
      }
    } catch (error) {
      console.error('Failed to load AI keys:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/ai-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys }),
      })
      if (response.ok) {
        setMessage({ type: 'success', text: 'AI keys configuration saved' })
      } else {
        setMessage({ type: 'error', text: 'Failed to save keys' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save keys' })
    } finally {
      setIsSaving(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const toggleReveal = (id: string) => {
    setRevealedKeys(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const updateKey = (id: string, field: string, value: any) => {
    setKeys(prev => prev.map(k => k.id === id ? { ...k, [field]: value } : k))
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-100 rounded w-1/3"></div>
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-xl"></div>)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-vivk-navy">AI Key Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage API keys, usage limits, and provider configuration</p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="vivk-btn-primary text-sm flex items-center gap-2">
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Config'}
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

      {/* Keys List */}
      <div className="space-y-4">
        {keys.map((key) => (
          <div key={key.id} className={`vivk-card p-5 ${!key.enabled ? 'opacity-60' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-vivk-blue/[0.08] flex items-center justify-center">
                  <Key className="w-4 h-4 text-vivk-blue" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-vivk-navy">{key.label}</h3>
                  <p className="text-[11px] text-slate-400">{key.provider}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={key.enabled}
                  onChange={(e) => updateKey(key.id, 'enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-checked:bg-vivk-blue rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
              </label>
            </div>

            {/* Key Value */}
            <div className="mb-4">
              <label className="text-xs font-medium text-slate-500 block mb-1.5">API Key</label>
              <div className="flex items-center gap-2">
                <input
                  type={revealedKeys.has(key.id) ? 'text' : 'password'}
                  value={key.keyValue}
                  onChange={(e) => updateKey(key.id, 'keyValue', e.target.value)}
                  className="flex-1 vivk-input text-sm font-mono py-2"
                  placeholder="Enter API key..."
                />
                <button
                  onClick={() => toggleReveal(key.id)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                  aria-label={revealedKeys.has(key.id) ? 'Hide key' : 'Show key'}
                >
                  {revealedKeys.has(key.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Usage & Limits */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-vivk-bg rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-vivk-navy">{key.usageToday.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500">Today</p>
              </div>
              <div className="bg-vivk-bg rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-vivk-navy">{key.usageMonth.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500">This Month</p>
              </div>
              <div className="bg-vivk-bg rounded-xl p-3">
                <label className="text-[10px] text-slate-500 block mb-0.5">Monthly Limit</label>
                <input
                  type="number"
                  value={key.monthlyLimit}
                  onChange={(e) => updateKey(key.id, 'monthlyLimit', parseInt(e.target.value) || 0)}
                  className="w-full text-sm font-bold text-vivk-navy bg-transparent focus:outline-none"
                />
              </div>
              <div className="bg-vivk-bg rounded-xl p-3 text-center">
                <p className="text-[11px] text-slate-500 mb-0.5">Last Used</p>
                <p className="text-xs font-medium text-vivk-navy">
                  {key.lastUsed ? new Date(key.lastUsed).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
