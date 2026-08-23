'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<void>
  disabled?: boolean
  placeholder?: string
}

export function MessageInput({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Message VIVK..." 
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [message])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || disabled || isSubmitting) return

    const messageToSend = message.trim()
    setMessage('')
    setIsSubmitting(true)

    try {
      await onSendMessage(messageToSend)
    } catch (error) {
      setMessage(messageToSend)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const canSend = message.trim().length > 0 && !disabled && !isSubmitting

  return (
    <div className="px-4 pt-2 pb-1">
      <form onSubmit={handleSubmit}>
        <div className="relative bg-white/[0.04] border border-white/[0.08] rounded-2xl hover:border-white/[0.12] focus-within:border-vivk-blue/40 focus-within:bg-white/[0.06] transition-all shadow-lg shadow-black/5">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSubmitting}
            rows={1}
            className="
              w-full bg-transparent text-slate-200 text-[14px]
              px-4 py-3.5 pr-14
              resize-none overflow-hidden
              focus:outline-none
              disabled:opacity-40 disabled:cursor-not-allowed
              placeholder-slate-500
            "
            style={{ minHeight: '52px', maxHeight: '200px' }}
            aria-label="Message input"
          />
          
          {/* Send button */}
          <button
            type="submit"
            disabled={!canSend}
            className={`
              absolute right-2.5 bottom-2.5 w-9 h-9 rounded-xl
              flex items-center justify-center transition-all duration-200
              ${canSend
                ? 'bg-vivk-gradient text-white shadow-lg shadow-vivk-blue/20 hover:opacity-90'
                : 'bg-white/[0.04] text-slate-600'
              }
            `}
            aria-label="Send message"
          >
            {isSubmitting ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <ArrowUp className="w-4 h-4" />
            )}
          </button>

          {/* Character count */}
          {message.length > 500 && (
            <div className="absolute bottom-2.5 right-14 text-[10px] text-slate-600">
              {message.length}/2000
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
