"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Paperclip, Mic } from "lucide-react"
import { VoiceRecorder } from "./voice-recorder"
import { FileUpload } from "./file-upload"

interface MessageInputProps {
  conversationId: string
  currentUserId: string
}

export function MessageInput({ conversationId, currentUserId }: MessageInputProps) {
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const supabase = createClient()

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return

    setIsLoading(true)

    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: message.trim(),
        message_type: "text",
      })

      if (error) throw error

      // Update conversation timestamp
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId)

      setMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const sendVoiceMessage = async (audioBlob: Blob, duration: number) => {
    setIsLoading(true)

    try {
      // Convert blob to base64 for storage (in a real app, you'd upload to storage)
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64Audio = reader.result as string

        const { error } = await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: base64Audio, // Store base64 audio data
          message_type: "voice",
          voice_duration: duration,
        })

        if (error) throw error

        // Update conversation timestamp
        await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId)

        setShowVoiceRecorder(false)
      }
      reader.readAsDataURL(audioBlob)
    } catch (error) {
      console.error("Error sending voice message:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const sendFileMessage = async (file: File) => {
    setIsLoading(true)

    try {
      // Convert file to base64 for storage (in a real app, you'd upload to blob storage)
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64File = reader.result as string

        const { error } = await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: base64File, // Store base64 file data
          message_type: "file",
          file_name: file.name,
          file_size: file.size,
        })

        if (error) throw error

        // Update conversation timestamp
        await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId)

        setShowFileUpload(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error("Error sending file message:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (showVoiceRecorder) {
    return (
      <div className="p-4 border-t border-border">
        <VoiceRecorder onSendVoiceMessage={sendVoiceMessage} onCancel={() => setShowVoiceRecorder(false)} />
      </div>
    )
  }

  if (showFileUpload) {
    return (
      <div className="p-4 border-t border-border">
        <FileUpload
          onFileSelect={sendFileMessage}
          onCancel={() => setShowFileUpload(false)}
          maxSize={10}
          acceptedTypes={["image/", "application/pdf", "text/", "video/", "audio/"]}
        />
      </div>
    )
  }

  return (
    <div className="p-4 border-t border-border">
      <div className="flex items-end gap-2">
        <Button variant="ghost" size="sm" className="flex-shrink-0" onClick={() => setShowFileUpload(true)}>
          <Paperclip className="h-4 w-4" />
        </Button>

        <div className="flex-1 relative">
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className="pr-12"
          />
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2"
            onClick={() => setShowVoiceRecorder(true)}
          >
            <Mic className="h-4 w-4" />
          </Button>
        </div>

        <Button onClick={sendMessage} disabled={!message.trim() || isLoading} size="sm" className="flex-shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
