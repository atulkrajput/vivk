'use client'

import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
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
    try { await onNewConversation() } finally { setIsLoading(false) }
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

  const handleEditCancel = () => { setEditingId(null); setEditTitle('') }

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

  const tierLabel = session?.user?.subscriptionTier === 'pro' ? 'Pro' :
    session?.user?.subscriptionTier === 'business' ? 'Business' : 'Free'

  if (isCollapsed) {
    return (
      <div className="w-[68px] bg-[#0a0a12] border-r border-white/5 flex flex-col h-full">
        <div className="p-3 flex justify-center">
          <button
            onClick={onToggleCollapse}
            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </div>
        <div className="px-3 pb-3">
          <button
            onClick={handleNewConversation}
            disabled={isLoading}
            className="w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors disabled:opacity-50"
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
    <div className="w-72 bg-[#0a0a12] border-r border-white/5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <span className="text-white text-xs font-bold">V</span>
          </div>
          <span className="font-semibold text-white text-sm tracking-wide">VIVK</span>
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
          </svg>
        </button>
      </div>

      {/* New chat button */}
      <div className="px-3 pb-3">
        <button
          onClick={handleNewConversation}
          disabled={isLoading}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-gray-200 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          )}
          New Chat
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-3">
        <div className="relative">
          <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.06] text-gray-300 placeholder-gray-600 rounded-lg px-3 py-2 pl-9 text-xs focus:outline-none focus:border-blue-500/40 focus:bg-white/[0.05] transition-all"
          />
        </div>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-2 scrollbar-thin">
        {conversations.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-white/[0.03] flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
              </svg>
            </div>
            <p className="text-xs text-gray-500">No conversations yet</p>
            <p className="text-xs text-gray-600 mt-1">Start a new chat to begin</p>
          </div>
        ) : (
          <div className="space-y-0.5 py-1">
            {conversations.map((conversation) => (
              <div key={conversation.id} className="relative group">
                {editingId === conversation.id ? (
                  <div className="p-2.5 mx-1 bg-white/[0.06] rounded-lg">
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditSave()
                        if (e.key === 'Escape') handleEditCancel()
                      }}
                      className="w-full bg-white/[0.06] text-white rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button onClick={handleEditCancel} className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors">Cancel</button>
                      <button onClick={handleEditSave} className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors">Save</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => onSelectConversation(conversation.id)}
                    onContextMenu={(e) => handleContextMenu(conversation.id, e)}
                    className={`
                      w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150 relative
                      ${currentConversationId === conversation.id
                        ? 'bg-white/[0.08] text-white'
                        : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-[13px] font-medium truncate flex-1">
                        {conversation.title || 'New Conversation'}
                      </h3>
                      
                      {/* Three-dot menu on hover */}
                      <button
                        onClick={(e) => handleContextMenu(conversation.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/10 rounded transition-all flex-shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-gray-600 truncate">
                        {conversation.message_count ? `${conversation.message_count} messages` : 'Empty'}
                      </span>
                      <span className="text-[11px] text-gray-600">·</span>
                      <span className="text-[11px] text-gray-600 flex-shrink-0">
                        {formatRelativeTime(conversation.last_activity)}
                      </span>
                    </div>

                    {/* Context menu */}
                    {contextMenuId === conversation.id && (
                      <div className="absolute right-0 top-0 mt-8 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl z-20 py-1.5 min-w-[140px] overflow-hidden">
                        <button
                          onClick={(e) => handleEditStart(conversation, e)}
                          className="w-full text-left px-3.5 py-2 text-xs text-gray-300 hover:bg-white/[0.06] flex items-center gap-2.5 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                          Rename
                        </button>
                        <button
                          onClick={(e) => handleExport(conversation.id, e)}
                          className="w-full text-left px-3.5 py-2 text-xs text-gray-300 hover:bg-white/[0.06] flex items-center gap-2.5 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                          Export
                        </button>
                        <div className="my-1 border-t border-white/5"></div>
                        <button
                          onClick={(e) => handleDeleteClick(conversation.id, e)}
                          className="w-full text-left px-3.5 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2.5 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
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

      {/* Delete confirmation */}
      {deleteConfirmId && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-5 max-w-xs mx-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-1.5">Delete conversation?</h3>
            <p className="text-xs text-gray-400 mb-4">This can't be undone.</p>
            <div className="flex justify-end gap-2.5">
              <button onClick={() => setDeleteConfirmId(null)} className="px-3.5 py-1.5 text-xs text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button onClick={handleDeleteConfirm} className="px-3.5 py-1.5 text-xs bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User footer */}
      <div className="border-t border-white/5 p-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/80 to-purple-600/80 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">
              {userEmail?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-300 truncate">{userEmail}</p>
            <p className="text-[10px] text-gray-600">{tierLabel} Plan</p>
          </div>
          <button
            onClick={onSignOut}
            className="p-1.5 text-gray-600 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
            title="Sign out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </div>

      {/* Click outside to close context menu */}
      {contextMenuId && (
        <div className="fixed inset-0 z-10" onClick={() => setContextMenuId(null)} />
      )}
    </div>
  )
}
