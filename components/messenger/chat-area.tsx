"use client"
import { MessagesList } from "./messages-list"
import { MessageInput } from "./message-input"
import { ChatHeader } from "./chat-header"

interface ChatAreaProps {
  conversationId: string | null
  currentUserId: string
  onStartCall?: (callType: "audio" | "video", remoteUserId: string) => void
}

export function ChatArea({ conversationId, currentUserId, onStartCall }: ChatAreaProps) {
  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Welcome to Messenger</h2>
          <p className="text-muted-foreground mt-2">Select a conversation to start messaging</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <ChatHeader conversationId={conversationId} currentUserId={currentUserId} onStartCall={onStartCall} />
      <MessagesList conversationId={conversationId} currentUserId={currentUserId} />
      <MessageInput conversationId={conversationId} currentUserId={currentUserId} />
    </div>
  )
}
