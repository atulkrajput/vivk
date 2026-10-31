'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, Check, AlertCircle, Shield, Globe } from 'lucide-react'

export default function AdminSettingsPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/maintenance')
      if (response.ok) {
        const data = await response.json()
        setMaintenanceMode(data.enabled)
        setMaintenanceMessage(data.message || '')
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const handleSaveMaintenace = async () => {
    setIsSaving(true)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: maintenanceMode, message: maintenanceMessage }),
      })
      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved' })
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setIsSaving(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-vivk-navy">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Platform configuration and maintenance</p>
      </div>

      {message && (
        <div className={`mb-6 p-3.5 rounded-xl flex items-center gap-2 text-sm ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Maintenance Mode */}
        <div className="vivk-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-slate-400" />
            <h3 className="text-base font-semibold text-vivk-navy">Maintenance Mode</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Enable maintenance mode to show a maintenance page to all users while you perform updates.
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Enable Maintenance Mode</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-checked:bg-red-500 rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
              </label>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Maintenance Message</label>
              <textarea
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                placeholder="We're performing scheduled maintenance..."
                rows={3}
                className="w-full vivk-input text-sm resize-none"
              />
            </div>

            <button onClick={handleSaveMaintenace} disabled={isSaving} className="vivk-btn-primary text-sm flex items-center gap-2">
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Platform Info */}
        <div className="vivk-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-slate-400" />
            <h3 className="text-base font-semibold text-vivk-navy">Platform Info</h3>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-slate-500">Version</span>
              <span className="font-medium text-vivk-navy">0.1.0 (MVP)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-slate-500">Framework</span>
              <span className="font-medium text-vivk-navy">Next.js 15</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-slate-500">Database</span>
              <span className="font-medium text-vivk-navy">MySQL</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-slate-500">AI Provider</span>
              <span className="font-medium text-vivk-navy">Anthropic (Claude)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-slate-500">Payment Gateway</span>
              <span className="font-medium text-vivk-navy">Razorpay</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Deployment</span>
              <span className="font-medium text-vivk-navy">Vercel</span>
            </div>
          </div>
        </div>

        {/* Admin Access */}
        <div className="vivk-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-slate-400" />
            <h3 className="text-base font-semibold text-vivk-navy">Admin Access</h3>
          </div>
          <p className="text-sm text-slate-500 mb-3">
            Admin access is granted to users with <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">@vivk.in</code> email domain.
          </p>
          <div className="bg-vivk-bg rounded-xl p-4 text-sm text-slate-600">
            <p className="font-medium text-vivk-navy mb-2">Authorized domains:</p>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                *@vivk.in
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
