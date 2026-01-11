'use client'

import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import type { ConversationWithMessageCount } from '@/types/database.types'

interface ConversationSidebarProps {
  conversations: ConversationWithMessageCount[]
  currentConversationId?: string
  onSelectConversation: (conversationId: string) => void
  onNewConversation: () => void
  onSignOut: () => void
  onDeleteConversation?: (conversationId: string) => void
  onRenameConversation?: (conversationId: string, newTitle: string) => void
  onExportConversation?: (conversationId: string) => void
  onSearchConversations?: (query: string) => void
  userEmail?: string
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function ConversationSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onSignOut,
  onDeleteConversation,
  onRenameConversation,
  onExportConversation,
  onSearchConversations,
  userEmail,
  isCollapsed = false,
  onToggleCollapse
}: ConversationSidebarProps) {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [contextMenuId, setContextMenuId] = useState<string | null>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  const handleNewConversation = async () => {
    setIsLoading(true)
    try {
      await onNewConversation()
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    onSearchConversations?.(query)
  }

  const handleDeleteClick = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteConfirmId(conversationId)
    setContextMenuId(null)
  }

  const handleDeleteConfirm = async () => {
    if (deleteConfirmId && onDeleteConversation) {
      await onDeleteConversation(deleteConfirmId)
      setDeleteConfirmId(null)
    }
  }

  const handleEditStart = (conversation: ConversationWithMessageCount, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(conversation.id)
    setEditTitle(conversation.title || '')
    setContextMenuId(null)
    setTimeout(() => editInputRef.current?.focus(), 0)
  }

  const handleEditSave = async () => {
    if (editingId && onRenameConversation && editTitle.trim()) {
      await onRenameConversation(editingId, editTitle.trim())
      setEditingId(null)
      setEditTitle('')
    }
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditTitle('')
  }

  const handleExport = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onExportConversation?.(conversationId)
    setContextMenuId(null)
  }

  const handleContextMenu = (conversationId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenuId(contextMenuId === conversationId ? null : conversationId)
  }

  const formatRelativeTime = (date: Date | string) => {
    const now = new Date()
    const messageDate = new Date(date)
    const diffInHours = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return messageDate.toLocaleDateString()
  }

  if (isCollapsed) {
    return (
      <div className="w-16 bg-gray-900 text-white flex flex-col">
        {/* Collapsed header */}
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={onToggleCollapse}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-700 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* New conversation button */}
        <div className="p-2">
          <button
            onClick={handleNewConversation}
            disabled={isLoading}
            className="w-full h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 bg-gray-900 text-white flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <Logo variant="white" size="sm" />
          <span className="font-semibold">VIVK</span>
        </div>
        
        <button
          onClick={onToggleCollapse}
          className="p-1 hover:bg-gray-700 rounded"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* New conversation button */}
      <div className="p-4">
        <Button
          onClick={handleNewConversation}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading ? (
            <svg className="w-4 h-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          )}
          New Chat
        </Button>
      </div>

      {/* Search bar */}
      <div className="px-4 pb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-gray-800 text-white placeholder-gray-400 rounded-lg px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Start a new chat to begin</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {conversations.map((conversation) => (
              <div key={conversation.id} className="relative">
                {editingId === conversation.id ? (
                  <div className="p-3 bg-gray-700 rounded-lg">
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditSave()
                        if (e.key === 'Escape') handleEditCancel()
                      }}
                      className="w-full bg-gray-800 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex justify-end space-x-2 mt-2">
                      <button
                        onClick={handleEditCancel}
                        className="text-xs text-gray-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleEditSave}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => onSelectConversation(conversation.id)}
                    onContextMenu={(e) => handleContextMenu(conversation.id, e)}
                    className={`
                      w-full text-left p-3 rounded-lg transition-colors relative
                      ${currentConversationId === conversation.id
                        ? 'bg-gray-700 text-white'
                        : 'hover:bg-gray-800 text-gray-300'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium truncate">
                          {conversation.title || 'New Conversation'}
                        </h3>
                        {conversation.last_message && (
                          <p className="text-xs text-gray-400 mt-1 truncate">
                            {conversation.last_message}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex-shrink-0 ml-2 text-right">
                        <span className="text-xs text-gray-500 block">
                          {conversation.message_count}
                        </span>
                        <span className="text-xs text-gray-500 block mt-1">
                          {formatRelativeTime(conversation.last_activity)}
                        </span>
                      </div>
                    </div>

                    {/* Context menu */}
                    {contextMenuId === conversation.id && (
                      <div className="absolute right-2 top-2 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
                        <button
                          onClick={(e) => handleEditStart(conversation, e)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-gray-700 flex items-center"
                        >
                          <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Rename
                        </button>
                        <button
                          onClick={(e) => handleExport(conversation.id, e)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-gray-700 flex items-center"
                        >
                          <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Export
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(conversation.id, e)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-gray-700 text-red-400 flex items-center"
                        >
                          <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirmId && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Conversation</h3>
            <p className="text-gray-300 text-sm mb-4">
              Are you sure you want to delete this conversation? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User info and sign out */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userEmail}</p>
            <p className="text-xs text-gray-400">
              {session?.user?.subscriptionTier === 'free' ? 'Free Plan' : 
               session?.user?.subscriptionTier === 'pro' ? 'Pro Plan' : 
               session?.user?.subscriptionTier === 'business' ? 'Business Plan' : 'Free Plan'}
            </p>
          </div>
          
          <button
            onClick={onSignOut}
            className="ml-3 p-2 hover:bg-gray-700 rounded"
            title="Sign out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Click outside to close context menu */}
      {contextMenuId && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setContextMenuId(null)}
        />
      )}
    </div>
  )
}