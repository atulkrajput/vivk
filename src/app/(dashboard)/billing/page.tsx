'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { SubscriptionCard } from '@/components/dashboard/SubscriptionCard'
import { PricingPlans } from '@/components/dashboard/PricingPlans'
import { UsageStats } from '@/components/dashboard/UsageStats'
import { 
  type SubscriptionPlan, 
  type SubscriptionTier,
  getSubscriptionPlan 
} from '@/lib/subscriptions'

interface SubscriptionData {
  tier: SubscriptionTier
  status: string
  expiresAt?: Date | string | null
  plan: SubscriptionPlan
  subscriptionRecord?: any
}

export default function BillingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPricingPlans, setShowPricingPlans] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Load subscription data
  useEffect(() => {
    if (session?.user) {
      fetchSubscriptionData()
    }
  }, [session])

  const fetchSubscriptionData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/subscriptions')
      
      if (response.ok) {
        const data = await response.json()
        setSubscription(data.subscription)
        setAvailablePlans(data.availablePlans)
        setError(null)
      } else {
        setError('Failed to load subscription data')
      }
    } catch (error) {
      console.error('Error fetching subscription:', error)
      setError('Failed to load subscription data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpgrade = async (targetTier: SubscriptionTier) => {
    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'upgrade',
          targetTier,
          immediate: true
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Show success message
        alert(data.message)
        
        // Refresh subscription data
        await fetchSubscriptionData()
        
        // Hide pricing plans
        setShowPricingPlans(false)
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to upgrade subscription')
      }
    } catch (error) {
      console.error('Error upgrading subscription:', error)
      alert('Failed to upgrade subscription')
    }
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will maintain access until the end of your current billing period.')) {
      return
    }

    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'cancel'
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Show success message
        alert(data.message)
        
        // Refresh subscription data
        await fetchSubscriptionData()
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to cancel subscription')
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      alert('Failed to cancel subscription')
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subscription details...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-medium">{error}</p>
          </div>
          <button
            onClick={fetchSubscriptionData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="mt-2 text-gray-600">
            Manage your VIVK subscription and billing information
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Current Subscription */}
          <div className="lg:col-span-2">
            {subscription && (
              <SubscriptionCard
                currentTier={subscription.tier}
                currentStatus={subscription.status}
                expiresAt={subscription.expiresAt}
                currentPlan={subscription.plan}
                onUpgrade={handleUpgrade}
                onCancel={handleCancel}
                onPaymentSuccess={fetchSubscriptionData}
                className="mb-8"
              />
            )}

            {/* Upgrade Options */}
            {subscription?.tier === 'free' && (
              <div className="mb-8">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    Unlock Premium Features
                  </h3>
                  <p className="text-blue-800 mb-4">
                    Upgrade to Pro or Business for unlimited messages, advanced AI, and more!
                  </p>
                  <button
                    onClick={() => setShowPricingPlans(!showPricingPlans)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  >
                    {showPricingPlans ? 'Hide Plans' : 'View All Plans'}
                  </button>
                </div>
              </div>
            )}

            {/* Pricing Plans */}
            {showPricingPlans && subscription && (
              <div className="mb-8">
                <PricingPlans
                  currentTier={subscription.tier}
                  onSelectPlan={handleUpgrade}
                  onPaymentSuccess={fetchSubscriptionData}
                  showCurrentPlan={true}
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Usage Statistics */}
            <UsageStats />

            {/* Billing Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Billing Information
              </h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Plan:</span>
                  <span className="font-medium">{subscription?.plan.name}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium ${
                    subscription?.status === 'active' ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {subscription?.status}
                  </span>
                </div>
                
                {subscription?.expiresAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {subscription.status === 'cancelled' ? 'Access Until:' : 'Next Billing:'}
                    </span>
                    <span className="font-medium">
                      {new Date(subscription.expiresAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="font-medium">Razorpay</span>
                </div>
              </div>

              {subscription?.tier !== 'free' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button className="text-sm text-blue-600 hover:underline">
                    Update Payment Method
                  </button>
                </div>
              )}
            </div>

            {/* Support */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Need Help?
              </h3>
              
              <div className="space-y-3">
                <a
                  href="#"
                  className="block text-sm text-blue-600 hover:underline"
                >
                  Contact Support
                </a>
                <a
                  href="#"
                  className="block text-sm text-blue-600 hover:underline"
                >
                  Billing FAQ
                </a>
                <a
                  href="#"
                  className="block text-sm text-blue-600 hover:underline"
                >
                  Refund Policy
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}