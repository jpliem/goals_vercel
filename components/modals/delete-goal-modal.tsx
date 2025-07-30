"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ConfirmationInput } from "@/components/ui/confirmation-input"
import { 
  Trash2, 
  AlertTriangle, 
  Target, 
  MessageSquare, 
  Paperclip, 
  Users, 
  Bell,
  Bot,
  Building2,
  Loader2
} from "lucide-react"
import { getGoalDeletionImpactData, deleteGoal } from "@/actions/goals"

interface DeleteGoalModalProps {
  isOpen: boolean
  onClose: () => void
  goalId: string
  onDeleted?: () => void
}

interface GoalDeletionData {
  goal: {
    id: string
    subject: string
    description: string
    department: string
    owner: { full_name: string } | null
  }
  impact: {
    tasks: number
    comments: number
    attachments: number
    notifications: number
    assignees: number
    ai_analyses: number
    support_departments: number
  }
}

export function DeleteGoalModal({ isOpen, onClose, goalId, onDeleted }: DeleteGoalModalProps) {
  const [deletionData, setDeletionData] = useState<GoalDeletionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isConfirmed, setIsConfirmed] = useState(false)

  // Load goal deletion impact data
  useEffect(() => {
    if (isOpen && goalId) {
      loadDeletionData()
    }
  }, [isOpen, goalId])

  const loadDeletionData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await getGoalDeletionImpactData(goalId)
      
      if (result.error) {
        setError(result.error)
      } else if (result.data) {
        setDeletionData(result.data as GoalDeletionData)
      }
    } catch (error) {
      setError("Failed to load goal deletion data")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletionData || !isConfirmed) return
    
    setDeleting(true)
    setError(null)
    
    try {
      const result = await deleteGoal(goalId)
      
      if (result.error) {
        setError(result.error)
      } else {
        // Success - close modal and notify parent
        onClose()
        onDeleted?.()
      }
    } catch (error) {
      setError("Failed to delete goal")
    } finally {
      setDeleting(false)
    }
  }

  const handleClose = () => {
    if (deleting) return // Prevent closing while deleting
    setIsConfirmed(false)
    setError(null)
    onClose()
  }

  const getTotalImpactCount = (impact: GoalDeletionData['impact']) => {
    return impact.tasks + impact.comments + impact.attachments + 
           impact.notifications + impact.assignees + impact.ai_analyses + 
           impact.support_departments
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <Trash2 className="w-5 h-5" />
            Delete Goal - Permanent Action
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading goal data...</span>
            </div>
          ) : error ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : deletionData ? (
            <div className="space-y-6 pr-4">
                {/* Warning Alert */}
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>Warning:</strong> This action cannot be undone. This will permanently delete the goal and all related data including tasks, comments, attachments, and notifications.
                  </AlertDescription>
                </Alert>

                {/* Goal Information */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Target className="w-4 h-4 text-blue-600" />
                      Goal to be Deleted
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 bg-gray-50 rounded-md">
                      <h4 className="font-medium text-gray-900 mb-1">{deletionData.goal.subject}</h4>
                      <p className="text-sm text-gray-600 line-clamp-2">{deletionData.goal.description}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {deletionData.goal.department}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {deletionData.goal.owner?.full_name || 'Unknown'}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Impact Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      Data that will be deleted
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-blue-500" />
                          <span>Tasks</span>
                        </div>
                        <Badge variant="outline">{deletionData.impact.tasks}</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-green-500" />
                          <span>Comments</span>
                        </div>
                        <Badge variant="outline">{deletionData.impact.comments}</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Paperclip className="w-4 h-4 text-gray-500" />
                          <span>Attachments</span>
                        </div>
                        <Badge variant="outline">{deletionData.impact.attachments}</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-yellow-500" />
                          <span>Notifications</span>
                        </div>
                        <Badge variant="outline">{deletionData.impact.notifications}</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-purple-500" />
                          <span>Assignees</span>
                        </div>
                        <Badge variant="outline">{deletionData.impact.assignees}</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4 text-indigo-500" />
                          <span>AI Analyses</span>
                        </div>
                        <Badge variant="outline">{deletionData.impact.ai_analyses}</Badge>
                      </div>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="flex items-center justify-between font-medium">
                      <span>Total records to delete:</span>
                      <Badge variant="destructive" className="text-base px-3 py-1">
                        {getTotalImpactCount(deletionData.impact) + 1} {/* +1 for the goal itself */}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Confirmation Input */}
                <ConfirmationInput
                  label="Type the goal title to confirm deletion:"
                  confirmText={deletionData.goal.subject}
                  onConfirmationChange={setIsConfirmed}
                />

                {error && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
          ) : null}
        </div>

        <div className="flex-shrink-0 flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmed || deleting || loading}
            className="min-w-[120px]"
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Goal
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}