import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getAvailableModels, clearModelsCache } from "@/lib/model-router"
import type { SubscriptionTier } from "@/lib/ai-providers"

// GET /api/admin/models - List all available Groq models for a tier
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const tier = (request.nextUrl.searchParams.get("tier") || "free") as SubscriptionTier
    const models = await getAvailableModels(tier)

    return NextResponse.json({
      success: true,
      tier,
      models: models.map(m => ({
        id: m.id,
        name: m.display_name,
        category: m.category,
        speedRating: m.speed_rating,
        qualityRating: m.quality_rating,
        contextWindow: m.context_window,
        maxOutputTokens: m.max_output_tokens,
        scores: {
          generalChat: m.score_general_chat,
          coding: m.score_coding,
          creativeWriting: m.score_creative_writing,
          reasoning: m.score_reasoning,
          summarization: m.score_summarization,
          translation: m.score_translation,
        }
      })),
      count: models.length
    })
  } catch (error) {
    console.error("Error fetching models:", error)
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    )
  }
}

// POST /api/admin/models/refresh - Clear cache and reload models
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    clearModelsCache()

    return NextResponse.json({
      success: true,
      message: "Models cache cleared. Next request will reload from database."
    })
  } catch (error) {
    console.error("Error refreshing models:", error)
    return NextResponse.json(
      { error: "Failed to refresh models" },
      { status: 500 }
    )
  }
}
