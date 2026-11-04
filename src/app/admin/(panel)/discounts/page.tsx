'use client'

import { useState, useEffect } from 'react'
import { TicketPercent, Plus, Copy, Check, Trash2, Shuffle, Pencil, Search, X } from 'lucide-react'

interface DiscountCode {
  id: string
  code: string
  description: string | null
  discount_type: 'percent' | 'flat'
  discount_value: number // percent or paise
  applicable_tier: 'all' | 'pro' | 'business'
  max_uses: number | null
  max_uses_per_user: number
  used_count: number
  valid_from: string | null
  valid_until: string | null
  is_active: number
  created_at: string
  total_discount: number
  total_revenue: number
}

interface Redemption {
  id: string
  order_id: string
  code: string
  subscription_tier: string
  original_amount: number
  discount_amount: number
  final_amount: number
  created_at: string
  email: string | null
  full_name: string | null
}

const EMPTY_FORM = {
  code: '',
  description: '',
  discountType: 'percent' as 'percent' | 'flat',
  discountValue: '',
  applicableTier: 'all',
  maxUses: '',
  maxUsesPerUser: '1',
  validFrom: '',
  validUntil: '',
}

const TIER_LABELS: Record<string, string> = { all: 'All plans', pro: 'Pro', business: 'Business' }

function formatAmount(paise: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(paise / 100)
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : null
}

// datetime-local wants local time without seconds or zone
function toLocalInput(value: string | null) {
  if (!value) return ''
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function codeStatus(c: DiscountCode): { label: string; style: string } {
  const now = Date.now()
  if (!c.is_active) return { label: 'Disabled', style: 'bg-slate-100 text-slate-600' }
  if (c.valid_until && new Date(c.valid_until).getTime() < now) return { label: 'Expired', style: 'bg-red-50 text-red-700' }
  if (c.max_uses !== null && c.used_count >= c.max_uses) return { label: 'Used up', style: 'bg-red-50 text-red-700' }
  if (c.valid_from && new Date(c.valid_from).getTime() > now) return { label: 'Scheduled', style: 'bg-amber-50 text-amber-700' }
  return { label: 'Active', style: 'bg-emerald-50 text-emerald-700' }
}

export default function AdminDiscountsPage() {
  const [codes, setCodes] = useState<DiscountCode[]>([])
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [created, setCreated] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [editing, setEditing] = useState<DiscountCode | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchCodes()
  }, [])

  const fetchCodes = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/discounts')
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        setCodes(data.codes || [])
        setRedemptions(data.redemptions || [])
        setError(null)
      } else {
        setError(data.error || 'Failed to load discount codes')
      }
    } catch (error) {
      console.error('Failed to load discount codes:', error)
      setError('Failed to load discount codes')
    } finally {
      setIsLoading(false)
    }
  }

  const typedCode = form.code.trim().toUpperCase()
  const existingCode = !editing && typedCode ? codes.find((c) => c.code === typedCode) : undefined
  const editingUsed = editing ? editing.used_count > 0 : false

  const query = search.trim().toUpperCase()
  const visibleCodes = query
    ? codes.filter((c) => c.code.includes(query) || (c.description || '').toUpperCase().includes(query))
    : codes

  const startEdit = (c: DiscountCode) => {
    setEditing(c)
    setCreated(null)
    setFormError(null)
    setForm({
      code: c.code,
      description: c.description || '',
      discountType: c.discount_type,
      discountValue: String(c.discount_type === 'percent' ? c.discount_value : c.discount_value / 100),
      applicableTier: c.applicable_tier,
      maxUses: c.max_uses === null ? '' : String(c.max_uses),
      maxUsesPerUser: String(c.max_uses_per_user),
      validFrom: toLocalInput(c.valid_from),
      validUntil: toLocalInput(c.valid_until),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (existingCode) {
      setFormError(`Code ${existingCode.code} already exists`)
      return
    }
    setFormError(null)
    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/discounts', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          ...(editing ? { id: editing.id } : {}),
          // datetime-local is in the admin's timezone; send an absolute time
          validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : '',
          validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : '',
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setFormError(data.error || (editing ? 'Failed to update discount code' : 'Failed to create discount code'))
        return
      }
      setCreated(editing ? null : data.code.code)
      setEditing(null)
      setForm(EMPTY_FORM)
      fetchCodes()
    } catch (error) {
      setFormError(editing ? 'Failed to update discount code' : 'Failed to create discount code')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleActive = async (c: DiscountCode) => {
    const response = await fetch('/api/admin/discounts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id, isActive: !c.is_active }),
    })
    if (response.ok) fetchCodes()
  }

  const deleteCode = async (c: DiscountCode) => {
    if (!confirm(`Delete discount code ${c.code}?`)) return
    const response = await fetch(`/api/admin/discounts?id=${encodeURIComponent(c.id)}`, { method: 'DELETE' })
    const data = await response.json().catch(() => ({}))
    if (response.ok) fetchCodes()
    else alert(data.error || 'Failed to delete discount code')
  }

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(code)
      setTimeout(() => setCopied(null), 1500)
    } catch {}
  }

  const update = (field: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const inputClass = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-vivk-blue'
  const labelClass = 'block text-xs font-medium text-slate-600 mb-1'

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-vivk-navy">Discount Codes</h1>
        <p className="text-sm text-slate-500 mt-1">Create ₹ or % off codes with a validity window and a usage limit</p>
      </div>

      {/* Create */}
      <form onSubmit={handleCreate} className="vivk-card p-5 mb-8">
        <div className="flex items-center gap-2 mb-4">
          {editing ? <Pencil className="w-4 h-4 text-vivk-blue" /> : <Plus className="w-4 h-4 text-vivk-blue" />}
          <h2 className="font-semibold text-vivk-navy">
            {editing ? <>Edit <span className="font-mono">{editing.code}</span></> : 'Generate a code'}
          </h2>
          {editing && (
            <button type="button" onClick={cancelEdit} className="ml-auto text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Cancel edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>Code</label>
            <div className="flex gap-2">
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="Leave blank to auto-generate"
                className={`${inputClass} font-mono ${editing ? 'bg-slate-50 text-slate-500' : ''}`}
                maxLength={40}
                readOnly={!!editing}
              />
              <button
                type="button"
                disabled={!!editing}
                title="Random code"
                aria-label="Random code"
                onClick={() => {
                  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
                  const suffix = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => alphabet[b % alphabet.length]).join('')
                  setForm((f) => ({ ...f, code: `VIVK-${suffix}` }))
                }}
                className="px-2.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50"
              >
                <Shuffle className="w-4 h-4" />
              </button>
            </div>
            {existingCode && (
              <p className="text-xs text-red-600 mt-1">
                Already exists ({codeStatus(existingCode).label.toLowerCase()}).{' '}
                <button type="button" onClick={() => startEdit(existingCode)} className="underline">Edit it</button>
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Discount type</label>
            <select value={form.discountType} onChange={update('discountType')} className={inputClass} disabled={editingUsed}>
              <option value="percent">Percentage (%)</option>
              <option value="flat">Flat amount (₹)</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>{form.discountType === 'percent' ? 'Percent off' : 'Rupees off'}</label>
            <input
              type="number"
              required
              min={1}
              max={form.discountType === 'percent' ? 100 : undefined}
              step={form.discountType === 'percent' ? 1 : 0.01}
              value={form.discountValue}
              onChange={update('discountValue')}
              placeholder={form.discountType === 'percent' ? 'e.g. 20' : 'e.g. 200'}
              className={inputClass}
              disabled={editingUsed}
            />
          </div>
          <div>
            <label className={labelClass}>Plan</label>
            <select value={form.applicableTier} onChange={update('applicableTier')} className={inputClass}>
              <option value="all">All paid plans</option>
              <option value="pro">Pro only</option>
              <option value="business">Business only</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Total uses (NOS)</label>
            <input type="number" min={1} step={1} value={form.maxUses} onChange={update('maxUses')} placeholder="Unlimited" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Uses per user</label>
            <input type="number" min={1} step={1} required value={form.maxUsesPerUser} onChange={update('maxUsesPerUser')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Valid from</label>
            <input type="datetime-local" value={form.validFrom} onChange={update('validFrom')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Valid until</label>
            <input type="datetime-local" value={form.validUntil} onChange={update('validUntil')} className={inputClass} />
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <label className={labelClass}>Note (admin only)</label>
            <input value={form.description} onChange={update('description')} placeholder="e.g. Diwali campaign" className={inputClass} maxLength={255} />
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-3">
          Leave dates blank to start now and never expire. The final price never goes below ₹1 (Razorpay minimum).
          {editingUsed && ' This code has been used, so its discount amount is locked; limits, plan and dates can still change.'}
        </p>

        {formError && <p className="text-sm text-red-600 mt-3">{formError}</p>}
        {created && (
          <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
            <Check className="w-4 h-4" /> Created <span className="font-mono font-semibold">{created}</span>
            <button type="button" onClick={() => copyCode(created)} className="text-xs underline">
              {copied === created ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={isSaving || !!existingCode}
          className="mt-4 px-4 py-2 rounded-lg bg-vivk-blue text-white text-sm font-medium disabled:opacity-50 hover:opacity-90"
        >
          {editing ? (isSaving ? 'Saving...' : 'Save changes') : isSaving ? 'Creating...' : 'Create discount code'}
        </button>
      </form>

      {/* Codes */}
      <div className="vivk-card overflow-hidden mb-8">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center gap-2">
          <TicketPercent className="w-4 h-4 text-vivk-blue" />
          <h2 className="font-semibold text-vivk-navy">All codes</h2>
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Check if a code exists"
              className={`${inputClass} pl-8 font-mono`}
              aria-label="Search codes"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-slate-600">Code</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">Discount</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">Plan</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">Used</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">Validity</th>
                <th className="text-right px-5 py-3 font-medium text-slate-600">Revenue</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-slate-500">Loading discount codes...</td></tr>
              ) : error ? (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-red-600">{error}</td></tr>
              ) : visibleCodes.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                  {query ? <>No code matches <span className="font-mono">{query}</span>, so it is free to create</> : 'No discount codes yet'}
                </td></tr>
              ) : (
                visibleCodes.map((c) => {
                  const status = codeStatus(c)
                  return (
                    <tr key={c.id} className="border-b border-slate-50">
                      <td className="px-5 py-3">
                        <button onClick={() => copyCode(c.code)} className="font-mono font-semibold text-vivk-navy flex items-center gap-1.5" title="Copy">
                          {c.code}
                          {copied === c.code ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                        </button>
                        {c.description && <p className="text-xs text-slate-500">{c.description}</p>}
                      </td>
                      <td className="px-5 py-3 font-medium text-vivk-navy whitespace-nowrap">
                        {c.discount_type === 'percent' ? `${c.discount_value}% off` : `${formatAmount(c.discount_value)} off`}
                      </td>
                      <td className="px-5 py-3 text-slate-600">{TIER_LABELS[c.applicable_tier]}</td>
                      <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                        {c.used_count} / {c.max_uses ?? '∞'}
                        <p className="text-xs text-slate-400">{c.max_uses_per_user} per user</p>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">
                        <p>From: {formatDate(c.valid_from) || 'Created'}</p>
                        <p>Until: {formatDate(c.valid_until) || 'No expiry'}</p>
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <p className="font-medium text-vivk-navy">{formatAmount(Number(c.total_revenue))}</p>
                        <p className="text-xs text-slate-400">{formatAmount(Number(c.total_discount))} given</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${status.style}`}>{status.label}</span>
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <button onClick={() => startEdit(c)} className="text-xs font-medium text-vivk-blue hover:underline mr-3">
                          Edit
                        </button>
                        <button onClick={() => toggleActive(c)} className="text-xs font-medium text-vivk-blue hover:underline mr-3">
                          {c.is_active ? 'Disable' : 'Enable'}
                        </button>
                        {c.used_count === 0 && (
                          <button onClick={() => deleteCode(c)} className="text-slate-400 hover:text-red-600 align-middle" title="Delete" aria-label="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Redemptions */}
      <div className="vivk-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-vivk-navy">Recent redemptions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-slate-600">Date</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">User</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">Code</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">Plan</th>
                <th className="text-right px-5 py-3 font-medium text-slate-600">Price</th>
                <th className="text-right px-5 py-3 font-medium text-slate-600">Paid</th>
              </tr>
            </thead>
            <tbody>
              {redemptions.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500">No codes redeemed yet</td></tr>
              ) : (
                redemptions.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50">
                    <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(r.created_at)}</td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-vivk-navy">{r.full_name || r.email || 'Deleted user'}</p>
                      {r.email && <p className="text-xs text-slate-500">{r.email}</p>}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-600">{r.code}</td>
                    <td className="px-5 py-3 text-slate-600 capitalize">{r.subscription_tier}</td>
                    <td className="px-5 py-3 text-right text-slate-500 line-through whitespace-nowrap">{formatAmount(r.original_amount)}</td>
                    <td className="px-5 py-3 text-right font-medium text-vivk-navy whitespace-nowrap">{formatAmount(r.final_amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
