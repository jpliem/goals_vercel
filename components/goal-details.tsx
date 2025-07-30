"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { 
  ImageIcon, 
  X, 
  History, 
  Target, 
  Clock, 
  Eye, 
  TrendingUp, 
  CheckCircle, 
  User, 
  Users,
  Calendar,
  Pause,
  FileText,
  MessageSquare,
  Edit,
  HandHeart,
  Building2
} from "lucide-react"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { GoalWithDetails, UserRecord, GoalAttachment, GoalAssignee } from "@/lib/goal-database"
import { getGoalAttachmentUrl } from "@/lib/goal-database"
import { 
  deleteGoal, 
  addGoalComment as addGoalCommentAction, 
  updateGoalStatus as updateGoalStatusAction, 
  uploadGoalCommentAttachment, 
  markGoalAssigneeTaskComplete,
  updateGoalDetails as updateGoalDetailsAction,
} from "@/actions/goals"
import { getGoalAttachments, deleteGoalAttachment, uploadMultipleGoalAttachments } from "@/actions/goal-attachments"
import { FileUpload } from "@/components/ui/file-upload"
import { GoalWorkflowHistory } from "@/components/goal-workflow-history"
import { EditGoalModal } from "@/components/modals/edit-goal-modal"
import { AssigneesStakeholdersCard } from "@/components/assignees-stakeholders-card"
import { GoalTasksCard } from "@/components/goal-tasks-card"

interface GoalDetailsProps {
  goal: GoalWithDetails
  userProfile: UserRecord
  users?: UserRecord[]
  onDataRefresh?: () => void
}

export function GoalDetails({ goal, userProfile, users = [], onDataRefresh }: GoalDetailsProps) {
  const [newComment, setNewComment] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<GoalAttachment[]>([])
  const [loadingAttachments, setLoadingAttachments] = useState(true)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [assignees, setAssignees] = useState<GoalAssignee[]>([])
  const [assigneeCompletionNotes, setAssigneeCompletionNotes] = useState<any[]>([])
  const [loadingCompletionNotes, setLoadingCompletionNotes] = useState(false)
  const [loadingAssignees, setLoadingAssignees] = useState(true)
  const [taskCompletionNotes, setTaskCompletionNotes] = useState("")
  const [recentAttachments, setRecentAttachments] = useState<GoalAttachment[]>([])
  const router = useRouter()

  const isOwner = goal.owner_id === userProfile.id
  const isCurrentAssignee = goal.current_assignee_id === userProfile.id
  
  // Multi-assignee check (primary system)
  const isMultiAssignee = assignees.some(assignee => assignee.user_id === userProfile.id)
  
  // Legacy single assignee check (fallback only when no multi-assignee data)
  const isLegacyAssignee = !loadingAssignees && assignees.length === 0 && goal.current_assignee_id === userProfile.id
  
  // Combined assignee check - prioritize multi-assignee system
  const isAnyAssignee = isMultiAssignee || isLegacyAssignee
  
  const wasInvolved = isOwner || isAnyAssignee
  const canEdit = userProfile.role === "Admin" || 
                 (userProfile.role === "Head" && goal.department === userProfile.department) ||
                 isOwner
  const canComment = isOwner || isAnyAssignee || userProfile.role === "Admin" || userProfile.role === "Head"

  // Helper function to get PDCA status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Plan': return 'bg-blue-100 text-blue-800'
      case 'Do': return 'bg-purple-100 text-purple-800'
      case 'Check': return 'bg-orange-100 text-orange-800'
      case 'Act': return 'bg-green-100 text-green-800'
      case 'Completed': return 'bg-green-500 text-white'
      case 'On Hold': return 'bg-yellow-100 text-yellow-800'
      case 'Cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Helper function to get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-500 text-white'
      case 'High': return 'bg-orange-500 text-white'
      case 'Medium': return 'bg-yellow-500 text-white'
      case 'Low': return 'bg-green-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  // Helper function to get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Plan': return Target
      case 'Do': return Clock
      case 'Check': return Eye
      case 'Act': return TrendingUp
      case 'Completed': return CheckCircle
      case 'On Hold': return Pause
      default: return Clock
    }
  }

  // Helper function to check if goal is overdue
  const isGoalOverdue = (goal: GoalWithDetails): boolean => {
    if (!goal.target_date || goal.status === "Completed") return false
    const targetDate = new Date(goal.target_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return targetDate < today
  }

  // Check if current phase has incomplete tasks for validation
  const getCurrentPhaseTaskValidation = () => {
    if (!goal.tasks || goal.tasks.length === 0) {
      return { canProgress: true, incompleteTasks: [] }
    }

    const currentPhaseTasks = goal.tasks.filter(task => 
      task.pdca_phase === goal.status || 
      (!task.pdca_phase && goal.status === 'Plan')
    )

    const incompleteTasks = currentPhaseTasks.filter(task => task.status !== 'completed')
    const canProgress = incompleteTasks.length === 0
    
    return {
      canProgress: canProgress,
      incompleteTasks: incompleteTasks
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      setError("Comment cannot be empty")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await addGoalCommentAction(goal.id, newComment.trim())
      
      if (result.error) {
        setError(result.error as string)
      } else {
        setNewComment("")
        onDataRefresh?.()
      }
    } catch (error) {
      setError("Failed to add comment")
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await updateGoalStatusAction(goal.id, newStatus)
      
      if (result.error) {
        setError(result.error as string)
      } else {
        onDataRefresh?.()
      }
    } catch (error) {
      setError("Failed to update goal status")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCompleteTask = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await markGoalAssigneeTaskComplete(goal.id, userProfile.id, taskCompletionNotes.trim() || undefined)
      
      if (result.error) {
        setError(result.error as string)
      } else {
        setTaskCompletionNotes("")
        onDataRefresh?.()
      }
    } catch (error) {
      setError("Failed to complete task")
    } finally {
      setIsLoading(false)
    }
  }

  const loadAttachments = async () => {
    setLoadingAttachments(true)
    try {
      const result = await getGoalAttachments(goal.id)
      if (!result.error && result.data) {
        setAttachments(result.data)
      }
    } catch (error) {
      console.error("Failed to load attachments:", error)
    } finally {
      setLoadingAttachments(false)
    }
  }

  const handleFileUpload = async () => {
    if (uploadFiles.length === 0) return

    setUploadLoading(true)
    setUploadError(null)

    try {
      const result = await uploadMultipleGoalAttachments(goal.id, uploadFiles)
      
      if (result.error) {
        setUploadError(result.error)
      } else {
        setUploadFiles([])
        loadAttachments()
      }
    } catch (error) {
      setUploadError("Failed to upload files")
    } finally {
      setUploadLoading(false)
    }
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const result = await deleteGoalAttachment(attachmentId, goal.id)
      if (!result.error) {
        loadAttachments()
      }
    } catch (error) {
      console.error("Failed to delete attachment:", error)
    }
  }

  // Load initial data
  useEffect(() => {
    loadAttachments()
  }, [goal.id])

  const StatusIcon = getStatusIcon(goal.status)
  const isOverdue = isGoalOverdue(goal)
  const phaseValidation = getCurrentPhaseTaskValidation()

  return (
    <div className="space-y-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        {/* Goal Header */}
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">{goal.subject}</h1>
                  <Badge className={`${getStatusColor(goal.status)} text-xs`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {goal.status}
                  </Badge>
                  {goal.priority && goal.priority !== 'Medium' && (
                    <Badge variant="outline" className="text-xs">
                      {goal.priority}
                    </Badge>
                  )}
                </div>
                
                {goal.start_date && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>Start: {new Date(goal.start_date).toLocaleDateString()}</span>
                    {new Date(goal.start_date) > new Date() && <Badge variant="outline" className="text-xs">Scheduled</Badge>}
                  </div>
                )}

                {goal.target_date && (
                  <div className={`flex items-center gap-1 text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                    <Calendar className="h-4 w-4" />
                    <span>Target: {new Date(goal.adjusted_target_date || goal.target_date).toLocaleDateString()}</span>
                    {isOverdue && <span>(Overdue)</span>}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* PDCA Progress Controls */}
                <TooltipProvider>
                  {(canEdit || isAnyAssignee) && goal.status !== "Completed" && goal.status !== "Cancelled" && (
                    <>
                      {goal.status === "Plan" && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button 
                                onClick={() => handleStatusChange("Do")}
                                disabled={isLoading || !phaseValidation.canProgress}
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                              >
                                <Target className="h-4 w-4 mr-2" />
                                Start Do Phase
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {!phaseValidation.canProgress && (
                            <TooltipContent>
                              <div className="max-w-xs">
                                <div className="font-medium mb-1">Complete all Plan phase tasks first:</div>
                                <ul className="text-sm space-y-1">
                                  {phaseValidation.incompleteTasks.slice(0, 3).map((task, idx) => (
                                    <li key={idx} className="flex items-center gap-1">
                                      <span className="w-1 h-1 bg-current rounded-full flex-shrink-0" />
                                      {task.title}
                                    </li>
                                  ))}
                                  {phaseValidation.incompleteTasks.length > 3 && (
                                    <li className="text-gray-400">...and {phaseValidation.incompleteTasks.length - 3} more</li>
                                  )}
                                </ul>
                              </div>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      )}
                      {goal.status === "Do" && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button 
                                onClick={() => handleStatusChange("Check")}
                                disabled={isLoading || !phaseValidation.canProgress}
                                size="sm"
                                className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Begin Check
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {!phaseValidation.canProgress && (
                            <TooltipContent>
                              <div className="max-w-xs">
                                <div className="font-medium mb-1">Complete all Do phase tasks first:</div>
                                <ul className="text-sm space-y-1">
                                  {phaseValidation.incompleteTasks.slice(0, 3).map((task, idx) => (
                                    <li key={idx} className="flex items-center gap-1">
                                      <span className="w-1 h-1 bg-current rounded-full flex-shrink-0" />
                                      {task.title}
                                    </li>
                                  ))}
                                  {phaseValidation.incompleteTasks.length > 3 && (
                                    <li className="text-gray-400">...and {phaseValidation.incompleteTasks.length - 3} more</li>
                                  )}
                                </ul>
                              </div>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      )}
                      {goal.status === "Check" && (
                        <div className="flex gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button 
                                  onClick={() => handleStatusChange("Act")}
                                  disabled={isLoading || !phaseValidation.canProgress}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Take Action
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {!phaseValidation.canProgress && (
                              <TooltipContent>
                                <div className="max-w-xs">
                                  <div className="font-medium mb-1">Complete all Check phase tasks first:</div>
                                  <ul className="text-sm space-y-1">
                                    {phaseValidation.incompleteTasks.slice(0, 3).map((task, idx) => (
                                      <li key={idx} className="flex items-center gap-1">
                                        <span className="w-1 h-1 bg-current rounded-full flex-shrink-0" />
                                        {task.title}
                                      </li>
                                    ))}
                                    {phaseValidation.incompleteTasks.length > 3 && (
                                      <li className="text-gray-400">...and {phaseValidation.incompleteTasks.length - 3} more</li>
                                    )}
                                  </ul>
                                </div>
                              </TooltipContent>
                            )}
                          </Tooltip>
                          <Button 
                            onClick={() => handleStatusChange("Do")}
                            disabled={isLoading}
                            variant="outline"
                            size="sm"
                          >
                            Back to Do
                          </Button>
                        </div>
                      )}
                      {goal.status === "Act" && (
                        <div className="flex gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button 
                                  onClick={() => handleStatusChange("Completed")}
                                  disabled={isLoading || !phaseValidation.canProgress}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Complete Goal
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {!phaseValidation.canProgress && (
                              <TooltipContent>
                                <div className="max-w-xs">
                                  <div className="font-medium mb-1">Complete all Act phase tasks first:</div>
                                  <ul className="text-sm space-y-1">
                                    {phaseValidation.incompleteTasks.slice(0, 3).map((task, idx) => (
                                      <li key={idx} className="flex items-center gap-1">
                                        <span className="w-1 h-1 bg-current rounded-full flex-shrink-0" />
                                        {task.title}
                                      </li>
                                    ))}
                                    {phaseValidation.incompleteTasks.length > 3 && (
                                      <li className="text-gray-400">...and {phaseValidation.incompleteTasks.length - 3} more</li>
                                    )}
                                  </ul>
                                </div>
                              </TooltipContent>
                            )}
                          </Tooltip>
                          <Button 
                            onClick={() => handleStatusChange("Plan")}
                            disabled={isLoading}
                            variant="outline"
                            size="sm"
                          >
                            New PDCA Cycle
                          </Button>
                        </div>
                      )}
                    
                    {goal.status !== "On Hold" && (
                      <Button 
                        onClick={() => handleStatusChange("On Hold")}
                        disabled={isLoading}
                        variant="outline"
                        size="sm"
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        Hold
                      </Button>
                    )}
                    
                    {goal.status === "On Hold" && (
                      <Button 
                        onClick={() => handleStatusChange(goal.previous_status || "Plan")}
                        disabled={isLoading}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Resume Goal
                      </Button>
                      )}
                    </>
                  )}
                </TooltipProvider>
                
                {canEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditModalOpen(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content Layout */}
        <div className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Goal Information and Assignees */}
              <div className="space-y-6">
                {/* Goal Information */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                      <FileText className="h-5 w-5 text-green-600" />
                      Goal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 p-4">
                    <div>
                      <Label className="text-sm font-medium mb-3 block">Description</Label>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {goal.description || 'No description provided'}
                      </p>
                    </div>

                    {goal.target_metrics && (
                      <div className="border-t pt-4">
                        <Label className="text-sm font-medium mb-3 block">Target Metrics</Label>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{goal.target_metrics}</p>
                      </div>
                    )}

                    {goal.success_criteria && (
                      <div className="border-t pt-4">
                        <Label className="text-sm font-medium mb-3 block">Success Criteria</Label>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{goal.success_criteria}</p>
                      </div>
                    )}

                    <div className="border-t pt-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Created</Label>
                          <p className="text-gray-700">{new Date(goal.created_at).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Last Updated</Label>
                          <p className="text-gray-700">{new Date(goal.updated_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Assignees & Stakeholders */}
                <AssigneesStakeholdersCard goal={goal} assignees={assignees} />
              </div>

              {/* Right Column: Tasks */}
              <div className="space-y-6">
                <GoalTasksCard
                  goalId={goal.id}
                  currentUser={userProfile}
                  users={users}
                  isOwner={isOwner}
                  isAssignee={isAnyAssignee}
                  currentGoalStatus={goal.status}
                  goalDepartment={goal.department}
                  supportDepartments={goal.support?.map((s: any) => s.support_name) || []}
                />
              </div>
            </div>

            {/* Task Completion for Multi-Assignees */}
            {isMultiAssignee && goal.status !== "Completed" && (
              <Card className="shadow-sm mt-6">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Complete Your Task
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Add completion notes (optional)"
                        value={taskCompletionNotes}
                        onChange={(e) => setTaskCompletionNotes(e.target.value)}
                        rows={2}
                        className="text-sm"
                      />
                      <Button 
                        onClick={handleCompleteTask}
                        disabled={isLoading}
                        size="sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark My Task Complete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Activity & Communications Side-by-Side Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Left Column: Activity & History */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <History className="h-5 w-5 text-gray-600" />
                    Goal Activity & History
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <GoalWorkflowHistory workflowHistory={goal.workflow_history || []} />
                </CardContent>
              </Card>

              {/* Right Column: Communications */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    Comments & Updates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  {/* Display existing comments with scrollable container */}
                  <div>
                    <h4 className="font-medium text-sm mb-4">Recent Comments</h4>
                    <div className="max-h-96 overflow-y-auto">
                      {goal.comments && goal.comments.length > 0 ? (
                        <div className="space-y-4 pr-2">
                          {goal.comments.map((comment: any, index: number) => (
                            <div key={comment.id}>
                              <div className="border-l-4 border-blue-200 pl-4 py-4 bg-gray-50 rounded-r-lg">
                                <div className="flex items-start gap-3">
                                  {/* User Avatar */}
                                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-medium text-blue-700">
                                      {(comment.user?.full_name || 'Unknown User').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-medium text-sm text-gray-900">
                                        {comment.user?.full_name || 'Unknown User'}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {new Date(comment.created_at).toLocaleString()}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{comment.comment}</p>
                                  </div>
                                </div>
                              </div>
                              {/* Separator line between comments */}
                              {index < (goal.comments?.length || 0) - 1 && (
                                <hr className="border-gray-200 mt-4" />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <MessageSquare className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                          <p className="text-sm">No comments yet</p>
                          <p className="text-xs text-gray-400 mt-1">Be the first to share an update</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Add Comment Form */}
                  {canComment && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-sm mb-4">Add Progress Update</h4>
                      <div className="space-y-4">
                        <div className="relative">
                          <Textarea
                            placeholder="Share progress updates, challenges, or achievements..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            rows={4}
                            className="resize-none text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                            {newComment.length}/500
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button 
                            onClick={handleAddComment}
                            disabled={isLoading || !newComment.trim()}
                            size="sm"
                            className="px-4"
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            {isLoading ? 'Adding...' : 'Add Comment'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
        </div>

        {/* Modals */}
        {editModalOpen && (
          <EditGoalModal
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            goal={goal}
            onUpdate={() => onDataRefresh?.()}
          />
        )}

      </div>
    </div>
  )
}