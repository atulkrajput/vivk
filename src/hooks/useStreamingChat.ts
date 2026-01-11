'use client'

import { useState, useCallback } from 'react'
import type { Message, Conversation } from '@/types/database.types'

interface StreamingChatState {
  isStreaming: boolean
  streamingContent: string
  error: string | null
}

interface StreamingResponse {
  type: 'user_message' | 'ai_chunk' | 'ai_complete' | 'error'
  message?: Message
  chunk?: string
  conversation?: Conversation
  error?: string
}

export function useStreamingChat() {
  const [state, setState] = useState<StreamingChatState>({
    isStreaming: false,
    streamingContent: '',
    error: null
  })

  const sendStreamingMessage = useCallback(async (
    conversationId: string,
    content: string,
    onUserMessage?: (message: Message) => void,
    onAIChunk?: (chunk: string, fullContent: string) => void,
    onAIComplete?: (message: Message, conversation?: Conversation) => void,
    onError?: (error: string) => void
  ) => {
    setState({
      isStreaming: true,
      streamingContent: '',
      error: null
    })

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          content
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            
            if (data === '[DONE]') {
              setState(prev => ({ ...prev, isStreaming: false }))
              return
            }

            try {
              const parsed: StreamingResponse = JSON.parse(data)
              
              switch (parsed.type) {
                case 'user_message':
                  if (parsed.message && onUserMessage) {
                    onUserMessage(parsed.message)
                  }
                  break
                  
                case 'ai_chunk':
                  if (parsed.chunk !== undefined) {
                    setState(prev => {
                      const newContent = prev.streamingContent + parsed.chunk!
                      if (onAIChunk) {
                        onAIChunk(parsed.chunk!, newContent)
                      }
                      return { ...prev, streamingContent: newContent }
                    })
                  }
                  break
                  
                case 'ai_complete':
                  if (parsed.message && onAIComplete) {
                    onAIComplete(parsed.message, parsed.conversation)
                  }
                  setState(prev => ({ 
                    ...prev, 
                    isStreaming: false,
                    streamingContent: ''
                  }))
                  break
                  
                case 'error':
                  const errorMsg = parsed.error || 'Unknown error occurred'
                  setState(prev => ({ 
                    ...prev, 
                    isStreaming: false,
                    error: errorMsg
                  }))
                  if (onError) {
                    onError(errorMsg)
                  }
                  break
              }
            } catch (parseError) {
              console.error('Failed to parse streaming response:', parseError)
            }
          }
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to send message'
      setState({
        isStreaming: false,
        streamingContent: '',
        error: errorMsg
      })
      if (onError) {
        onError(errorMsg)
      }
    }
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    sendStreamingMessage,
    clearError
  }
}