"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause } from "lucide-react"
import { cn } from "@/lib/utils"

interface VoiceMessageProps {
  audioUrl: string
  duration: number
  isOwnMessage: boolean
}

export function VoiceMessage({ audioUrl, duration, isOwnMessage }: VoiceMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [])

  const togglePlayback = async () => {
    if (!audioRef.current) {
      setIsLoading(true)
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onloadeddata = () => {
        setIsLoading(false)
      }

      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime)
      }

      audio.onended = () => {
        setIsPlaying(false)
        setCurrentTime(0)
      }

      audio.onerror = () => {
        setIsLoading(false)
        console.error("Error loading audio")
      }
    }

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      try {
        await audioRef.current.play()
        setIsPlaying(true)
      } catch (error) {
        console.error("Error playing audio:", error)
        setIsLoading(false)
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-2xl min-w-48",
        isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted",
      )}
    >
      <Button
        variant={isOwnMessage ? "secondary" : "default"}
        size="sm"
        className="flex-shrink-0 h-8 w-8 rounded-full"
        onClick={togglePlayback}
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : isPlaying ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Play className="h-3 w-3" />
        )}
      </Button>

      <div className="flex-1">
        {/* Waveform visualization */}
        <div className="relative h-6 mb-1">
          <div className="flex items-center justify-center h-full gap-0.5">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-0.5 rounded-full transition-all duration-150",
                  i < (progress / 100) * 20
                    ? isOwnMessage
                      ? "bg-primary-foreground"
                      : "bg-primary"
                    : isOwnMessage
                      ? "bg-primary-foreground/30"
                      : "bg-muted-foreground/30",
                )}
                style={{
                  height: `${Math.random() * 16 + 8}px`,
                }}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-between text-xs opacity-70">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  )
}
