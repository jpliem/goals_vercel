"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Markdown } from "@/components/ui/markdown"
import { 
  Bot, 
  Calendar,
  Building2,
  User,
  X
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface GoalAIAnalysisModalProps {
  isOpen: boolean
  onClose: () => void
  goalData: {
    goal: {
      id: string
      subject: string
      description: string
      status: string
      department: string
      priority: string
      created_at: string
      target_date: string | null
      owner: { full_name: string } | null
    }
    analysis: {
      id: string
      analysis_type: string
      created_at: string
      analysis_result: string
      tokens_used?: number
      processing_time_ms?: number
      ai_config: { 
        model_name: string
        name: string
      } | null
    }
  } | null
}

export function GoalAIAnalysisModal({ isOpen, onClose, goalData }: GoalAIAnalysisModalProps) {
  if (!goalData) return null

  const { goal, analysis } = goalData

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Bot className="h-6 w-6 text-blue-600" />
              AI Analysis
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Goal & Analysis Header */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{goal.subject}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {goal.department}
                  </span>
                  {goal.owner && (
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {goal.owner.full_name}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                  <Calendar className="h-4 w-4" />
                  Analyzed {formatDistanceToNow(new Date(analysis.created_at), { addSuffix: true })}
                </div>
                {analysis.ai_config && (
                  <Badge variant="outline" className="text-xs">
                    {analysis.ai_config.model_name}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Analysis Result */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <Markdown content={analysis.analysis_result} variant="default" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}