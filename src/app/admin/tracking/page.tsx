'use client'

import { useState, useEffect } from 'react'
import { Code2, Save, Plus, Trash2, Check, AlertCircle } from 'lucide-react'

interface TrackingCode {
  id: string
  name: string
  type: 'ga' | 'fb_pixel' | 'gtm' | 'custom'
  code: string
  enabled: boolean
  placement: 'head' | 'body'
}

const DEFAULT_CODES: TrackingCode[] = [
  { id: 'ga', name: 'Google Analytics', type: 'ga', code: '', enabled: true, placement: 'head' },
  { id: 'fb', name: 'Facebook Pixel', type: 'fb_pixel', code: '', enabled: false, placement: 'head' },
  { id: 'gtm', name: 'Google Tag Manager', type: 'gtm', code: '', enabled: false, placement: 'head' },
]

export default function AdminTrackingPage() {
  const [codes, setCodes] = useState<TrackingCode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [newCodeName, setNewCodeName] = useState('')

  useEffect(() => {
    fetchCodes()
  }, [])

  const fetchCodes = async () => {
    try {
      const response = await fetch('/api/admin/tracking')
      if (response.ok) {
        const data = await response.json()
        setCodes(data.codes?.length > 0 ? data.codes : DEFAULT_CODES)
      } else {
        setCodes(DEFAULT_CODES)
      }
    } catch {
      setCodes(DEFAULT_CODES)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage(null)
    try {
      const response = await fetch('/api/admin/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes }),
      })
      if (response.ok) {
        setSaveMessage({ type: 'success', text: 'Tracking codes saved successfully' })
      } else {
        setSaveMessage({ type: 'error', text: 'Failed to save tracking codes' })
      }
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to save tracking codes' })
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }

  const updateCode = (id: string, field: keyof TrackingCode, value: any) => {
    setCodes(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  const addCustomCode = () => {
    if (!newCodeName.trim()) return
    const newCode: TrackingCode = {
      id: `custom_${Date.now()}`,
      name: newCodeName.trim(),
      type: 'custom',
      code: '',
      enabled: false,
      placement: 'head',
    }
    setCodes(prev => [...prev, newCode])
    setNewCodeName('')
  }

  const removeCode = (id: string) => {
    setCodes(prev => prev.filter(c => c.id !== id))
  }

  const typeLabel = (type: string) => {
    const labels: Record<string, string> = {
      ga: 'Google Analytics',
      fb_pixel: 'Facebook Pixel',
      gtm: 'Google Tag Manager',
      custom: 'Custom Script',
    }
    return labels[type] || type
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-100 rounded w-1/3"></div>
          {[1, 2, 3].map(i => <div key={i} className="h-40 bg-slate-100 rounded-xl"></div>)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-vivk-navy">Tracking Codes</h1>
          <p className="text-sm text-slate-500 mt-1">Manage GA, Facebook Pixel, GTM and custom tracking scripts</p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="vivk-btn-primary text-sm flex items-center gap-2">
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save All'}
        </button>
      </div>

      {saveMessage && (
        <div className={`mb-6 p-3.5 rounded-xl flex items-center gap-2 text-sm ${
          saveMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {saveMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {saveMessage.text}
        </div>
      )}

      {/* Tracking Codes List */}
      <div className="space-y-4 mb-8">
        {codes.map((code) => (
          <div key={code.id} className="vivk-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Code2 className="w-4 h-4 text-slate-400" />
                <div>
                  <h3 className="text-sm font-semibold text-vivk-navy">{code.name}</h3>
                  <p className="text-[11px] text-slate-400">{typeLabel(code.type)} · Placement: {code.placement}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Enabled toggle */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={code.enabled}
                    onChange={(e) => updateCode(code.id, 'enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-checked:bg-vivk-blue rounded-full peer-focus:ring-2 peer-focus:ring-vivk-blue/20 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
                </label>
                {code.type === 'custom' && (
                  <button
                    onClick={() => removeCode(code.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Placement selector */}
            <div className="flex items-center gap-3 mb-3">
              <label className="text-xs text-slate-500">Inject in:</label>
              <select
                value={code.placement}
                onChange={(e) => updateCode(code.id, 'placement', e.target.value)}
                className="text-xs vivk-input py-1.5 px-2.5"
              >
                <option value="head">&lt;head&gt;</option>
                <option value="body">&lt;body&gt; (end)</option>
              </select>
            </div>

            {/* Code input */}
            <textarea
              value={code.code}
              onChange={(e) => updateCode(code.id, 'code', e.target.value)}
              placeholder={
                code.type === 'ga' ? 'Enter Google Analytics Measurement ID (e.g. G-XXXXXXXXXX)' :
                code.type === 'fb_pixel' ? 'Enter Facebook Pixel ID (e.g. 1234567890)' :
                code.type === 'gtm' ? 'Enter GTM Container ID (e.g. GTM-XXXXXXX)' :
                'Paste full script tag or tracking code here...'
              }
              rows={code.type === 'custom' ? 5 : 2}
              className="w-full vivk-input font-mono text-xs resize-none"
            />
          </div>
        ))}
      </div>

      {/* Add Custom Code */}
      <div className="vivk-card p-5">
        <h3 className="text-sm font-semibold text-vivk-navy mb-3">Add Custom Tracking Code</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={newCodeName}
            onChange={(e) => setNewCodeName(e.target.value)}
            placeholder="Script name (e.g. Hotjar, Clarity...)"
            className="flex-1 vivk-input text-sm"
            onKeyDown={(e) => e.key === 'Enter' && addCustomCode()}
          />
          <button onClick={addCustomCode} disabled={!newCodeName.trim()} className="vivk-btn-secondary text-sm flex items-center gap-2 disabled:opacity-40">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>
    </div>
  )
}
