'use client'

import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import { 
  Plus, 
  Search, 
  Menu, 
  ChevronsLeft, 
  MoreVertical, 
  Pencil, 
  Download, 
  Trash2, 
  LogOut,
  MessageSquare
} from 'lucide-react'
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
      <div className="w-[68px] bg-vivk-navy border-r border-white/[0.06] flex flex-col h-full">
        <div className="p-3 flex justify-center">
          <button
            onClick={onToggleCollapse}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors"
            aria-label="Expand sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
        <div className="px-3 pb-3">
          <button
            onClick={handleNewConversation}
            disabled={isLoading}
            className="w-10 h-10 flex items-center justify-center bg-vivk-gradient text-white rounded-xl transition-all hover:opacity-90 disabled:opacity-50"
            aria-label="New conversation"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-72 bg-vivk-navy border-r border-white/[0.06] flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center">
          <Image src="/vivk_logo.png" alt="VIVK" width={28} height={28} />
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] rounded-lg transition-colors"
          aria-label="Collapse sidebar"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
      </div>

      {/* New chat button */}
      <div className="px-3 pb-3">
        <button
          onClick={handleNewConversation}
          disabled={isLoading}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <Plus className="w-4 h-4" />
          )}
          New Chat
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full vivk-input-dark pl-9 py-2 text-xs rounded-lg"
            aria-label="Search conversations"
          />
        </div>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-2 scrollbar-dark">
        {conversations.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-white/[0.04] flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-slate-600" />
            </div>
            <p className="text-xs text-slate-500">No conversations yet</p>
            <p className="text-xs text-slate-600 mt-1">Start a new chat to begin</p>
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
                      className="w-full bg-white/[0.06] text-white rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-vivk-blue/50"
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button onClick={handleEditCancel} className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors">Cancel</button>
                      <button onClick={handleEditSave} className="text-[10px] text-vivk-cyan hover:text-vivk-cyan/80 transition-colors">Save</button>
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
                        : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-[13px] font-medium truncate flex-1">
                        {conversation.title || 'New Conversation'}
                      </h3>
                      
                      <button
                        onClick={(e) => handleContextMenu(conversation.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/10 rounded transition-all flex-shrink-0"
                        aria-label="Conversation options"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-slate-600 truncate">
                        {conversation.message_count ? `${conversation.message_count} messages` : 'Empty'}
                      </span>
                      <span className="text-[11px] text-slate-600">·</span>
                      <span className="text-[11px] text-slate-600 flex-shrink-0">
                        {formatRelativeTime(conversation.last_activity)}
                      </span>
                    </div>

                    {/* Context menu */}
                    {contextMenuId === conversation.id && (
                      <div className="absolute right-0 top-0 mt-8 bg-vivk-navy border border-white/10 rounded-xl shadow-2xl z-20 py-1.5 min-w-[140px] overflow-hidden">
                        <button
                          onClick={(e) => handleEditStart(conversation, e)}
                          className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:bg-white/[0.06] flex items-center gap-2.5 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5 text-slate-500" />
                          Rename
                        </button>
                        <button
                          onClick={(e) => handleExport(conversation.id, e)}
                          className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:bg-white/[0.06] flex items-center gap-2.5 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-500" />
                          Export
                        </button>
                        <div className="my-1 border-t border-white/5"></div>
                        <button
                          onClick={(e) => handleDeleteClick(conversation.id, e)}
                          className="w-full text-left px-3.5 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2.5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
          <div className="bg-vivk-navy border border-white/10 rounded-2xl p-5 max-w-xs mx-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-1.5">Delete conversation?</h3>
            <p className="text-xs text-slate-400 mb-4">This can&apos;t be undone.</p>
            <div className="flex justify-end gap-2.5">
              <button onClick={() => setDeleteConfirmId(null)} className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
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
      <div className="border-t border-white/[0.06] p-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-vivk-gradient flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">
              {userEmail?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-300 truncate">{userEmail}</p>
            <p className="text-[10px] text-slate-500">{tierLabel} Plan</p>
          </div>
          <button
            onClick={onSignOut}
            className="p-1.5 text-slate-600 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
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
