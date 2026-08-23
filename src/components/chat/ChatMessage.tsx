'use client'

import { formatDistanceToNow } from 'date-fns'
import { Sparkles, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import type { Message } from '@/types/database.types'

interface ChatMessageProps {
  message: Message
  isUser: boolean
}

export function ChatMessage({ message, isUser }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)
  const formattedTime = formatDistanceToNow(new Date(message.created_at), { addSuffix: true })

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isUser) {
    return (
      <div className="flex justify-end py-3">
        <div className="max-w-[75%]">
          <div className="bg-vivk-blue/20 border border-vivk-blue/20 text-slate-100 px-4 py-3 rounded-2xl rounded-br-md text-[14px] leading-relaxed">
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-600 text-right pr-1">
            {formattedTime}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 py-4 group">
      {/* AI Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        <div className="w-7 h-7 rounded-lg bg-vivk-gradient flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
      </div>

      {/* Message content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[13px] font-medium text-slate-300">VIVK</span>
          <span className="text-[11px] text-slate-600">{formattedTime}</span>
        </div>
        <div className="text-[14px] text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Copy message"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        {message.tokens && (
          <div className="mt-1 text-[11px] text-slate-600">
            {message.tokens} tokens
          </div>
        )}
      </div>
    </div>
  )
}
