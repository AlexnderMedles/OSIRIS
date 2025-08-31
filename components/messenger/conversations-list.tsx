"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConversationsListProps {
  userId: string
  selectedConversationId: string | null
  onSelectConversation: (id: string) => void
}

interface Conversation {
  id: string
  name: string | null
  is_group: boolean
  updated_at: string
  other_participant?: {
    id: string
    display_name: string
    username: string
    avatar_url: string | null
  }
  last_message?: {
    content: string
    created_at: string
    sender_id: string
  }
}

export function ConversationsList({ userId, selectedConversationId, onSelectConversation }: ConversationsListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const supabase = createClient()

  useEffect(() => {
    fetchConversations()

    // Subscribe to real-time updates
    const channel = supabase
      .channel("conversations")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => fetchConversations())
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => fetchConversations())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const fetchConversations = async () => {
    const { data: conversationsData } = await supabase
      .from("conversation_participants")
      .select(`
        conversation_id,
        conversations!inner (
          id,
          name,
          is_group,
          updated_at
        )
      `)
      .eq("user_id", userId)

    if (!conversationsData) return

    // Get conversation details with other participants and last messages
    const conversationsWithDetails = await Promise.all(
      conversationsData.map(async (item) => {
        const conversation = item.conversations

        // Get other participants for direct messages
        if (!conversation.is_group) {
          const { data: otherParticipant } = await supabase
            .from("conversation_participants")
            .select(`
              profiles!inner (
                id,
                display_name,
                username,
                avatar_url
              )
            `)
            .eq("conversation_id", conversation.id)
            .neq("user_id", userId)
            .single()

          conversation.other_participant = otherParticipant?.profiles
        }

        // Get last message
        const { data: lastMessage } = await supabase
          .from("messages")
          .select("content, created_at, sender_id")
          .eq("conversation_id", conversation.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        conversation.last_message = lastMessage

        return conversation
      }),
    )

    setConversations(
      conversationsWithDetails.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    )
  }

  const filteredConversations = conversations.filter((conv) => {
    const searchTerm = searchQuery.toLowerCase()
    const name = conv.is_group ? conv.name : conv.other_participant?.display_name
    return name?.toLowerCase().includes(searchTerm)
  })

  return (
    <div className="flex flex-col h-full">
      {/* Search and New Chat */}
      <div className="p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Conversations */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {filteredConversations.map((conversation) => {
            const displayName = conversation.is_group ? conversation.name : conversation.other_participant?.display_name
            const displayUsername = conversation.is_group ? null : conversation.other_participant?.username

            return (
              <div
                key={conversation.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors",
                  selectedConversationId === conversation.id && "bg-accent",
                )}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={conversation.other_participant?.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {displayName?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm truncate">{displayName}</h3>
                    {conversation.last_message && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(conversation.last_message.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                  {displayUsername && <p className="text-xs text-muted-foreground">@{displayUsername}</p>}
                  {conversation.last_message && (
                    <p className="text-sm text-muted-foreground truncate mt-1">{conversation.last_message.content}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
