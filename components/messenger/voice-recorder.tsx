"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Send, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface VoiceRecorderProps {
  onSendVoiceMessage: (audioBlob: Blob, duration: number) => void
  onCancel: () => void
}

export function VoiceRecorder({ onSendVoiceMessage, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        setAudioBlob(blob)
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error("Error accessing microphone:", error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const playRecording = () => {
    if (audioBlob && !isPlaying) {
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onended = () => {
        setIsPlaying(false)
        URL.revokeObjectURL(audioUrl)
      }

      audio.play()
      setIsPlaying(true)
    }
  }

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }

  const handleSend = () => {
    if (audioBlob) {
      onSendVoiceMessage(audioBlob, recordingTime)
    }
  }

  const handleCancel = () => {
    if (isRecording) {
      stopRecording()
    }
    if (isPlaying) {
      stopPlayback()
    }
    setAudioBlob(null)
    setRecordingTime(0)
    onCancel()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
      <div className="flex items-center gap-2">
        {!audioBlob ? (
          <Button
            variant={isRecording ? "destructive" : "default"}
            size="sm"
            onClick={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={isPlaying ? stopPlayback : playRecording}>
            {isPlaying ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        )}

        <div className="flex items-center gap-2">
          <span className="text-sm font-mono">{formatTime(recordingTime)}</span>
          {isRecording && (
            <div className="flex gap-1">
              <div className={cn("w-1 h-4 bg-red-500 rounded-full animate-pulse")} />
              <div className={cn("w-1 h-3 bg-red-400 rounded-full animate-pulse delay-100")} />
              <div className={cn("w-1 h-2 bg-red-300 rounded-full animate-pulse delay-200")} />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          <Trash2 className="h-4 w-4" />
        </Button>
        {audioBlob && (
          <Button size="sm" onClick={handleSend}>
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
