'use client'

import { formatDistanceToNow } from 'date-fns'
import type { Message } from '@/types/database.types'

interface ChatMessageProps {
  message: Message
  isUser: boolean
}

export function ChatMessage({ message, isUser }: ChatMessageProps) {
  const formattedTime = formatDistanceToNow(new Date(message.created_at), { addSuffix: true })

  if (isUser) {
    return (
      <div className="flex justify-end py-3">
        <div className="max-w-[75%]">
          <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl rounded-br-md text-[14px] leading-relaxed">
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          </div>
          <div className="mt-1.5 text-[11px] text-gray-600 text-right pr-1">
            {formattedTime}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 py-4">
      {/* AI Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
          <span className="text-white text-[10px] font-bold">V</span>
        </div>
      </div>

      {/* Message content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[13px] font-medium text-gray-300">VIVK</span>
          <span className="text-[11px] text-gray-600">{formattedTime}</span>
        </div>
        <div className="text-[14px] text-gray-200 leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </div>
        {message.tokens && (
          <div className="mt-2 text-[11px] text-gray-600">
            {message.tokens} tokens
          </div>
        )}
      </div>
    </div>
  )
}
