'use client'

import type { Message } from '@/types/database.types'

interface StreamingMessageProps {
  message: Message
  isStreaming: boolean
}

export function StreamingMessage({ message, isStreaming }: StreamingMessageProps) {
  return (
    <div className="flex gap-3 py-4">
      {/* AI Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
          {isStreaming ? (
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          ) : (
            <span className="text-white text-[10px] font-bold">V</span>
          )}
        </div>
      </div>

      {/* Message content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[13px] font-medium text-gray-300">VIVK</span>
          {isStreaming && (
            <span className="text-[11px] text-blue-400 flex items-center gap-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-400"></span>
              </span>
              Generating
            </span>
          )}
        </div>
        <div className="text-[14px] text-gray-200 leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
          {isStreaming && (
            <span className="inline-block w-0.5 h-4 bg-blue-400 ml-0.5 animate-pulse align-text-bottom" />
          )}
        </div>
      </div>
    </div>
  )
}
