'use client'

import { useState, useEffect } from 'react'
import { Wrench, Clock, RefreshCw } from 'lucide-react'
import { Button } from './Button'
import { Logo } from './Logo'

interface MaintenanceModeProps {
  message?: string
  estimatedTime?: string
  showRetry?: boolean
}

export function MaintenanceMode({ 
  message = "VIVK is currently under maintenance. We'll be back shortly.",
  estimatedTime,
  showRetry = true
}: MaintenanceModeProps) {
  const [isChecking, setIsChecking] = useState(false)

  const handleRetry = async () => {
    setIsChecking(true)
    
    try {
      // Check if maintenance mode is still active
      const response = await fetch('/api/health')
      if (response.ok) {
        // Maintenance is over, reload the page
        window.location.reload()
      }
    } catch (error) {
      // Still in maintenance mode or network error
      console.log('Still in maintenance mode')
    } finally {
      setIsChecking(false)
    }
  }

  // Auto-check every 30 seconds
  useEffect(() => {
    if (!showRetry) return

    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/health')
        if (response.ok) {
          window.location.reload()
        }
      } catch (error) {
        // Still in maintenance mode
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [showRetry])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Logo size="lg" />
        </div>
        
        {/* Maintenance Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <Wrench className="h-16 w-16 text-blue-500" />
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-orange-400 rounded-full animate-pulse" />
          </div>
        </div>
        
        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Under Maintenance
        </h1>
        
        {/* Message */}
        <p className="text-gray-600 mb-6 leading-relaxed">
          {message}
        </p>
        
        {/* Estimated Time */}
        {estimatedTime && (
          <div className="flex items-center justify-center mb-6 text-sm text-gray-500">
            <Clock className="h-4 w-4 mr-2" />
            <span>Estimated time: {estimatedTime}</span>
          </div>
        )}
        
        {/* Retry Button */}
        {showRetry && (
          <Button
            onClick={handleRetry}
            disabled={isChecking}
            className="w-full"
            variant="primary"
          >
            {isChecking ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Again
              </>
            )}
          </Button>
        )}
        
        {/* Status Updates */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-400 mb-2">
            For updates, follow us on:
          </p>
          <div className="flex justify-center space-x-4 text-xs">
            <a 
              href="https://twitter.com/vivk_ai" 
              className="text-blue-500 hover:text-blue-600"
              target="_blank"
              rel="noopener noreferrer"
            >
              Twitter
            </a>
            <a 
              href="mailto:support@vivk.in" 
              className="text-blue-500 hover:text-blue-600"
            >
              Email
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// Maintenance banner for partial maintenance
export function MaintenanceBanner({ 
  message = "Some features may be temporarily unavailable due to maintenance.",
  onDismiss
}: {
  message?: string
  onDismiss?: () => void
}) {
  return (
    <div className="bg-orange-100 border-l-4 border-orange-500 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Wrench className="h-5 w-5 text-orange-500 mr-3" />
          <p className="text-sm text-orange-700">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-orange-500 hover:text-orange-600"
          >
            <span className="sr-only">Dismiss</span>
            ×
          </button>
        )}
      </div>
    </div>
  )
}