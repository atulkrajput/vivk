'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { PaymentModal } from './PaymentModal'
import { 
  type SubscriptionPlan, 
  type SubscriptionTier,
  SUBSCRIPTION_PLANS,
  canUpgradeTo
} from '@/lib/subscriptions'

interface PricingPlansProps {
  currentTier: SubscriptionTier
  onSelectPlan?: (planId: SubscriptionTier) => void
  onPaymentSuccess?: () => void
  showCurrentPlan?: boolean
  className?: string
}

export function PricingPlans({
  currentTier,
  onSelectPlan,
  onPaymentSuccess,
  showCurrentPlan = true,
  className = ''
}: PricingPlansProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  
  const plans = Object.values(SUBSCRIPTION_PLANS)

  const handleSelectPlan = async (planId: SubscriptionTier) => {
    if (planId === currentTier) return
    
    const plan = SUBSCRIPTION_PLANS[planId]
    
    // For paid plans, show payment modal
    if (plan.price > 0 && canUpgradeTo(currentTier, planId)) {
      setSelectedPlan(plan)
      setShowPaymentModal(true)
      return
    }
    
    // For free plan or downgrades, use the callback
    setIsLoading(planId)
    try {
      onSelectPlan?.(planId)
    } finally {
      setIsLoading(null)
    }
  }

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false)
    setSelectedPlan(null)
    onPaymentSuccess?.()
  }

  const getPlanButtonText = (plan: SubscriptionPlan): string => {
    if (plan.id === currentTier) {
      return 'Current Plan'
    }
    
    if (plan.id === 'free') {
      return 'Downgrade to Free'
    }
    
    if (canUpgradeTo(currentTier, plan.id)) {
      return `Upgrade to ${plan.name}`
    }
    
    return `Switch to ${plan.name}`
  }

  const getPlanButtonStyle = (plan: SubscriptionPlan): string => {
    if (plan.id === currentTier) {
      return 'bg-gray-300 text-gray-500 cursor-not-allowed'
    }
    
    if (plan.popular) {
      return 'bg-blue-600 hover:bg-blue-700 text-white'
    }
    
    return 'bg-gray-600 hover:bg-gray-700 text-white'
  }

  return (
    <div className={`${className}`}>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Plan</h2>
        <p className="text-lg text-gray-600">
          Unlock the full potential of VIVK with our affordable pricing
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-white rounded-lg shadow-lg border-2 ${
              plan.popular 
                ? 'border-blue-500 transform scale-105' 
                : plan.id === currentTier
                ? 'border-green-500'
                : 'border-gray-200'
            } transition-all duration-200`}
          >
            {/* Popular Badge */}
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
            )}

            {/* Current Plan Badge */}
            {plan.id === currentTier && showCurrentPlan && (
              <div className="absolute -top-3 right-4">
                <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                  Current
                </span>
              </div>
            )}

            <div className="p-6">
              {/* Plan Header */}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">{plan.priceDisplay}</span>
                  {plan.price > 0 && (
                    <span className="text-gray-500 ml-1">/month</span>
                  )}
                </div>
                {plan.price > 0 && (
                  <p className="text-sm text-gray-600">
                    Billed monthly • Cancel anytime
                  </p>
                )}
              </div>

              {/* Features List */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Action Button */}
              <Button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={plan.id === currentTier || isLoading === plan.id}
                className={`w-full ${getPlanButtonStyle(plan)}`}
              >
                {isLoading === plan.id ? (
                  <div className="flex items-center justify-center">
                    <svg className="w-4 h-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </div>
                ) : (
                  getPlanButtonText(plan)
                )}
              </Button>

              {/* Savings Badge */}
              {plan.id === 'pro' && (
                <div className="mt-3 text-center">
                  <span className="text-sm text-green-600 font-medium">
                    Save 70% vs international alternatives!
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Additional Info */}
      <div className="mt-8 text-center text-sm text-gray-600">
        <p>All plans include secure data storage and 24/7 uptime</p>
        <p className="mt-1">
          Need help choosing? <a href="#" className="text-blue-600 hover:underline">Contact our support team</a>
        </p>
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