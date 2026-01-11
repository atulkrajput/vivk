'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { ConversationSidebar } from '@/components/chat/ConversationSidebar'
import type { Message, Conversation, ConversationWithMessageCount } from '@/types/database.types'

export default function ChatPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // State management
  const [conversations, setConversations] = useState<ConversationWithMessageCount[]>([])
  const [allConversations, setAllConversations] = useState<ConversationWithMessageCount[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  // Load conversations on mount
  useEffect(() => {
    if (session?.user) {
      loadConversations()
    }
  }, [session])

  const loadConversations = async (search?: string) => {
    try {
      const url = new URL('/api/chat/conversations', window.location.origin)
      if (search) {
        url.searchParams.set('search', search)
      }
      
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
        
        // If no current conversation and conversations exist, select the first one
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
      
      // Load conversation details
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
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        const newConversation = data.conversation
        
        // Add to conversations list
        setConversations(prev => [newConversation, ...prev])
        setAllConversations(prev => [newConversation, ...prev])
        
        // Select the new conversation
        setCurrentConversation(newConversation)
        setMessages([])
        setError(null)
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
        // Remove from conversations list
        setConversations(prev => prev.filter(conv => conv.id !== conversationId))
        setAllConversations(prev => prev.filter(conv => conv.id !== conversationId))
        
        // If this was the current conversation, clear it
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(null)
          setMessages([])
          
          // Select the first remaining conversation if any
          const remaining = conversations.filter(conv => conv.id !== conversationId)
          if (remaining.length > 0) {
            selectConversation(remaining[0].id)
          }
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'rename',
          data: { title: newTitle }
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const updatedConversation = data.conversation
        
        // Update in conversations list
        const updateConversations = (prev: ConversationWithMessageCount[]) =>
          prev.map(conv => 
            conv.id === conversationId 
              ? { ...conv, title: updatedConversation.title }
              : conv
          )
        
        setConversations(updateConversations)
        setAllConversations(updateConversations)
        
        // Update current conversation if it's the one being renamed
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(updatedConversation)
        }
      } else {
        setError('Failed to rename conversation')
      }
    } catch (error) {
      console.error('Failed to rename conversation:', error)
      setError('Failed to rename conversation')
    }
  }

  const exportConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'export'
        }),
      })

      if (response.ok) {
        const result = await response.json()
        const { data: exportData, filename } = result
        
        // Create and download the file
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json'
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        setError('Failed to export conversation')
      }
    } catch (error) {
      console.error('Failed to export conversation:', error)
      setError('Failed to export conversation')
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
      // Create new conversation if none exists
      await createNewConversation()
      // Wait a bit for the conversation to be created
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    if (!currentConversation) {
      throw new Error('No conversation available')
    }

    try {
      // Send message to API (non-streaming fallback)
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: currentConversation.id,
          content,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update messages with both user and AI messages
        setMessages(prev => [...prev, data.userMessage, data.aiMessage])
        
        // Update conversation title if it's the first message
        if (messages.length === 0 && data.conversation) {
          setCurrentConversation(data.conversation)
          setConversations(prev => 
            prev.map(conv => 
              conv.id === data.conversation.id 
                ? { ...conv, title: data.conversation.title }
                : conv
            )
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

  const handleUpdateMessages = (newMessages: Message[]) => {
    setMessages(newMessages)
  }

  const handleUpdateConversation = (updatedConversation: Conversation) => {
    setCurrentConversation(updatedConversation)
    setConversations(prev => 
      prev.map(conv => 
        conv.id === updatedConversation.id 
          ? { ...conv, title: updatedConversation.title }
          : conv
      )
    )
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/login' })
  }

  if (status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
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

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-2 text-sm text-red-600 hover:text-red-500"
                >
                  Dismiss
                </button>
              </div>
            </div>
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