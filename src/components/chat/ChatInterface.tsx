'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ChatMessage } from './ChatMessage'
import { MessageInput } from './MessageInput'
import { TypingIndicator } from './TypingIndicator'
import { StreamingMessage } from './StreamingMessage'
import { UsageWarning } from './UsageWarning'
import { ErrorDisplay, DailyLimitErrorDisplay, AIServiceErrorDisplay } from '@/components/ui/ErrorDisplay'
import { ChatErrorBoundary } from '@/components/ui/ErrorBoundary'
import { useStreamingChat } from '@/hooks/useStreamingChat'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import type { Message, Conversation } from '@/types/database.types'

interface ChatInterfaceProps {
  conversation?: Conversation
  messages: Message[]
  onSendMessage: (content: string) => Promise<void>
  onUpdateMessages: (messages: Message[]) => void
  onUpdateConversation: (conversation: Conversation) => void
  isLoading?: boolean
  enableStreaming?: boolean
}

interface UsageLimitStatus {
  hasReachedLimit: boolean
  isApproachingLimit: boolean
  remainingMessages: number
  todayUsage: number
  dailyLimit: number
  warningMessage?: string
  limitMessage?: string
}

export function ChatInterface({ 
  conversation, 
  messages, 
  onSendMessage, 
  onUpdateMessages,
  onUpdateConversation,
  isLoading = false,
  enableStreaming = true
}: ChatInterfaceProps) {
  const { data: session } = useSession()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null)
  const [usageStatus, setUsageStatus] = useState<UsageLimitStatus | null>(null)
  const [showUsageWarning, setShowUsageWarning] = useState(false)
  
  const {
    isStreaming,
    streamingContent,
    error: streamingError,
    sendStreamingMessage,
    clearError
  } = useStreamingChat()

  const { error, handleError, clearError: clearGeneralError, retry } = useErrorHandler({
    onError: (errorInfo) => {
      // Handle specific error types
      if (errorInfo.code === 'DAILY_LIMIT_REACHED') {
        setShowUsageWarning(true)
      }
    }
  })

  // Fetch usage status on component mount and after sending messages
  useEffect(() => {
    if (session?.user?.subscriptionTier === 'free') {
      fetchUsageStatus()
    }
  }, [session, messages.length])

  const fetchUsageStatus = async () => {
    try {
      const response = await fetch('/api/usage')
      if (response.ok) {
        const data = await response.json()
        setUsageStatus(data.limits)
        
        // Show warning if approaching or at limit
        if (data.limits.isApproachingLimit || data.limits.hasReachedLimit) {
          setShowUsageWarning(true)
        }
      } else {
        const errorData = await response.json()
        handleError(errorData)
      }
    } catch (networkError) {
      handleError(networkError)
    }
  }

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming, streamingContent])

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading || isStreaming) return
    if (!conversation?.id) return

    // Check usage limits before sending
    if (session?.user?.subscriptionTier === 'free' && usageStatus?.hasReachedLimit) {
      setShowUsageWarning(true)
      return
    }

    clearError()
    clearGeneralError()

    if (enableStreaming) {
      // Use streaming for real-time responses
      await sendStreamingMessage(
        conversation.id,
        content.trim(),
        // onUserMessage
        (userMessage) => {
          onUpdateMessages([...messages, userMessage])
          // Refresh usage status after sending
          if (session?.user?.subscriptionTier === 'free') {
            setTimeout(fetchUsageStatus, 1000)
          }
        },
        // onAIChunk
        (chunk, fullContent) => {
          if (!streamingMessage) {
            const tempMessage: Message = {
              id: `streaming-${Date.now()}`,
              conversation_id: conversation.id,
              role: 'assistant',
              content: fullContent,
              created_at: new Date()
            }
            setStreamingMessage(tempMessage)
          } else {
            setStreamingMessage(prev => prev ? {
              ...prev,
              content: fullContent
            } : null)
          }
        },
        // onAIComplete
        (aiMessage, updatedConversation) => {
          // Replace streaming message with final message
          const newMessages = [...messages]
          if (streamingMessage) {
            // Find and replace the streaming message
            const streamingIndex = newMessages.findIndex(m => m.id === streamingMessage.id)
            if (streamingIndex >= 0) {
              newMessages[streamingIndex] = aiMessage
            } else {
              newMessages.push(aiMessage)
            }
          } else {
            newMessages.push(aiMessage)
          }
          
          onUpdateMessages(newMessages)
          setStreamingMessage(null)
          
          if (updatedConversation) {
            onUpdateConversation(updatedConversation)
          }
        },
        // onError
        (error) => {
          handleError(error)
          setStreamingMessage(null)
        }
      )
    } else {
      // Fallback to regular message sending
      try {
        setIsTyping(true)
        await onSendMessage(content.trim())
        // Refresh usage status after sending
        if (session?.user?.subscriptionTier === 'free') {
          setTimeout(fetchUsageStatus, 1000)
        }
      } catch (error) {
        handleError(error)
      } finally {
        setIsTyping(false)
      }
    }
  }

  const handleUpgrade = () => {
    window.location.href = '/dashboard/billing'
  }

  const handleRetryMessage = () => {
    // Retry the last failed operation
    retry(async () => {
      if (session?.user?.subscriptionTier === 'free') {
        await fetchUsageStatus()
      }
    })
  }

  return (
    <ChatErrorBoundary>
      <div className="flex flex-col h-full bg-white">
        {/* Chat Header */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {conversation?.title || 'New Conversation'}
              </h2>
              <p className="text-sm text-gray-500">
                {session?.user?.subscriptionTier === 'free' ? 'Claude Haiku' : 'Claude Sonnet'} • 
                {session?.user?.subscriptionTier === 'free' ? ' Free Plan' : ' Pro Plan'}
                {enableStreaming && ' • Streaming'}
              </p>
            </div>
            
            {/* Usage indicator for free users */}
            {session?.user?.subscriptionTier === 'free' && usageStatus && (
              <div className="text-sm text-gray-500">
                Messages today: {usageStatus.todayUsage}/{usageStatus.dailyLimit}
                {usageStatus.remainingMessages > 0 && (
                  <span className="ml-2 text-green-600">
                    ({usageStatus.remainingMessages} remaining)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex-shrink-0 px-4 pt-4">
            {error.code === 'DAILY_LIMIT_REACHED' ? (
              <DailyLimitErrorDisplay onUpgrade={handleUpgrade} />
            ) : error.code === 'AI_SERVICE_UNAVAILABLE' || error.code === 'AI_GENERATION_FAILED' ? (
              <AIServiceErrorDisplay onRetry={handleRetryMessage} />
            ) : (
              <ErrorDisplay
                error={error}
                onRetry={error.retryable ? handleRetryMessage : undefined}
                onDismiss={clearGeneralError}
                variant="banner"
              />
            )}
          </div>
        )}

        {/* Usage Warning */}
        {showUsageWarning && usageStatus && (usageStatus.warningMessage || usageStatus.limitMessage) && (
          <div className="flex-shrink-0 px-4 pt-4">
            <UsageWarning
              type={usageStatus.hasReachedLimit ? 'limit' : 'warning'}
              message={usageStatus.limitMessage || usageStatus.warningMessage || ''}
              remainingMessages={usageStatus.remainingMessages}
              onUpgrade={handleUpgrade}
              onDismiss={() => setShowUsageWarning(false)}
            />
          </div>
        )}

        {/* Legacy streaming error display (keeping for backward compatibility) */}
        {streamingError && !error && (
          <div className="flex-shrink-0 bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{streamingError}</p>
                <button
                  onClick={clearError}
                  className="mt-2 text-sm text-red-600 hover:text-red-500"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && !streamingMessage ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Start a conversation
                </h3>
                <p className="text-gray-500 max-w-sm">
                  Ask me anything! I'm here to help with your questions, tasks, and creative projects.
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isUser={message.role === 'user'}
                />
              ))}
              
              {/* Streaming message */}
              {streamingMessage && (
                <StreamingMessage
                  message={streamingMessage}
                  isStreaming={isStreaming}
                />
              )}
              
              {/* Typing indicator for non-streaming mode */}
              {isTyping && !isStreaming && <TypingIndicator />}
              
              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Message Input */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-white">
          <MessageInput
            onSendMessage={handleSendMessage}
            disabled={isLoading || isStreaming || (usageStatus?.hasReachedLimit && session?.user?.subscriptionTier === 'free')}
            placeholder={
              usageStatus?.hasReachedLimit && session?.user?.subscriptionTier === 'free'
                ? "Daily limit reached. Upgrade to Pro for unlimited messages."
                : session?.user?.subscriptionTier === 'free' 
                ? `Type your message... (${usageStatus?.remainingMessages || 0} messages remaining today)`
                : "Type your message..."
            }
          />
        </div>
      </div>
    </ChatErrorBoundary>
  )
}