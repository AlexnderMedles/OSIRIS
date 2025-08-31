"use client"

import { useState } from "react"
import { ConversationsList } from "./conversations-list"
import { ChatArea } from "./chat-area"
import { UserProfile } from "./user-profile"
import { CallInterface } from "./call-interface"
import { useWebRTC } from "@/lib/hooks/use-webrtc"
import type { User } from "@supabase/supabase-js"

interface MessengerLayoutProps {
  user: User
  profile: any
}

export function MessengerLayout({ user, profile }: MessengerLayoutProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [remoteUserInfo, setRemoteUserInfo] = useState<{
    name: string
    avatar?: string
  } | null>(null)

  const {
    callState,
    localStream,
    remoteStream,
    isMuted,
    isVideoEnabled,
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleVideo,
  } = useWebRTC({
    conversationId: selectedConversationId || "",
    currentUserId: user.id,
    onCallEnd: () => setRemoteUserInfo(null),
  })

  const handleStartCall = async (callType: "audio" | "video", remoteUserId: string) => {
    // Get remote user info for call interface
    // This would typically come from the conversation data
    setRemoteUserInfo({
      name: "User", // You'd get this from the conversation
      avatar: "/placeholder.svg",
    })

    await startCall(callType, remoteUserId)
  }

  const handleAnswerCall = () => {
    // The offer would be stored when the incoming call was received
    // For now, we'll simulate answering
    answerCall({} as RTCSessionDescriptionInit)
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r border-border flex flex-col">
        {/* User Profile Header */}
        <UserProfile user={user} profile={profile} />

        {/* Conversations List */}
        <ConversationsList
          userId={user.id}
          selectedConversationId={selectedConversationId}
          onSelectConversation={setSelectedConversationId}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <ChatArea conversationId={selectedConversationId} currentUserId={user.id} onStartCall={handleStartCall} />
      </div>

      {/* Call Interface Overlay */}
      {(callState.isInCall || callState.isIncomingCall) && remoteUserInfo && (
        <CallInterface
          callType={callState.callType!}
          isIncomingCall={callState.isIncomingCall}
          isConnected={callState.isConnected}
          localStream={localStream}
          remoteStream={remoteStream}
          isMuted={isMuted}
          isVideoEnabled={isVideoEnabled}
          remoteUserName={remoteUserInfo.name}
          remoteUserAvatar={remoteUserInfo.avatar}
          onAnswer={handleAnswerCall}
          onEndCall={endCall}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
        />
      )}
    </div>
  )
}
