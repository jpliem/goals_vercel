import { Check, Clock, Users, User, Eye, CheckCircle, Target, TrendingUp, Pause } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface PDCAProgressProps {
  currentStatus: string
  previousStatus?: string | null
  goalType?: 'Personal' | 'Team' | 'Department' | 'Company'
  className?: string
  // Add goal data to show responsible persons
  goal?: {
    owner?: { full_name: string }
    current_assignee?: { full_name: string }
  }
  // Multi-assignee support
  assignees?: Array<{
    assignee_name?: string
    task_status: 'pending' | 'completed'
  }>
}

export function PDCAProgress({ 
  currentStatus, 
  previousStatus, 
  goalType = 'Team', 
  className = "", 
  goal, 
  assignees = [] 
}: PDCAProgressProps) {
  // Define PDCA workflow steps
  const steps = [
    {
      id: "Plan",
      label: "Plan",
      description: "Define & strategize",
      icon: Target,
    },
    {
      id: "Do",
      label: "Do",
      description: "Execute & implement",
      icon: Clock,
    },
    {
      id: "Check",
      label: "Check",
      description: "Review & evaluate",
      icon: Eye,
    },
    {
      id: "Act",
      label: "Act",
      description: "Adjust & improve",
      icon: TrendingUp,
    },
    {
      id: "Completed",
      label: "Complete",
      description: "Goal achieved",
      icon: CheckCircle,
    },
  ]

  // Handle special statuses
  const getEffectiveStatus = (status: string): string => {
    switch (status) {
      case "On Hold":
        // Show previous status for on hold goals
        return previousStatus || "Plan"
      case "Cancelled":
        // Cancelled is a final state
        return status
      default:
        return status
    }
  }

  const effectiveStatus = getEffectiveStatus(currentStatus)
  const currentStepIndex = steps.findIndex(step => step.id === effectiveStatus)

  const getStepStatus = (stepIndex: number) => {
    if (currentStatus === "Cancelled") {
      return "cancelled"
    }
    if (currentStatus === "On Hold") {
      return "on-hold"
    }
    if (stepIndex < currentStepIndex) {
      return "completed"
    }
    if (stepIndex === currentStepIndex) {
      return "current"
    }
    return "upcoming"
  }

  const getStepColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500 border-green-500 text-white"
      case "current":
        return "bg-blue-500 border-blue-500 text-white"
      case "on-hold":
        return "bg-yellow-500 border-yellow-500 text-white"
      case "cancelled":
        return "bg-red-500 border-red-500 text-white"
      default:
        return "bg-gray-100 border-gray-300 text-gray-600"
    }
  }

  const getConnectorColor = (fromStatus: string, toStatus: string) => {
    if (fromStatus === "completed" && (toStatus === "completed" || toStatus === "current")) {
      return "bg-green-300"
    }
    if (fromStatus === "completed" && toStatus === "upcoming") {
      return "bg-green-300"
    }
    return "bg-gray-200"
  }

  // Get responsible person display
  const getResponsiblePerson = () => {
    if (assignees.length > 0) {
      const completedCount = assignees.filter(a => a.task_status === 'completed').length
      if (assignees.length === 1) {
        return assignees[0].assignee_name || "Unknown"
      }
      return `${assignees.length} assignees (${completedCount}/${assignees.length} completed)`
    }
    
    if (goal?.current_assignee) {
      return goal.current_assignee.full_name
    }
    
    if (goal?.owner) {
      return goal.owner.full_name
    }
    
    return "Unassigned"
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Status Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-lg text-gray-600 mb-1">
            Current phase: <span className="font-semibold text-gray-900">{currentStatus}</span>
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {goalType}
          </Badge>
          {currentStatus === "On Hold" && (
            <Badge variant="secondary" className="text-xs">
              <Pause className="h-3 w-3 mr-1" />
              On Hold
            </Badge>
          )}
        </div>
      </div>

      {/* Progress Steps */}
      <div className="relative">
        <div className="flex items-start">
          {steps.map((step, index) => {
            const stepStatus = getStepStatus(index)
            const Icon = step.icon
            
            return (
              <div key={step.id} className="flex flex-col items-center flex-1 relative">
                <div className="flex items-center w-full">
                  {/* Step Circle */}
                  <div
                    className={`
                      relative z-10 w-12 h-12 rounded-full border-2 flex items-center justify-center
                      transition-all duration-200 mx-auto shadow-sm
                      ${getStepColor(stepStatus)}
                    `}
                  >
                    {stepStatus === "completed" ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  
                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-1 ml-2 rounded-full ${getConnectorColor(
                        getStepStatus(index),
                        getStepStatus(index + 1)
                      )}`}
                    />
                  )}
                </div>
                
                {/* Step Label */}
                <div className="mt-3 text-center w-full">
                  <div className={`text-base font-semibold ${
                    stepStatus === "current" ? "text-blue-600" :
                    stepStatus === "completed" ? "text-green-600" :
                    stepStatus === "on-hold" ? "text-yellow-600" :
                    stepStatus === "cancelled" ? "text-red-600" :
                    "text-gray-500"
                  }`}>
                    {step.label}
                  </div>
                  <div className="text-sm text-gray-600 mt-1 leading-relaxed">
                    {step.description}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Additional Status Information */}
      {currentStatus !== "Completed" && currentStatus !== "Cancelled" && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-blue-700 font-medium">Responsible for current phase:</span>
              <div className="mt-1 text-base font-semibold text-blue-900">
                {getResponsiblePerson()}
              </div>
            </div>
            {assignees.length > 1 ? (
              <Users className="h-5 w-5 text-blue-600" />
            ) : (
              <User className="h-5 w-5 text-blue-600" />
            )}
          </div>
          
          {/* Multi-assignee progress */}
          {assignees.length > 1 && (
            <div className="mt-2 text-xs text-gray-600">
              <div className="flex flex-wrap gap-1">
                {assignees.map((assignee, index) => (
                  <Badge 
                    key={index}
                    variant={assignee.task_status === 'completed' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {assignee.assignee_name}
                    {assignee.task_status === 'completed' && (
                      <Check className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Special Status Messages */}
      {currentStatus === "On Hold" && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800">
            <Pause className="h-4 w-4" />
            <span className="text-sm font-medium">Goal is currently on hold</span>
          </div>
          <p className="text-xs text-yellow-700 mt-1">
            Progress is paused. Will resume from {previousStatus || 'Plan'} phase.
          </p>
        </div>
      )}

      {currentStatus === "Cancelled" && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Goal has been cancelled</span>
          </div>
        </div>
      )}

      {currentStatus === "Completed" && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Goal successfully completed!</span>
          </div>
        </div>
      )}
    </div>
  )
}