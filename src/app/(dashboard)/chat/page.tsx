'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Menu, Sparkles } from 'lucide-react'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { ConversationSidebar } from '@/components/chat/ConversationSidebar'
import type { Message, Conversation, ConversationWithMessageCount } from '@/types/database.types'

export default function ChatPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [conversations, setConversations] = useState<ConversationWithMessageCount[]>([])
  const [allConversations, setAllConversations] = useState<ConversationWithMessageCount[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      loadConversations()
    }
  }, [session])

  const loadConversations = async (search?: string) => {
    try {
      const url = new URL('/api/chat/conversations', window.location.origin)
      if (search) url.searchParams.set('search', search)
      
      const response = await fetch(url.toString())
      if (response.ok) {
        const data = await response.json()
        const conversationList = data.conversations || []
        
        if (search) {
          setConversations(conversationList)
        } else {
          setAllConversations(conversationList)
          setConversations(conversationList)
        }
        
        if (!currentConversation && conversationList.length > 0) {
          selectConversation(conversationList[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
      setError('Failed to load conversations')
    }
  }

  const selectConversation = async (conversationId: string) => {
    try {
      setIsLoading(true)
      setIsMobileSidebarOpen(false)
      
      const [conversationResponse, messagesResponse] = await Promise.all([
        fetch(`/api/chat/conversations/${conversationId}`),
        fetch(`/api/chat/conversations/${conversationId}/messages`)
      ])

      if (conversationResponse.ok && messagesResponse.ok) {
        const conversationData = await conversationResponse.json()
        const messagesData = await messagesResponse.json()
        setCurrentConversation(conversationData.conversation)
        setMessages(messagesData.messages || [])
        setError(null)
      } else {
        setError('Failed to load conversation')
      }
    } catch (error) {
      console.error('Failed to select conversation:', error)
      setError('Failed to load conversation')
    } finally {
      setIsLoading(false)
    }
  }

  const createNewConversation = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        const data = await response.json()
        const newConversation = data.conversation
        setConversations(prev => [newConversation, ...prev])
        setAllConversations(prev => [newConversation, ...prev])
        setCurrentConversation(newConversation)
        setMessages([])
        setError(null)
        setIsMobileSidebarOpen(false)
      } else {
        setError('Failed to create new conversation')
      }
    } catch (error) {
      console.error('Failed to create conversation:', error)
      setError('Failed to create new conversation')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}/actions`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setConversations(prev => prev.filter(conv => conv.id !== conversationId))
        setAllConversations(prev => prev.filter(conv => conv.id !== conversationId))
        
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(null)
          setMessages([])
          const remaining = conversations.filter(conv => conv.id !== conversationId)
          if (remaining.length > 0) selectConversation(remaining[0].id)
        }
      } else {
        setError('Failed to delete conversation')
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
      setError('Failed to delete conversation')
    }
  }

  const renameConversation = async (conversationId: string, newTitle: string) => {
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename', data: { title: newTitle } }),
      })

      if (response.ok) {
        const data = await response.json()
        const updatedConversation = data.conversation
        const updateConversations = (prev: ConversationWithMessageCount[]) =>
          prev.map(conv => conv.id === conversationId ? { ...conv, title: updatedConversation.title } : conv)
        
        setConversations(updateConversations)
        setAllConversations(updateConversations)
        if (currentConversation?.id === conversationId) setCurrentConversation(updatedConversation)
      } else {
        setError('Failed to rename conversation')
      }
    } catch (error) {
      console.error('Failed to rename conversation:', error)
    }
  }

  const exportConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export' }),
      })

      if (response.ok) {
        const result = await response.json()
        const { data: exportData, filename } = result
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to export conversation:', error)
    }
  }

  const searchConversations = async (query: string) => {
    setSearchQuery(query)
    if (query.trim() === '') {
      setConversations(allConversations)
    } else {
      await loadConversations(query)
    }
  }

  const sendMessage = async (content: string) => {
    if (!currentConversation) {
      await createNewConversation()
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    if (!currentConversation) throw new Error('No conversation available')

    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: currentConversation.id, content }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => [...prev, data.userMessage, data.aiMessage])
        if (messages.length === 0 && data.conversation) {
          setCurrentConversation(data.conversation)
          setConversations(prev =>
            prev.map(conv => conv.id === data.conversation.id ? { ...conv, title: data.conversation.title } : conv)
          )
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      throw error
    }
  }

  const handleUpdateMessages = (newMessages: Message[]) => setMessages(newMessages)

  const handleUpdateConversation = (updatedConversation: Conversation) => {
    setCurrentConversation(updatedConversation)
    setConversations(prev =>
      prev.map(conv => conv.id === updatedConversation.id ? { ...conv, title: updatedConversation.title } : conv)
    )
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  if (status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-vivk-navy">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-vivk-gradient flex items-center justify-center animate-pulse shadow-vivk-glow">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <p className="text-slate-400 text-sm">Loading VIVK...</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="h-screen flex bg-vivk-navy overflow-hidden">
      {/* Mobile sidebar overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 fixed lg:relative z-50 lg:z-auto
        transition-transform duration-300 ease-in-out h-full
      `}>
        <ConversationSidebar
          conversations={conversations}
          currentConversationId={currentConversation?.id}
          onSelectConversation={selectConversation}
          onNewConversation={createNewConversation}
          onDeleteConversation={deleteConversation}
          onRenameConversation={renameConversation}
          onExportConversation={exportConversation}
          onSearchConversations={searchConversations}
          onSignOut={handleSignOut}
          userEmail={session.user.email}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center px-4 py-3 border-b border-white/[0.06] bg-vivk-navy">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 -ml-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 ml-3">
            <Image src="/vivk_logo.png" alt="VIVK" width={24} height={24} />
            <span className="text-sm font-medium text-white truncate">
              {currentConversation?.title || 'New Chat'}
            </span>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-4 mt-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between">
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400/60 hover:text-red-400 ml-3" aria-label="Dismiss error">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        <ChatInterface
          conversation={currentConversation || undefined}
          messages={messages}
          onSendMessage={sendMessage}
          onUpdateMessages={handleUpdateMessages}
          onUpdateConversation={handleUpdateConversation}
          isLoading={isLoading}
          enableStreaming={true}
        />
      </div>
    </div>
  )
}
