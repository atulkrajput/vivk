'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

interface Conversation {
  id: string
  title: string
  lastActivity: string
  messageCount: number
  lastMessage?: string
}

interface ConversationsListProps {
  className?: string
}

export function ConversationsList({ className = '' }: ConversationsListProps) {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchConversations()
  }, [])

  const fetchConversations = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/chat/conversations')
      
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
      } else {
        setError('Failed to load conversations')
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
      setError('Failed to load conversations')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteConversations = async () => {
    if (selectedConversations.size === 0) return

    const confirmMessage = selectedConversations.size === 1 
      ? 'Are you sure you want to delete this conversation?' 
      : `Are you sure you want to delete ${selectedConversations.size} conversations?`

    if (!confirm(confirmMessage)) return

    setIsDeleting(true)

    try {
      const deletePromises = Array.from(selectedConversations).map(id =>
        fetch(`/api/chat/conversations/${id}`, { method: 'DELETE' })
      )

      const results = await Promise.all(deletePromises)
      const failedDeletes = results.filter(r => !r.ok)

      if (failedDeletes.length === 0) {
        // All deletions successful
        setConversations(prev => 
          prev.filter(conv => !selectedConversations.has(conv.id))
        )
        setSelectedConversations(new Set())
      } else {
        setError(`Failed to delete ${failedDeletes.length} conversation(s)`)
      }
    } catch (error) {
      console.error('Error deleting conversations:', error)
      setError('Failed to delete conversations')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleExportConversations = async () => {
    if (selectedConversations.size === 0) return

    try {
      const exportPromises = Array.from(selectedConversations).map(async (id) => {
        const response = await fetch(`/api/chat/conversations/${id}/export`)
        if (response.ok) {
          return await response.json()
        }
        return null
      })

      const exportData = await Promise.all(exportPromises)
      const validExports = exportData.filter(data => data !== null)

      if (validExports.length > 0) {
        const blob = new Blob([JSON.stringify(validExports, null, 2)], {
          type: 'application/json'
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `vivk-conversations-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting conversations:', error)
      setError('Failed to export conversations')
    }
  }

  const toggleConversationSelection = (id: string) => {
    const newSelection = new Set(selectedConversations)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedConversations(newSelection)
  }

  const toggleSelectAll = () => {
    if (selectedConversations.size === filteredConversations.length) {
      setSelectedConversations(new Set())
    } else {
      setSelectedConversations(new Set(filteredConversations.map(c => c.id)))
    }
  }

  const filteredConversations = conversations.filter(conversation =>
    conversation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (conversation.lastMessage && conversation.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString('en-IN', { 
        weekday: 'short' 
      })
    } else {
      return date.toLocaleDateString('en-IN', { 
        month: 'short', 
        day: 'numeric' 
      })
    }
  }

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-4 w-4 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button
            onClick={fetchConversations}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">All Conversations</h3>
          <Link
            href="/chat"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
          >
            New Chat
          </Link>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <svg
            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Bulk Actions */}
        {selectedConversations.size > 0 && (
          <div className="mt-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
            <span className="text-sm text-blue-800">
              {selectedConversations.size} conversation(s) selected
            </span>
            <div className="flex space-x-2">
              <Button
                onClick={handleExportConversations}
                className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1"
              >
                Export
              </Button>
              <Button
                onClick={handleDeleteConversations}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Conversations List */}
      <div className="p-6">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-8">
            {searchQuery ? (
              <div>
                <p className="text-gray-500 mb-2">No conversations found matching "{searchQuery}"</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-blue-600 hover:underline text-sm"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div>
                <p className="text-gray-500 mb-4">No conversations yet</p>
                <Link
                  href="/chat"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Start your first conversation
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {/* Select All */}
            <div className="flex items-center p-3 border-b border-gray-100">
              <input
                type="checkbox"
                checked={selectedConversations.size === filteredConversations.length}
                onChange={toggleSelectAll}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-3 text-sm font-medium text-gray-700">
                Select all ({filteredConversations.length})
              </label>
            </div>

            {/* Conversation Items */}
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                  selectedConversations.has(conversation.id) ? 'bg-blue-50' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedConversations.has(conversation.id)}
                  onChange={() => toggleConversationSelection(conversation.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                
                <div className="ml-3 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/chat?conversation=${conversation.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate"
                    >
                      {conversation.title}
                    </Link>
                    <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                      {formatDate(conversation.lastActivity)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500 truncate">
                      {conversation.lastMessage || 'No messages yet'}
                    </p>
                    <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                      {conversation.messageCount} messages
                    </span>
                  </div>
                </div>

                <Link
                  href={`/chat?conversation=${conversation.id}`}
                  className="ml-3 text-blue-600 hover:text-blue-700 text-sm flex-shrink-0"
                >
                  Open
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}