'use client'

import { useState, useEffect, useCallback } from 'react'
import { Key, Plus, Trash2, Check, AlertCircle, RefreshCw, Activity, Power, ShieldCheck } from 'lucide-react'

type Provider = 'groq' | 'anthropic'
type KeyStatus = 'active' | 'cooling_down' | 'limit_reached' | 'disabled'

interface StoredKey {
  id: string
  source: 'db'
  provider: Provider
  label: string
  keyMasked: string
  enabled: boolean
  priority: number
  dailyLimit: number | null
  requestsToday: number
  errorsToday: number
  totalRequests: number
  lastUsedAt: string | null
  lastError: string | null
  lastErrorAt: string | null
  disabledReason: string | null
  status: KeyStatus
}

interface EnvKey {
  id: string
  source: 'env'
  provider: Provider
  label: string
  keyMasked: string
  status: KeyStatus
}

const PROVIDERS: { id: Provider; name: string; prefix: string; usedFor: string }[] = [
  { id: 'groq', name: 'Groq', prefix: 'gsk_', usedFor: 'Free users first, paid users as fallback' },
  { id: 'anthropic', name: 'Anthropic', prefix: 'sk-ant-', usedFor: 'Paid users first, free users as fallback' },
]

const STATUS_STYLES: Record<KeyStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700' },
  cooling_down: { label: 'Cooling down', className: 'bg-amber-50 text-amber-700' },
  limit_reached: { label: 'Daily limit reached', className: 'bg-amber-50 text-amber-700' },
  disabled: { label: 'Disabled', className: 'bg-slate-100 text-slate-500' },
}

function formatTime(value: string | null) {
  return value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
}

export default function AdminAIKeysPage() {
  const [keys, setKeys] = useState<StoredKey[]>([])
  const [envKeys, setEnvKeys] = useState<EnvKey[]>([])
  const [encryptionConfigured, setEncryptionConfigured] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [form, setForm] = useState({ provider: 'groq' as Provider, label: '', apiKey: '', priority: '100', dailyLimit: '' })
  const [isAdding, setIsAdding] = useState(false)

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const fetchKeys = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/ai-keys')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setKeys(data.keys)
      setEnvKeys(data.envKeys)
      setEncryptionConfigured(data.encryptionConfigured)
    } catch (error) {
      showMessage('error', error instanceof Error && error.message ? error.message : 'Failed to load AI keys')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAdding(true)
    try {
      const response = await fetch('/api/admin/ai-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: form.provider,
          label: form.label,
          apiKey: form.apiKey,
          priority: Number(form.priority) || 100,
          dailyLimit: form.dailyLimit ? Number(form.dailyLimit) : null,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      showMessage('success', `Key added. ${data.message}.`)
      setForm(f => ({ ...f, label: '', apiKey: '', dailyLimit: '' }))
      fetchKeys()
    } catch (error) {
      showMessage('error', error instanceof Error && error.message ? error.message : 'Failed to add key')
    } finally {
      setIsAdding(false)
    }
  }

  const updateKey = async (id: string, changes: Record<string, unknown>) => {
    setBusyId(id)
    try {
      const response = await fetch('/api/admin/ai-keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...changes }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      fetchKeys()
    } catch (error) {
      showMessage('error', error instanceof Error && error.message ? error.message : 'Failed to update key')
    } finally {
      setBusyId(null)
    }
  }

  const deleteKey = async (key: StoredKey) => {
    if (!confirm(`Delete "${key.label}" (${key.keyMasked})? This cannot be undone.`)) return
    setBusyId(key.id)
    try {
      const response = await fetch(`/api/admin/ai-keys?id=${encodeURIComponent(key.id)}`, { method: 'DELETE' })
      if (!response.ok) throw new Error((await response.json()).error)
      showMessage('success', 'Key deleted')
      fetchKeys()
    } catch (error) {
      showMessage('error', error instanceof Error && error.message ? error.message : 'Failed to delete key')
    } finally {
      setBusyId(null)
    }
  }

  const testKey = async (id: string) => {
    setBusyId(id)
    try {
      const response = await fetch('/api/admin/ai-keys/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      showMessage(data.ok ? 'success' : 'error', data.message)
    } catch (error) {
      showMessage('error', error instanceof Error && error.message ? error.message : 'Failed to test key')
    } finally {
      setBusyId(null)
    }
  }

  const editNumber = (key: StoredKey, field: 'priority' | 'dailyLimit') => {
    const current = field === 'priority' ? String(key.priority) : key.dailyLimit === null ? '' : String(key.dailyLimit)
    const prompt = field === 'priority'
      ? 'Priority (0-999, lower is used first):'
      : 'Daily request limit (leave empty for unlimited):'
    const value = window.prompt(prompt, current)
    if (value === null) return
    if (field === 'dailyLimit' && value.trim() === '') return updateKey(key.id, { dailyLimit: null })
    const n = Number(value)
    if (!Number.isInteger(n) || n < (field === 'priority' ? 0 : 1)) return showMessage('error', 'Enter a whole number')
    updateKey(key.id, { [field]: n })
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
          <p className="text-sm text-slate-500 mt-1">
            Add several keys per provider. Requests rotate across them, and a key that is rate limited or rejected is skipped automatically.
          </p>
        </div>
        <button onClick={() => { setIsLoading(true); fetchKeys() }} className="vivk-btn-secondary text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
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

      {!encryptionConfigured && (
        <div className="mb-6 p-3.5 rounded-xl flex items-start gap-2 text-sm bg-amber-50 text-amber-800 border border-amber-100">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            <strong>AI_KEYS_SECRET</strong> is not set in Vercel, so keys cannot be added here yet. Add a random value of 32+ characters
            and redeploy. Keys from Vercel env vars keep working meanwhile.
          </span>
        </div>
      )}

      {/* Add key */}
      <form onSubmit={handleAdd} className="vivk-card p-5 mb-6">
        <h2 className="text-sm font-semibold text-vivk-navy mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add a key
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <select
            value={form.provider}
            onChange={e => setForm(f => ({ ...f, provider: e.target.value as Provider }))}
            className="vivk-input md:col-span-1"
            aria-label="Provider"
          >
            {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input
            value={form.label}
            onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            placeholder="Label, e.g. Groq account 2"
            className="vivk-input md:col-span-1"
            required
            maxLength={100}
          />
          <input
            value={form.apiKey}
            onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
            placeholder={`${PROVIDERS.find(p => p.id === form.provider)!.prefix}…`}
            className="vivk-input md:col-span-2 font-mono"
            type="password"
            autoComplete="off"
            required
          />
          <input
            value={form.priority}
            onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
            placeholder="Priority"
            title="Lower is used first; keys with the same priority share the load"
            className="vivk-input"
            type="number"
            min={0}
            max={999}
          />
          <input
            value={form.dailyLimit}
            onChange={e => setForm(f => ({ ...f, dailyLimit: e.target.value }))}
            placeholder="Daily limit (optional)"
            className="vivk-input"
            type="number"
            min={1}
          />
        </div>
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-slate-400">The key is tested with the provider, then stored encrypted. It is never shown again.</p>
          <button type="submit" disabled={isAdding || !encryptionConfigured} className="vivk-btn-primary text-sm">
            {isAdding ? 'Testing & saving...' : 'Add key'}
          </button>
        </div>
      </form>

      {/* Keys per provider */}
      <div className="space-y-6">
        {PROVIDERS.map(provider => {
          const providerKeys = keys.filter(k => k.provider === provider.id)
          const providerEnvKeys = envKeys.filter(k => k.provider === provider.id)
          const activeCount = providerKeys.filter(k => k.status === 'active').length + providerEnvKeys.filter(k => k.status === 'active').length

          return (
            <section key={provider.id}>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-base font-semibold text-vivk-navy">{provider.name}</h2>
                <span className="text-xs text-slate-500">
                  {activeCount} active · {provider.usedFor}
                </span>
              </div>

              {providerKeys.length === 0 && providerEnvKeys.length === 0 && (
                <div className="vivk-card p-5 text-sm text-slate-500">No {provider.name} keys yet.</div>
              )}

              <div className="space-y-3">
                {providerKeys.map(key => (
                  <div key={key.id} className={`vivk-card p-5 ${!key.enabled ? 'opacity-70' : ''}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-vivk-blue/[0.08] flex items-center justify-center flex-shrink-0">
                          <Key className="w-4 h-4 text-vivk-blue" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-vivk-navy truncate">{key.label}</p>
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[key.status].className}`}>
                              {STATUS_STYLES[key.status].label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-mono">{key.keyMasked}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => testKey(key.id)}
                          disabled={busyId === key.id}
                          className="p-2 text-slate-400 hover:text-vivk-blue hover:bg-slate-50 rounded-lg"
                          title="Test key"
                          aria-label="Test key"
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updateKey(key.id, { enabled: !key.enabled })}
                          disabled={busyId === key.id}
                          className={`p-2 hover:bg-slate-50 rounded-lg ${key.enabled ? 'text-emerald-600' : 'text-slate-400'}`}
                          title={key.enabled ? 'Disable key' : 'Enable key'}
                          aria-label={key.enabled ? 'Disable key' : 'Enable key'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteKey(key)}
                          disabled={busyId === key.id}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete key"
                          aria-label="Delete key"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4 text-xs">
                      <button onClick={() => editNumber(key, 'priority')} className="text-left p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100">
                        <p className="text-slate-400">Priority</p>
                        <p className="font-semibold text-vivk-navy">{key.priority}</p>
                      </button>
                      <button onClick={() => editNumber(key, 'dailyLimit')} className="text-left p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100">
                        <p className="text-slate-400">Today / limit</p>
                        <p className="font-semibold text-vivk-navy">
                          {key.requestsToday.toLocaleString('en-IN')} / {key.dailyLimit === null ? '∞' : key.dailyLimit.toLocaleString('en-IN')}
                        </p>
                      </button>
                      <div className="p-2.5 rounded-lg bg-slate-50">
                        <p className="text-slate-400">Errors today</p>
                        <p className={`font-semibold ${key.errorsToday ? 'text-amber-600' : 'text-vivk-navy'}`}>{key.errorsToday}</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50">
                        <p className="text-slate-400">Total requests</p>
                        <p className="font-semibold text-vivk-navy">{key.totalRequests.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50">
                        <p className="text-slate-400">Last used</p>
                        <p className="font-semibold text-vivk-navy">{formatTime(key.lastUsedAt)}</p>
                      </div>
                    </div>

                    {(key.disabledReason || key.lastError) && (
                      <div className="mt-3 text-xs text-slate-500 flex items-start gap-1.5">
                        <Activity className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span className="break-all">
                          {key.disabledReason && <span className="font-medium">{key.disabledReason}. </span>}
                          {key.lastError && <>Last error {formatTime(key.lastErrorAt)}: {key.lastError}</>}
                        </span>
                      </div>
                    )}
                  </div>
                ))}

                {providerEnvKeys.map(key => (
                  <div key={key.id} className="vivk-card p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <Key className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-vivk-navy truncate">{key.label}</p>
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[key.status].className}`}>
                              {STATUS_STYLES[key.status].label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-mono">{key.keyMasked} · used after the keys above · change it in Vercel</p>
                        </div>
                      </div>
                      <button
                        onClick={() => testKey(key.id)}
                        disabled={busyId === key.id}
                        className="p-2 text-slate-400 hover:text-vivk-blue hover:bg-slate-50 rounded-lg"
                        title="Test key"
                        aria-label="Test key"
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
