"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

interface UseWebRTCProps {
  conversationId: string
  currentUserId: string
  onCallEnd?: () => void
}

interface CallState {
  isInCall: boolean
  isIncomingCall: boolean
  isOutgoingCall: boolean
  callType: "audio" | "video" | null
  remoteUserId: string | null
  isConnected: boolean
}

export function useWebRTC({ conversationId, currentUserId, onCallEnd }: UseWebRTCProps) {
  const [callState, setCallState] = useState<CallState>({
    isInCall: false,
    isIncomingCall: false,
    isOutgoingCall: false,
    callType: null,
    remoteUserId: null,
    isConnected: false,
  })

  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const supabase = createClient()

  const configuration: RTCConfiguration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
  }

  useEffect(() => {
    // Subscribe to call signaling
    const channel = supabase
      .channel(`call:${conversationId}`)
      .on("broadcast", { event: "call-offer" }, (payload) => {
        if (payload.payload.to === currentUserId) {
          handleIncomingCall(payload.payload)
        }
      })
      .on("broadcast", { event: "call-answer" }, (payload) => {
        if (payload.payload.to === currentUserId) {
          handleCallAnswer(payload.payload)
        }
      })
      .on("broadcast", { event: "ice-candidate" }, (payload) => {
        if (payload.payload.to === currentUserId) {
          handleIceCandidate(payload.payload)
        }
      })
      .on("broadcast", { event: "call-end" }, (payload) => {
        if (payload.payload.to === currentUserId) {
          handleCallEnd()
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      cleanup()
    }
  }, [conversationId, currentUserId])

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(configuration)

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        supabase.channel(`call:${conversationId}`).send({
          type: "broadcast",
          event: "ice-candidate",
          payload: {
            candidate: event.candidate,
            to: callState.remoteUserId,
            from: currentUserId,
          },
        })
      }
    }

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0])
      setCallState((prev) => ({ ...prev, isConnected: true }))
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        handleCallEnd()
      }
    }

    return pc
  }, [conversationId, currentUserId, callState.remoteUserId])

  const startCall = useCallback(
    async (callType: "audio" | "video", remoteUserId: string) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === "video",
        })

        setLocalStream(stream)
        setCallState({
          isInCall: true,
          isOutgoingCall: true,
          isIncomingCall: false,
          callType,
          remoteUserId,
          isConnected: false,
        })

        const pc = createPeerConnection()
        peerConnectionRef.current = pc

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream)
        })

        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        // Send offer through Supabase
        await supabase.channel(`call:${conversationId}`).send({
          type: "broadcast",
          event: "call-offer",
          payload: {
            offer,
            callType,
            to: remoteUserId,
            from: currentUserId,
          },
        })

        // Log call in database
        await supabase.from("call_logs").insert({
          conversation_id: conversationId,
          caller_id: currentUserId,
          call_type: callType,
          status: "answered",
        })
      } catch (error) {
        console.error("Error starting call:", error)
        handleCallEnd()
      }
    },
    [conversationId, currentUserId, createPeerConnection],
  )

  const handleIncomingCall = useCallback(async (payload: any) => {
    setCallState({
      isInCall: false,
      isIncomingCall: true,
      isOutgoingCall: false,
      callType: payload.callType,
      remoteUserId: payload.from,
      isConnected: false,
    })
  }, [])

  const answerCall = useCallback(
    async (offer: RTCSessionDescriptionInit) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callState.callType === "video",
        })

        setLocalStream(stream)
        setCallState((prev) => ({
          ...prev,
          isInCall: true,
          isIncomingCall: false,
        }))

        const pc = createPeerConnection()
        peerConnectionRef.current = pc

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream)
        })

        await pc.setRemoteDescription(offer)
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        // Send answer through Supabase
        await supabase.channel(`call:${conversationId}`).send({
          type: "broadcast",
          event: "call-answer",
          payload: {
            answer,
            to: callState.remoteUserId,
            from: currentUserId,
          },
        })
      } catch (error) {
        console.error("Error answering call:", error)
        handleCallEnd()
      }
    },
    [conversationId, currentUserId, callState.callType, callState.remoteUserId, createPeerConnection],
  )

  const handleCallAnswer = useCallback(async (payload: any) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.setRemoteDescription(payload.answer)
    }
  }, [])

  const handleIceCandidate = useCallback(async (payload: any) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.addIceCandidate(payload.candidate)
    }
  }, [])

  const endCall = useCallback(async () => {
    // Notify remote user
    if (callState.remoteUserId) {
      await supabase.channel(`call:${conversationId}`).send({
        type: "broadcast",
        event: "call-end",
        payload: {
          to: callState.remoteUserId,
          from: currentUserId,
        },
      })
    }

    handleCallEnd()
  }, [conversationId, currentUserId, callState.remoteUserId])

  const handleCallEnd = useCallback(() => {
    cleanup()
    setCallState({
      isInCall: false,
      isIncomingCall: false,
      isOutgoingCall: false,
      callType: null,
      remoteUserId: null,
      isConnected: false,
    })
    onCallEnd?.()
  }, [onCallEnd])

  const cleanup = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
      setLocalStream(null)
    }
    if (remoteStream) {
      setRemoteStream(null)
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
  }, [localStream, remoteStream])

  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }, [localStream])

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoEnabled(videoTrack.enabled)
      }
    }
  }, [localStream])

  return {
    callState,
    localStream,
    remoteStream,
    isMuted,
    isVideoEnabled,
    startCall,
    answerCall: (offer: RTCSessionDescriptionInit) => answerCall(offer),
    endCall,
    toggleMute,
    toggleVideo,
  }
}
