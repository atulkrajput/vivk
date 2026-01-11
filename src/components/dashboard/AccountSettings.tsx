'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/Button'

interface AccountSettingsProps {
  user: {
    id: string
    email: string
    createdAt: string
    totalConversations: number
  }
}

export function AccountSettings({ user }: AccountSettingsProps) {
  const { data: session, update } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  // Email update state
  const [newEmail, setNewEmail] = useState(user.email)
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false)
  
  // Password update state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newEmail === user.email) {
      setMessage({ type: 'error', text: 'New email must be different from current email' })
      return
    }

    setIsUpdatingEmail(true)
    setMessage(null)

    try {
      const response = await fetch('/api/user/update-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Email updated successfully! Please verify your new email.' })
        // Update session with new email
        await update({ email: newEmail })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update email' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while updating email' })
    } finally {
      setIsUpdatingEmail(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long' })
      return
    }

    setIsUpdatingPassword(true)
    setMessage(null)

    try {
      const response = await fetch('/api/user/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Password updated successfully!' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update password' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while updating password' })
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return
    }

    if (!confirm('This will permanently delete all your conversations and data. Are you absolutely sure?')) {
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE'
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Account deletion initiated. You will be logged out shortly.' })
        // Redirect to home page after a delay
        setTimeout(() => {
          window.location.href = '/'
        }, 3000)
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || 'Failed to delete account' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while deleting account' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Account Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account ID
            </label>
            <div className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded">
              {user.id}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Member Since
            </label>
            <div className="text-sm text-gray-600">
              {new Date(user.createdAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Conversations
            </label>
            <div className="text-sm text-gray-600">
              {user.totalConversations}
            </div>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`rounded-lg p-4 ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Email Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Settings</h3>
        
        <form onSubmit={handleEmailUpdate} className="space-y-4">
          <div>
            <label htmlFor="current-email" className="block text-sm font-medium text-gray-700 mb-1">
              Current Email
            </label>
            <input
              type="email"
              id="current-email"
              value={user.email}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>
          
          <div>
            <label htmlFor="new-email" className="block text-sm font-medium text-gray-700 mb-1">
              New Email
            </label>
            <input
              type="email"
              id="new-email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter new email address"
            />
          </div>
          
          <Button
            type="submit"
            disabled={isUpdatingEmail || newEmail === user.email}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isUpdatingEmail ? 'Updating...' : 'Update Email'}
          </Button>
        </form>
      </div>

      {/* Password Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Password Settings</h3>
        
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div>
            <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              id="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter current password"
            />
          </div>
          
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter new password (min 8 characters)"
            />
          </div>
          
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Confirm new password"
            />
          </div>
          
          <Button
            type="submit"
            disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isUpdatingPassword ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-lg shadow border-2 border-red-200 p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-4">Danger Zone</h3>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-medium text-red-800 mb-2">Delete Account</h4>
          <p className="text-sm text-red-700 mb-4">
            Once you delete your account, there is no going back. This will permanently delete:
          </p>
          <ul className="text-sm text-red-700 list-disc list-inside space-y-1 mb-4">
            <li>All your conversations and messages</li>
            <li>Your subscription and billing history</li>
            <li>Your account settings and preferences</li>
            <li>All associated data</li>
          </ul>
        </div>
        
        <Button
          onClick={handleDeleteAccount}
          disabled={isLoading}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          {isLoading ? 'Deleting...' : 'Delete Account'}
        </Button>
      </div>
    </div>
  )
}