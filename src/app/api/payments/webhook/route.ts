import { NextRequest, NextResponse } from "next/server"
import { webhookService } from "@/lib/payments"

// POST /api/payments/webhook - Handle Razorpay webhooks
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-razorpay-signature')

    if (!signature) {
      return NextResponse.json(
        { error: "Missing webhook signature" },
        { status: 400 }
      )
    }

    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error("Razorpay webhook secret not configured")
      return NextResponse.json(
        { error: "Webhook configuration error" },
        { status: 500 }
      )
    }

    const isValid = webhookService.verifyWebhookSignature(
      body,
      signature,
      webhookSecret
    )

    if (!isValid) {
      console.error("Invalid webhook signature")
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      )
    }

    // Process webhook payload
    const payload = JSON.parse(body)
    const success = await webhookService.processWebhook(payload)

    if (!success) {
      console.error("Failed to process webhook")
      return NextResponse.json(
        { error: "Failed to process webhook" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully"
    })

  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    )
  }
}