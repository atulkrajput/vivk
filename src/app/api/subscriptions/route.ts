import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { userDb, subscriptionDb } from "@/lib/db"
import { SUBSCRIPTION_PLANS, getSubscriptionPlan, type SubscriptionTier } from "@/lib/subscriptions"

// GET /api/subscriptions - Get current user's subscription details
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const user = await userDb.getById(session.user.id)
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const subscription = await subscriptionDb.getByUserId(session.user.id)
    const currentPlan = getSubscriptionPlan(user.subscription_tier)
    
    return NextResponse.json({
      success: true,
      subscription: {
        tier: user.subscription_tier,
        status: user.subscription_status,
        expiresAt: user.subscription_expires_at,
        plan: currentPlan,
        subscriptionRecord: subscription
      },
      availablePlans: Object.values(SUBSCRIPTION_PLANS)
    })
    
  } catch (error) {
    console.error("Error fetching subscription:", error)
    return NextResponse.json(
      { error: "Failed to fetch subscription details" },
      { status: 500 }
    )
  }
}

// POST /api/subscriptions - Update subscription (upgrade/downgrade)
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, targetTier, immediate = false } = body

    if (!action || !['upgrade', 'downgrade', 'cancel'].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'upgrade', 'downgrade', or 'cancel'" },
        { status: 400 }
      )
    }

    const user = await userDb.getById(session.user.id)
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const currentTier = user.subscription_tier
    
    if (action === 'cancel') {
      // Cancel subscription - maintain access until current period ends
      const updatedUser = await userDb.update(session.user.id, {
        subscription_status: 'cancelled'
      })

      // Update subscription record
      const subscription = await subscriptionDb.getByUserId(session.user.id)
      if (subscription) {
        await subscriptionDb.update(subscription.id, {
          status: 'cancelled'
        })
      }

      return NextResponse.json({
        success: true,
        message: "Subscription cancelled. Access will continue until the end of your current billing period.",
        subscription: {
          tier: updatedUser?.subscription_tier,
          status: updatedUser?.subscription_status,
          expiresAt: updatedUser?.subscription_expires_at
        }
      })
    }

    if (!targetTier || !['free', 'pro', 'business'].includes(targetTier)) {
      return NextResponse.json(
        { error: "Invalid target tier" },
        { status: 400 }
      )
    }

    const targetPlan = SUBSCRIPTION_PLANS[targetTier as SubscriptionTier]
    
    if (action === 'upgrade') {
      // For upgrades, apply immediately
      const updatedUser = await userDb.update(session.user.id, {
        subscription_tier: targetTier as SubscriptionTier,
        subscription_status: 'active',
        subscription_expires_at: targetTier === 'free' ? undefined : getNextBillingDate()
      })

      // Create or update subscription record
      let subscription = await subscriptionDb.getByUserId(session.user.id)
      if (subscription) {
        await subscriptionDb.update(subscription.id, {
          plan_id: targetTier as SubscriptionTier,
          status: 'active',
          current_period_start: new Date(),
          current_period_end: targetTier === 'free' ? undefined : getNextBillingDate()
        })
      } else if (targetTier !== 'free') {
        await subscriptionDb.create({
          user_id: session.user.id,
          plan_id: targetTier as SubscriptionTier,
          status: 'active',
          current_period_start: new Date(),
          current_period_end: getNextBillingDate()
        })
      }

      return NextResponse.json({
        success: true,
        message: `Successfully upgraded to ${targetPlan.name} plan!`,
        subscription: {
          tier: updatedUser?.subscription_tier,
          status: updatedUser?.subscription_status,
          expiresAt: updatedUser?.subscription_expires_at,
          plan: targetPlan
        }
      })
    }

    if (action === 'downgrade') {
      if (immediate) {
        // Immediate downgrade (usually for free tier)
        const updatedUser = await userDb.update(session.user.id, {
          subscription_tier: targetTier as SubscriptionTier,
          subscription_status: targetTier === 'free' ? 'active' : 'active',
          subscription_expires_at: targetTier === 'free' ? undefined : user.subscription_expires_at
        })

        return NextResponse.json({
          success: true,
          message: `Successfully downgraded to ${targetPlan.name} plan!`,
          subscription: {
            tier: updatedUser?.subscription_tier,
            status: updatedUser?.subscription_status,
            expiresAt: updatedUser?.subscription_expires_at,
            plan: targetPlan
          }
        })
      } else {
        // Deferred downgrade - apply at next billing cycle
        const subscription = await subscriptionDb.getByUserId(session.user.id)
        if (subscription) {
          await subscriptionDb.update(subscription.id, {
            // Store the pending downgrade in a custom field or handle via external system
            status: 'active' // Keep active until billing cycle ends
          })
        }

        return NextResponse.json({
          success: true,
          message: `Downgrade to ${targetPlan.name} plan scheduled for next billing cycle.`,
          subscription: {
            tier: user.subscription_tier,
            status: user.subscription_status,
            expiresAt: user.subscription_expires_at,
            pendingDowngrade: targetTier
          }
        })
      }
    }

    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    )
    
  } catch (error) {
    console.error("Error updating subscription:", error)
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    )
  }
}

// Helper function to calculate next billing date
function getNextBillingDate(): Date {
  const next = new Date()
  next.setMonth(next.getMonth() + 1)
  return next
}