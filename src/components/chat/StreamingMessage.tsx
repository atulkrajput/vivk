'use client'

import { formatDistanceToNow } from 'date-fns'
import type { Message } from '@/types/database.types'

interface StreamingMessageProps {
  message: Message
  isStreaming: boolean
}

export function StreamingMessage({ message, isStreaming }: StreamingMessageProps) {
  const formattedTime = formatDistanceToNow(new Date(message.created_at), { 
    addSuffix: true 
  })

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] order-1">
        {/* Message bubble */}
        <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md px-4 py-3 text-sm">
          <div className="whitespace-pre-wrap break-words">
            {message.content}
            {isStreaming && (
              <span className="inline-flex ml-1">
                <span className="animate-pulse">▊</span>
              </span>
            )}
          </div>
        </div>
        
        {/* Timestamp and metadata */}
        <div className="mt-1 text-xs text-gray-500 text-left">
          <span>VIVK</span>
          <span className="mx-1">•</span>
          <span>{isStreaming ? 'typing...' : formattedTime}</span>
          {!isStreaming && message.tokens && (
            <>
              <span className="mx-1">•</span>
              <span>{message.tokens} tokens</span>
            </>
          )}
        </div>
      </div>
      
      {/* Avatar */}
      <div className="flex-shrink-0 order-2 ml-3">
        <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center text-sm font-medium">
          {isStreaming ? (
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>
    </div>
  )
}