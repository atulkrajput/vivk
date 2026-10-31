import { NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin"
import { AI_PROVIDERS, getCurrentProvider, getProviderConfig } from "@/lib/ai-providers"
import type { AIProvider } from "@/lib/ai-providers"

// GET /api/admin/ai-provider - Get current AI provider configuration
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json(
        { error: "Admin authentication required" },
        { status: 401 }
      )
    }

    const currentProvider = getCurrentProvider()
    const config = getProviderConfig(currentProvider)

    return NextResponse.json({
      success: true,
      currentProvider,
      config: {
        name: config.name,
        models: config.models,
        maxTokens: config.maxTokens
      },
      availableProviders: Object.keys(AI_PROVIDERS)
    })
    
  } catch (error) {
    console.error("Error fetching AI provider info:", error)
    return NextResponse.json(
      { error: "Failed to fetch AI provider information" },
      { status: 500 }
    )
  }
}

// POST /api/admin/ai-provider - Switch AI provider (for development/testing)
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json(
        { error: "Admin authentication required" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { provider } = body

    if (!provider || !(provider in AI_PROVIDERS)) {
      return NextResponse.json(
        { error: "Invalid AI provider specified" },
        { status: 400 }
      )
    }

    // Note: In a real application, you would update the environment variable
    // or database configuration. For this MVP, we'll just return the config
    // since environment variables can't be changed at runtime.
    
    const config = getProviderConfig(provider as AIProvider)

    return NextResponse.json({
      success: true,
      message: `AI provider configuration retrieved for ${provider}`,
      provider,
      config: {
        name: config.name,
        models: config.models,
        maxTokens: config.maxTokens
      },
      note: "To actually switch providers, update the AI_PROVIDER environment variable and restart the application."
    })
    
  } catch (error) {
    console.error("Error switching AI provider:", error)
    return NextResponse.json(
      { error: "Failed to switch AI provider" },
      { status: 500 }
    )
  }
}