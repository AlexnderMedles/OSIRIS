"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Phone, Video, MoreVertical } from "lucide-react"

interface ChatHeaderProps {
  conversationId: string
  currentUserId: string
  onStartCall?: (callType: "audio" | "video", remoteUserId: string) => void
}

interface ConversationInfo {
  id: string
  name: string | null
  is_group: boolean
  other_participant?: {
    id: string
    display_name: string
    username: string
    avatar_url: string | null
    status: string
  }
}

export function ChatHeader({ conversationId, currentUserId, onStartCall }: ChatHeaderProps) {
  const [conversationInfo, setConversationInfo] = useState<ConversationInfo | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchConversationInfo()
  }, [conversationId])

  const fetchConversationInfo = async () => {
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id, name, is_group")
      .eq("id", conversationId)
      .single()

    if (!conversation) return

    const conversationData: ConversationInfo = conversation

    // Get other participant info for direct messages
    if (!conversation.is_group) {
      const { data: otherParticipant } = await supabase
        .from("conversation_participants")
        .select(`
          profiles!inner (
            id,
            display_name,
            username,
            avatar_url,
            status
          )
        `)
        .eq("conversation_id", conversationId)
        .neq("user_id", currentUserId)
        .single()

      conversationData.other_participant = otherParticipant?.profiles
    }

    setConversationInfo(conversationData)
  }

  const handleStartCall = (callType: "audio" | "video") => {
    if (conversationInfo?.other_participant && onStartCall) {
      onStartCall(callType, conversationInfo.other_participant.id)
    }
  }

  if (!conversationInfo) return null

  const displayName = conversationInfo.is_group
    ? conversationInfo.name
    : conversationInfo.other_participant?.display_name

  const status = conversationInfo.is_group ? null : conversationInfo.other_participant?.status

  return (
    <div className="flex items-center justify-between p-4 border-b border-border">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={conversationInfo.other_participant?.avatar_url || "/placeholder.svg"} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {displayName?.charAt(0)?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-semibold">{displayName}</h2>
          {status && <p className="text-sm text-muted-foreground capitalize">{status}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => handleStartCall("audio")}>
          <Phone className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handleStartCall("video")}>
          <Video className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
