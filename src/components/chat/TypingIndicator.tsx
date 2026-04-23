'use client'

export function TypingIndicator() {
  return (
    <div className="flex gap-3 py-4">
      {/* AI Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        </div>
      </div>

      {/* Typing animation */}
      <div className="flex items-center gap-2 py-2">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="text-[12px] text-gray-600">VIVK is thinking...</span>
      </div>
    </div>
  )
}
