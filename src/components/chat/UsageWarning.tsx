'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface UsageWarningProps {
  type: 'warning' | 'limit'
  message: string
  remainingMessages?: number
  onUpgrade?: () => void
  onDismiss?: () => void
}

export function UsageWarning({
  type,
  message,
  remainingMessages,
  onUpgrade,
  onDismiss
}: UsageWarningProps) {
  const [isDismissed, setIsDismissed] = useState(false)

  if (isDismissed) {
    return null
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  const bgColor = type === 'limit' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
  const textColor = type === 'limit' ? 'text-red-800' : 'text-yellow-800'
  const iconColor = type === 'limit' ? 'text-red-400' : 'text-yellow-400'

  return (
    <div className={`${bgColor} border rounded-lg p-4 mb-4`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {type === 'limit' ? (
            <svg className={`w-5 h-5 ${iconColor}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className={`w-5 h-5 ${iconColor}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${textColor}`}>
            {type === 'limit' ? 'Daily Limit Reached' : 'Usage Warning'}
          </h3>
          <div className={`mt-1 text-sm ${textColor}`}>
            <p>{message}</p>
            {remainingMessages !== undefined && remainingMessages > 0 && (
              <p className="mt-1 font-medium">
                {remainingMessages} message{remainingMessages !== 1 ? 's' : ''} remaining today
              </p>
            )}
          </div>
          
          <div className="mt-3 flex items-center space-x-3">
            {onUpgrade && (
              <Button
                onClick={onUpgrade}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2"
              >
                Upgrade to Pro - ₹499/month
              </Button>
            )}
            
            {type === 'warning' && (
              <button
                onClick={handleDismiss}
                className={`text-sm ${textColor} hover:underline`}
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
        
        {type === 'warning' && (
          <div className="ml-auto pl-3">
            <button
              onClick={handleDismiss}
              className={`${iconColor} hover:text-gray-500`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}