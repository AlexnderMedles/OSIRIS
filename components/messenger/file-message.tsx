"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Download, Eye, File, ImageIcon, FileText, Play } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileMessageProps {
  fileName: string
  fileSize: number
  fileType: string
  fileUrl: string
  isOwnMessage: boolean
}

export function FileMessage({ fileName, fileSize, fileType, fileUrl, isOwnMessage }: FileMessageProps) {
  const [showPreview, setShowPreview] = useState(false)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileIcon = () => {
    if (fileType.startsWith("image/")) return <ImageIcon className="h-5 w-5" />
    if (fileType.includes("pdf") || fileType.includes("document")) return <FileText className="h-5 w-5" />
    if (fileType.startsWith("video/")) return <Play className="h-5 w-5" />
    return <File className="h-5 w-5" />
  }

  const canPreview = () => {
    return fileType.startsWith("image/") || fileType.includes("pdf") || fileType.startsWith("video/")
  }

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = fileUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const renderPreview = () => {
    if (fileType.startsWith("image/")) {
      return <img src={fileUrl || "/placeholder.svg"} alt={fileName} className="max-w-full max-h-96 object-contain" />
    }
    if (fileType.startsWith("video/")) {
      return <video src={fileUrl} controls className="max-w-full max-h-96" />
    }
    if (fileType.includes("pdf")) {
      return <iframe src={fileUrl} className="w-full h-96" title={fileName} />
    }
    return null
  }

  // For images, show inline preview
  if (fileType.startsWith("image/")) {
    return (
      <>
        <div
          className={cn(
            "rounded-2xl overflow-hidden cursor-pointer max-w-xs",
            isOwnMessage ? "bg-primary" : "bg-muted",
          )}
          onClick={() => setShowPreview(true)}
        >
          <img src={fileUrl || "/placeholder.svg"} alt={fileName} className="w-full h-auto object-cover max-h-64" />
          <div className="p-2">
            <p className={cn("text-xs truncate", isOwnMessage ? "text-primary-foreground" : "text-foreground")}>
              {fileName}
            </p>
          </div>
        </div>

        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{fileName}</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">{renderPreview()}</div>
            <div className="flex justify-end">
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // For other files, show file card
  return (
    <>
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-2xl min-w-48 max-w-xs",
          isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        <div className="flex-shrink-0">{getFileIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileName}</p>
          <p className="text-xs opacity-70">{formatFileSize(fileSize)}</p>
        </div>
        <div className="flex gap-1">
          {canPreview() && (
            <Button
              variant={isOwnMessage ? "secondary" : "default"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setShowPreview(true)}
            >
              <Eye className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant={isOwnMessage ? "secondary" : "default"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleDownload}
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {canPreview() && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{fileName}</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">{renderPreview()}</div>
            <div className="flex justify-end">
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
