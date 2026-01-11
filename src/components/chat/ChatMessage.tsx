'use client'

import { formatDistanceToNow } from 'date-fns'
import type { Message } from '@/types/database.types'

interface ChatMessageProps {
  message: Message
  isUser: boolean
}

export function ChatMessage({ message, isUser }: ChatMessageProps) {
  const formattedTime = formatDistanceToNow(new Date(message.created_at), { 
    addSuffix: true 
  })

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Message bubble */}
        <div
          className={`
            px-4 py-3 rounded-2xl text-sm
            ${isUser 
              ? 'bg-blue-600 text-white rounded-br-md' 
              : 'bg-gray-100 text-gray-900 rounded-bl-md'
            }
          `}
        >
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
        </div>
        
        {/* Timestamp and metadata */}
        <div className={`mt-1 text-xs text-gray-500 ${isUser ? 'text-right' : 'text-left'}`}>
          <span>{isUser ? 'You' : 'VIVK'}</span>
          <span className="mx-1">•</span>
          <span>{formattedTime}</span>
          {message.tokens && (
            <>
              <span className="mx-1">•</span>
              <span>{message.tokens} tokens</span>
            </>
          )}
        </div>
      </div>
      
      {/* Avatar */}
      <div className={`flex-shrink-0 ${isUser ? 'order-1 mr-3' : 'order-2 ml-3'}`}>
        <div
          className={`
            w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
            ${isUser 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-300 text-gray-700'
            }
          `}
        >
          {isUser ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
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