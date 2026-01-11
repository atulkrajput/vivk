/**
 * AI Providers Health Check Endpoint
 * 
 * Verifies AI provider connectivity and basic operations
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

export async function GET(request: NextRequest) {
  try {
    // Check if this is a health check request
    const isHealthCheck = request.headers.get('x-health-check') === 'true'
    
    if (!isHealthCheck) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const checks = {
      anthropic: false,
      openai: false,
      google: false
    }

    // Test Anthropic Claude API
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        })

        // Simple test message
        const message = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hello' }],
        })

        if (message.content && message.content.length > 0) {
          checks.anthropic = true
        }
      } catch (error) {
        console.warn('Anthropic health check failed:', error)
      }
    }

    // Test OpenAI API
    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        })

        const completion = await openai.chat.completions.create({
          messages: [{ role: 'user', content: 'Hello' }],
          model: 'gpt-3.5-turbo',
          max_tokens: 10,
        })

        if (completion.choices && completion.choices.length > 0) {
          checks.openai = true
        }
      } catch (error) {
        console.warn('OpenAI health check failed:', error)
      }
    }

    // Test Google AI API
    if (process.env.GOOGLE_AI_API_KEY) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: 'Hello' }]
              }]
            }),
          }
        )

        if (response.ok) {
          const data = await response.json()
          if (data.candidates && data.candidates.length > 0) {
            checks.google = true
          }
        }
      } catch (error) {
        console.warn('Google AI health check failed:', error)
      }
    }

    // Determine overall health
    const availableProviders = Object.values(checks).filter(Boolean).length
    const totalConfiguredProviders = [
      process.env.ANTHROPIC_API_KEY,
      process.env.OPENAI_API_KEY,
      process.env.GOOGLE_AI_API_KEY
    ].filter(Boolean).length

    const isHealthy = availableProviders > 0 && availableProviders >= totalConfiguredProviders * 0.5

    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
      summary: {
        available_providers: availableProviders,
        total_configured: totalConfiguredProviders,
        health_threshold: '50%'
      }
    }, { 
      status: isHealthy ? 200 : 503 
    })

  } catch (error) {
    console.error('AI providers health check failed:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: {
        anthropic: false,
        openai: false,
        google: false
      }
    }, { status: 503 })
  }
}