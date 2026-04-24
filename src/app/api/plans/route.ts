import { NextResponse } from "next/server"
import { planDb } from "@/lib/db"

// GET /api/plans - Get all active plans
export async function GET() {
  try {
    const plans = await planDb.getAll()
    return NextResponse.json({ success: true, plans })
  } catch (error) {
    console.error('Error fetching plans:', error)
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    )
  }
}
