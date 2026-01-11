'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/Button'

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<void>
  disabled?: boolean
  placeholder?: string
}

export function MessageInput({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Type your message..." 
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
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
      // Restore message on error
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

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <div className="flex items-end space-x-3">
        {/* Message textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSubmitting}
            rows={1}
            className="
              w-full px-4 py-3 pr-12 text-sm
              border border-gray-300 rounded-2xl
              resize-none overflow-hidden
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              placeholder-gray-500
            "
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
          
          {/* Character count for long messages */}
          {message.length > 500 && (
            <div className="absolute bottom-1 right-12 text-xs text-gray-400">
              {message.length}/2000
            </div>
          )}
        </div>

        {/* Send button */}
        <Button
          type="submit"
          disabled={!message.trim() || disabled || isSubmitting}
          size="md"
          className="
            h-12 w-12 rounded-full p-0 flex-shrink-0
            bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300
            transition-colors duration-200
          "
        >
          {isSubmitting ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </Button>
      </div>
      
      {/* Help text */}
      <div className="mt-2 text-xs text-gray-500 px-1">
        Press Enter to send, Shift+Enter for new line
      </div>
    </form>
  )
}