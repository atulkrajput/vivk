'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { PaymentModal } from './PaymentModal'
import { 
  type SubscriptionPlan, 
  type SubscriptionTier,
  SUBSCRIPTION_PLANS,
  getSubscriptionStatusDisplay,
  formatSubscriptionDate,
  isSubscriptionExpiringSoon
} from '@/lib/subscriptions'

interface SubscriptionCardProps {
  currentTier: SubscriptionTier
  currentStatus: string
  expiresAt?: Date | string | null
  currentPlan: SubscriptionPlan
  onUpgrade?: (targetTier: SubscriptionTier) => void
  onCancel?: () => void
  onPaymentSuccess?: () => void
  className?: string
}

export function SubscriptionCard({
  currentTier,
  currentStatus,
  expiresAt,
  currentPlan,
  onUpgrade,
  onCancel,
  onPaymentSuccess,
  className = ''
}: SubscriptionCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  
  const statusDisplay = getSubscriptionStatusDisplay(currentStatus as any)
  const isExpiringSoon = expiresAt ? isSubscriptionExpiringSoon(expiresAt) : false
  const isFreeTier = currentTier === 'free'
  const isPaidTier = currentTier === 'pro' || currentTier === 'business'

  const handleUpgrade = async (targetTier: SubscriptionTier) => {
    const plan = SUBSCRIPTION_PLANS[targetTier]
    
    // For paid plans, show payment modal
    if (plan.price > 0) {
      setSelectedPlan(plan)
      setShowPaymentModal(true)
      return
    }
    
    // For free plan, use the callback
    setIsLoading(true)
    try {
      await onUpgrade?.(targetTier)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false)
    setSelectedPlan(null)
    onPaymentSuccess?.()
  }

  const handleCancel = async () => {
    setIsLoading(true)
    try {
      await onCancel?.()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg border-2 ${
      currentPlan.popular ? 'border-blue-500' : 'border-gray-200'
    } ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{currentPlan.name} Plan</h3>
            <div className="flex items-center mt-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusDisplay.bgColor} ${statusDisplay.color}`}>
                {statusDisplay.text}
              </span>
              {currentPlan.popular && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Most Popular
                </span>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900">{currentPlan.priceDisplay}</div>
            <div className="text-sm text-gray-500">per month</div>
          </div>
        </div>

        {/* Expiry Warning */}
        {isExpiringSoon && expiresAt && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-yellow-800">
                Your subscription expires on {formatSubscriptionDate(expiresAt)}
              </span>
            </div>
          </div>
        )}

        {/* Billing Info */}
        {isPaidTier && expiresAt && (
          <div className="mt-4 text-sm text-gray-600">
            {currentStatus === 'cancelled' 
              ? `Access until ${formatSubscriptionDate(expiresAt)}`
              : `Next billing: ${formatSubscriptionDate(expiresAt)}`
            }
          </div>
        )}
      </div>

      {/* Features */}
      <div className="p-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">What's included:</h4>
        <ul className="space-y-2">
          {currentPlan.features.map((feature, index) => (
            <li key={index} className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="p-6 border-t border-gray-200 bg-gray-50">
        <div className="space-y-3">
          {/* Upgrade Options */}
          {isFreeTier && (
            <div className="space-y-2">
              <Button
                onClick={() => handleUpgrade('pro')}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? 'Processing...' : 'Upgrade to Pro - ₹499/month'}
              </Button>
              <Button
                onClick={() => handleUpgrade('business')}
                disabled={isLoading}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white"
              >
                {isLoading ? 'Processing...' : 'Upgrade to Business - ₹2,999/month'}
              </Button>
            </div>
          )}

          {currentTier === 'pro' && (
            <div className="space-y-2">
              <Button
                onClick={() => handleUpgrade('business')}
                disabled={isLoading}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white"
              >
                {isLoading ? 'Processing...' : 'Upgrade to Business - ₹2,999/month'}
              </Button>
            </div>
          )}

          {/* Cancel Subscription */}
          {isPaidTier && currentStatus === 'active' && (
            <Button
              onClick={handleCancel}
              disabled={isLoading}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? 'Processing...' : 'Cancel Subscription'}
            </Button>
          )}

          {/* Reactivate if cancelled */}
          {isPaidTier && currentStatus === 'cancelled' && (
            <Button
              onClick={() => handleUpgrade(currentTier)}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? 'Processing...' : 'Reactivate Subscription'}
            </Button>
          )}
        </div>

        {/* Downgrade Info */}
        {isPaidTier && (
          <div className="mt-4 text-center">
            <button className="text-sm text-gray-500 hover:text-gray-700 underline">
              Need to downgrade? Contact support
            </button>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {selectedPlan && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false)
            setSelectedPlan(null)
          }}
          plan={selectedPlan}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  )
}