"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react"

interface CallInterfaceProps {
  callType: "audio" | "video"
  isIncomingCall: boolean
  isConnected: boolean
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  isMuted: boolean
  isVideoEnabled: boolean
  remoteUserName: string
  remoteUserAvatar?: string
  onAnswer: () => void
  onEndCall: () => void
  onToggleMute: () => void
  onToggleVideo: () => void
}

export function CallInterface({
  callType,
  isIncomingCall,
  isConnected,
  localStream,
  remoteStream,
  isMuted,
  isVideoEnabled,
  remoteUserName,
  remoteUserAvatar,
  onAnswer,
  onEndCall,
  onToggleMute,
  onToggleVideo,
}: CallInterfaceProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  if (isIncomingCall) {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-card p-8 rounded-lg shadow-lg text-center max-w-sm w-full mx-4">
          <Avatar className="h-24 w-24 mx-auto mb-4">
            <AvatarImage src={remoteUserAvatar || "/placeholder.svg"} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
              {remoteUserName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <h2 className="text-xl font-semibold mb-2">{remoteUserName}</h2>
          <p className="text-muted-foreground mb-6">Incoming {callType} call...</p>

          <div className="flex justify-center gap-4">
            <Button size="lg" variant="destructive" className="rounded-full h-14 w-14" onClick={onEndCall}>
              <PhoneOff className="h-6 w-6" />
            </Button>
            <Button size="lg" className="rounded-full h-14 w-14 bg-green-500 hover:bg-green-600" onClick={onAnswer}>
              <Phone className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {callType === "video" ? (
        <div className="flex-1 relative">
          {/* Remote video */}
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />

          {/* Local video */}
          <div className="absolute top-4 right-4 w-32 h-24 bg-muted rounded-lg overflow-hidden">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          </div>

          {/* Connection status */}
          {!isConnected && (
            <div className="absolute top-4 left-4 bg-yellow-500 text-yellow-50 px-3 py-1 rounded-full text-sm">
              Connecting...
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Avatar className="h-32 w-32 mx-auto mb-4">
              <AvatarImage src={remoteUserAvatar || "/placeholder.svg"} />
              <AvatarFallback className="bg-primary text-primary-foreground text-4xl">
                {remoteUserName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-semibold mb-2">{remoteUserName}</h2>
            <p className="text-muted-foreground">{isConnected ? "Connected" : "Connecting..."}</p>
          </div>
        </div>
      )}

      {/* Call controls */}
      <div className="p-6 bg-card/50 backdrop-blur-sm">
        <div className="flex justify-center gap-4">
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="lg"
            className="rounded-full h-14 w-14"
            onClick={onToggleMute}
          >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>

          {callType === "video" && (
            <Button
              variant={!isVideoEnabled ? "destructive" : "secondary"}
              size="lg"
              className="rounded-full h-14 w-14"
              onClick={onToggleVideo}
            >
              {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
            </Button>
          )}

          <Button variant="destructive" size="lg" className="rounded-full h-14 w-14" onClick={onEndCall}>
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  )
}
