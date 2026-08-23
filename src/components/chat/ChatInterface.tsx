'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Sparkles, FileText, Code2, BarChart3, Lightbulb } from 'lucide-react'
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

const SUGGESTIONS = [
  { icon: FileText, title: 'Write content', desc: 'Blog posts, emails, social media' },
  { icon: Code2, title: 'Help me code', desc: 'Debug, explain, or write code' },
  { icon: BarChart3, title: 'Analyze data', desc: 'Summarize, compare, or extract insights' },
  { icon: Lightbulb, title: 'Brainstorm ideas', desc: 'Creative solutions and strategies' },
]

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
      if (errorInfo.code === 'DAILY_LIMIT_REACHED') setShowUsageWarning(true)
    }
  })

  useEffect(() => {
    fetchUsageStatus()
  }, [session, messages.length])

  const fetchUsageStatus = async () => {
    try {
      const response = await fetch('/api/usage')
      if (response.ok) {
        const data = await response.json()
        setUsageStatus(data.limits)
        if (data.limits.isApproachingLimit || data.limits.hasReachedLimit) setShowUsageWarning(true)
      } else {
        handleError(await response.json())
      }
    } catch (networkError) {
      handleError(networkError)
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming, streamingContent])

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading || isStreaming) return
    if (!conversation?.id) return
    if (usageStatus?.hasReachedLimit) {
      setShowUsageWarning(true)
      return
    }

    clearError()
    clearGeneralError()

    if (enableStreaming) {
      await sendStreamingMessage(
        conversation.id,
        content.trim(),
        (userMessage) => {
          onUpdateMessages([...messages, userMessage])
          setTimeout(fetchUsageStatus, 1000)
        },
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
            setStreamingMessage(prev => prev ? { ...prev, content: fullContent } : null)
          }
        },
        (aiMessage, updatedConversation) => {
          const newMessages = [...messages]
          if (streamingMessage) {
            const streamingIndex = newMessages.findIndex(m => m.id === streamingMessage.id)
            if (streamingIndex >= 0) newMessages[streamingIndex] = aiMessage
            else newMessages.push(aiMessage)
          } else {
            newMessages.push(aiMessage)
          }
          onUpdateMessages(newMessages)
          setStreamingMessage(null)
          if (updatedConversation) onUpdateConversation(updatedConversation)
        },
        (error) => { handleError(error); setStreamingMessage(null) }
      )
    } else {
      try {
        setIsTyping(true)
        await onSendMessage(content.trim())
        setTimeout(fetchUsageStatus, 1000)
      } catch (error) {
        handleError(error)
      } finally {
        setIsTyping(false)
      }
    }
  }

  const handleUpgrade = () => { window.location.href = '/billing' }
  const handleRetryMessage = () => {
    retry(async () => { await fetchUsageStatus() })
  }

  const modelName = session?.user?.subscriptionTier === 'free' ? 'Haiku' : 'Sonnet'
  const planName = session?.user?.subscriptionTier === 'business' ? 'Business' : session?.user?.subscriptionTier === 'pro' ? 'Pro' : 'Free'
  const hasMessages = messages.length > 0 || !!streamingMessage

  return (
    <ChatErrorBoundary>
      <div className="flex flex-col h-full bg-vivk-navy">
        {/* Error displays */}
        {error && (
          <div className="flex-shrink-0 px-4 pt-3 max-w-3xl mx-auto w-full">
            {error.code === 'DAILY_LIMIT_REACHED' ? (
              <DailyLimitErrorDisplay onUpgrade={handleUpgrade} />
            ) : error.code === 'AI_SERVICE_UNAVAILABLE' || error.code === 'AI_GENERATION_FAILED' ? (
              <AIServiceErrorDisplay onRetry={handleRetryMessage} />
            ) : (
              <ErrorDisplay error={error} onRetry={error.retryable ? handleRetryMessage : undefined} onDismiss={clearGeneralError} variant="banner" />
            )}
          </div>
        )}

        {showUsageWarning && usageStatus && (usageStatus.warningMessage || usageStatus.limitMessage) && (
          <div className="flex-shrink-0 px-4 pt-3 max-w-3xl mx-auto w-full">
            <UsageWarning
              type={usageStatus.hasReachedLimit ? 'limit' : 'warning'}
              message={usageStatus.limitMessage || usageStatus.warningMessage || ''}
              remainingMessages={usageStatus.remainingMessages}
              onUpgrade={handleUpgrade}
              onDismiss={() => setShowUsageWarning(false)}
            />
          </div>
        )}

        {streamingError && !error && (
          <div className="flex-shrink-0 mx-4 mt-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl max-w-3xl mx-auto w-full">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-400">{streamingError}</p>
              <button onClick={clearError} className="text-red-400/60 hover:text-red-400 ml-3 text-xs">Dismiss</button>
            </div>
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {!hasMessages ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full px-4">
              <div className="max-w-lg w-full text-center">
                <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-vivk-gradient flex items-center justify-center shadow-vivk-glow">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  How can I help you today?
                </h2>
                <p className="text-sm text-slate-400 mb-8">
                  Using Claude {modelName} · {planName} Plan
                </p>

                {/* Suggestion cards */}
                <div className="grid grid-cols-2 gap-2.5">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(s.title)}
                      className="text-left p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all group"
                    >
                      <s.icon className="w-5 h-5 text-slate-500 group-hover:text-vivk-cyan transition-colors" />
                      <p className="text-[13px] font-medium text-slate-300 mt-2.5 group-hover:text-white transition-colors">{s.title}</p>
                      <p className="text-[11px] text-slate-600 mt-0.5">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-1">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} isUser={message.role === 'user'} />
              ))}
              {streamingMessage && <StreamingMessage message={streamingMessage} isStreaming={isStreaming} />}
              {isTyping && !isStreaming && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="flex-shrink-0">
          <div className="max-w-3xl mx-auto w-full">
            <MessageInput
              onSendMessage={handleSendMessage}
              disabled={isLoading || isStreaming || usageStatus?.hasReachedLimit}
              placeholder={
                usageStatus?.hasReachedLimit
                  ? "Daily limit reached. Upgrade your plan for more messages."
                  : "Message VIVK..."
              }
            />
            {/* Footer info */}
            <div className="text-center pb-3 px-4">
              <p className="text-[11px] text-slate-600">
                {usageStatus && usageStatus.dailyLimit !== -1
                  ? `${usageStatus.remainingMessages} of ${usageStatus.dailyLimit} messages remaining today · `
                  : ''
                }
                VIVK can make mistakes. Verify important information.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ChatErrorBoundary>
  )
}
