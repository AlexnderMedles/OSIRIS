"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { VoiceMessage } from "./voice-message"
import { FileMessage } from "./file-message"
import { cn } from "@/lib/utils"

interface MessagesListProps {
  conversationId: string
  currentUserId: string
}

interface Message {
  id: string
  content: string
  sender_id: string
  message_type: string
  voice_duration?: number
  file_name?: string
  file_size?: number
  created_at: string
  sender: {
    display_name: string
    avatar_url: string | null
  }
}

export function MessagesList({ conversationId, currentUserId }: MessagesListProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchMessages()

    // Subscribe to real-time messages
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          fetchMessages() // Refetch to get sender info
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select(`
        id,
        content,
        sender_id,
        message_type,
        voice_duration,
        file_name,
        file_size,
        created_at,
        profiles!sender_id (
          display_name,
          avatar_url
        )
      `)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (data) {
      const messagesWithSender = data.map((msg) => ({
        ...msg,
        sender: msg.profiles,
      }))
      setMessages(messagesWithSender)
    }
  }

  const getFileType = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase()
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension || "")) return "image/"
    if (["pdf"].includes(extension || "")) return "application/pdf"
    if (["mp4", "webm", "mov"].includes(extension || "")) return "video/"
    return "application/octet-stream"
  }

  return (
    <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
      <div className="space-y-4">
        {messages.map((message, index) => {
          const isOwnMessage = message.sender_id === currentUserId
          const showAvatar =
            !isOwnMessage &&
            (index === 0 ||
              messages[index - 1].sender_id !== message.sender_id ||
              new Date(message.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() > 300000) // 5 minutes

          return (
            <div key={message.id} className={cn("flex gap-3", isOwnMessage ? "justify-end" : "justify-start")}>
              {!isOwnMessage && (
                <div className="flex-shrink-0">
                  {showAvatar ? (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={message.sender.avatar_url || "/placeholder.svg"} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {message.sender.display_name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-8 w-8" />
                  )}
                </div>
              )}

              <div className={cn("max-w-xs lg:max-w-md", isOwnMessage ? "order-1" : "order-2")}>
                {showAvatar && !isOwnMessage && (
                  <p className="text-xs text-muted-foreground mb-1 ml-1">{message.sender.display_name}</p>
                )}

                {message.message_type === "voice" ? (
                  <VoiceMessage
                    audioUrl={message.content}
                    duration={message.voice_duration || 0}
                    isOwnMessage={isOwnMessage}
                  />
                ) : message.message_type === "file" ? (
                  <FileMessage
                    fileName={message.file_name || "Unknown file"}
                    fileSize={message.file_size || 0}
                    fileType={getFileType(message.file_name || "")}
                    fileUrl={message.content}
                    isOwnMessage={isOwnMessage}
                  />
                ) : (
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2 text-sm",
                      isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted",
                    )}
                  >
                    <p className="text-pretty">{message.content}</p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-1 ml-1">
                  {new Date(message.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
