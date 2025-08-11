"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Markdown } from "@/components/ui/markdown"
import { 
  BarChart3,
  User,
  Clock,
  Cpu,
  Calendar,
  Copy
} from "lucide-react"
import { useRef, useState } from "react"
import { exportHtmlToPdf } from "@/lib/print-export"

interface MetaSummaryModalProps {
  isOpen: boolean
  onClose: () => void
  summary: {
    id: string
    analysis_result: string
    prompt_used: string
    tokens_used: number
    processing_time_ms: number
    created_at: string
    users: { full_name: string; email: string }
    ai_configurations: { name: string; model_name: string }
  } | null
}

export function MetaSummaryModal({ isOpen, onClose, summary }: MetaSummaryModalProps) {
  const [copied, setCopied] = useState(false)
  const contentRef = useRef<HTMLDivElement | null>(null)

  const handleCopy = async () => {
    if (!summary) return
    
    try {
      await navigator.clipboard.writeText(summary.analysis_result)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy text:', error)
    }
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.round(ms / 1000)
    return seconds < 60 ? `${seconds}s` : `${Math.round(seconds / 60)}m ${seconds % 60}s`
  }

  if (!isOpen || !summary) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            Executive Meta-Summary
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="space-y-6 pr-4">
            {/* Summary Metadata */}
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-600" />
                  <div>
                    <div className="font-medium">Created by</div>
                    <div className="text-gray-600">{summary.users.full_name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <div>
                    <div className="font-medium">Generated</div>
                    <div className="text-gray-600">
                      {new Date(summary.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-600" />
                  <div>
                    <div className="font-medium">AI Model</div>
                    <div className="text-gray-600">{summary.ai_configurations.model_name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <div>
                    <div className="font-medium">Processing Time</div>
                    <div className="text-gray-600">{formatDuration(summary.processing_time_ms)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Analysis Type and Scope */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                Meta-Summary Analysis
              </Badge>
              <div className="text-sm text-gray-600">
                {summary.prompt_used}
              </div>
            </div>

            {/* Executive Summary Content */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Executive Analysis</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              
              <div className="bg-white border rounded-lg p-6">
                <div className="flex items-center justify-end mb-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (contentRef.current) {
                        exportHtmlToPdf(contentRef.current.innerHTML, 'Executive Meta-Summary')
                      }
                    }}
                  >
                    Export PDF
                  </Button>
                </div>
                <div ref={contentRef} className="markdown-capture bg-white">
                  <Markdown 
                    content={summary.analysis_result} 
                    variant="analysis"
                    className="text-sm prose-pre:whitespace-pre-wrap prose-pre:break-words"
                  />
                </div>
              </div>
            </div>

            {/* Usage Statistics */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-sm mb-3">Analysis Statistics</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Tokens Used:</span>
                  <span className="ml-2 font-medium">{summary.tokens_used.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-600">AI Configuration:</span>
                  <span className="ml-2 font-medium">{summary.ai_configurations.name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 flex justify-end pt-4 border-t">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
