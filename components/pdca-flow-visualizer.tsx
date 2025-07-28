"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  ArrowRight, 
  ArrowDown,
  Users, 
  Target, 
  CheckCircle, 
  Clock,
  AlertCircle,
  Pause,
  RotateCcw,
  Play,
  Settings,
  MessageSquare
} from "lucide-react"

interface FlowStep {
  id: string
  title: string
  description: string
  icon: any
  status: 'current' | 'completed' | 'pending' | 'blocked'
  details: string[]
  databases: string[]
  notifications: string[]
}

interface PDCAFlowVisualizerProps {
  className?: string
}

export function PDCAFlowVisualizer({ className = "" }: PDCAFlowVisualizerProps) {
  const [selectedStep, setSelectedStep] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview')

  const pdcaSteps: FlowStep[] = [
    {
      id: 'plan',
      title: 'Plan Phase',
      description: 'Goal definition, team assignment, and support requests (tasks optional)',
      icon: Target,
      status: 'completed',
      details: [
        'User creates goal with subject, description, priority',
        'Assigns to primary department and specific teams',
        'Requests support from other departments/teams (optional)',
        'Sets target date and success criteria',
        'Optionally creates tasks for this phase',
        'Manual progression to Do phase via status change button'
      ],
      databases: ['goals', 'goal_assignees', 'goal_support', 'goal_tasks'],
      notifications: ['Goal created notifications', 'Support request notifications', 'Task assignment notifications']
    },
    {
      id: 'do',
      title: 'Do Phase', 
      description: 'Execution with multi-assignee collaboration (tasks optional)',
      icon: Play,
      status: 'current',
      details: [
        'Work on execution (with or without specific tasks)',
        'Assignees collaborate on goal achievement',
        'Support departments provide assistance if requested',
        'Progress tracked via comments and attachments',
        'Manual progression to Check phase when ready'
      ],
      databases: ['goal_tasks', 'goal_comments', 'goal_attachments', 'workflow_history'],
      notifications: ['Task completion notifications', 'Comment notifications', 'Status update notifications']
    },
    {
      id: 'check',
      title: 'Check Phase',
      description: 'Review, validation, and quality assessment (tasks optional)',
      icon: CheckCircle,
      status: 'pending',
      details: [
        'Review work completed in Do phase',
        'Validate against success criteria and target metrics',
        'Collect feedback from stakeholders',
        'Identify issues or gaps requiring attention',
        'Manual progression: back to Do if issues found, or forward to Act'
      ],
      databases: ['goal_comments', 'workflow_history', 'goal_tasks'],
      notifications: ['Review completion notifications', 'Comment notifications', 'Status change notifications']
    },
    {
      id: 'act',
      title: 'Act Phase',
      description: 'Finalization and continuous improvement (tasks optional)',
      icon: RotateCcw,
      status: 'pending',
      details: [
        'Implement improvements based on Check phase findings',
        'Finalize deliverables and documentation',
        'Capture lessons learned for future goals',
        'Manual progression: Complete goal or cycle back to Plan',
        'No task completion required - user decision drives progression'
      ],
      databases: ['goals', 'workflow_history', 'goal_tasks'],
      notifications: ['Goal completion notifications', 'Status change notifications', 'Final workflow notifications']
    }
  ]


  const statusTransitions = [
    { from: 'Plan', to: ['Do', 'On Hold'], color: 'text-blue-600' },
    { from: 'Do', to: ['Check', 'On Hold'], color: 'text-green-600' },
    { from: 'Check', to: ['Act', 'Do', 'On Hold'], color: 'text-yellow-600' },
    { from: 'Act', to: ['Completed', 'Plan', 'On Hold'], color: 'text-purple-600' },
    { from: 'On Hold', to: ['Plan', 'Do', 'Check', 'Act'], color: 'text-gray-600' }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'current': return <Clock className="w-4 h-4 text-blue-600" />
      case 'pending': return <AlertCircle className="w-4 h-4 text-gray-400" />
      case 'blocked': return <Pause className="w-4 h-4 text-red-600" />
      default: return <AlertCircle className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'border-green-200 bg-green-50'
      case 'current': return 'border-blue-200 bg-blue-50'
      case 'pending': return 'border-gray-200 bg-gray-50'
      case 'blocked': return 'border-red-200 bg-red-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">PDCA Workflow Visualizer</h2>
          <p className="text-gray-600">Interactive visualization of the PDCA goal workflow with task scenarios</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'overview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('overview')}
          >
            Overview
          </Button>
          <Button
            variant={viewMode === 'detailed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('detailed')}
          >
            Detailed
          </Button>
        </div>
      </div>

      {/* PDCA Main Flow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            PDCA Cycle Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {pdcaSteps.map((step, index) => {
              const Icon = step.icon
              const isSelected = selectedStep === step.id
              
              return (
                <div key={step.id} className="relative">
                  <Card 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      getStatusColor(step.status)
                    } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                    onClick={() => setSelectedStep(isSelected ? null : step.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-5 h-5 text-blue-600" />
                        {getStatusIcon(step.status)}
                      </div>
                      <h3 className="font-semibold text-sm mb-1">{step.title}</h3>
                      <p className="text-xs text-gray-600 mb-2">{step.description}</p>
                      
                      {viewMode === 'detailed' && (
                        <div className="space-y-2">
                          <div className="text-xs">
                            <div className="font-medium text-gray-700">Database Tables:</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {step.databases.map(db => (
                                <Badge key={db} variant="outline" className="text-xs">{db}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Arrow to next step */}
                  {index < pdcaSteps.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                      <ArrowRight className="w-4 h-4 text-gray-400 bg-white rounded-full p-0.5 border" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Detailed view for selected step */}
          {selectedStep && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              {(() => {
                const step = pdcaSteps.find(s => s.id === selectedStep)
                if (!step) return null
                
                return (
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-3">{step.title} - Detailed Flow</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <h5 className="font-medium text-blue-800 mb-2">Process Steps:</h5>
                        <ul className="space-y-1">
                          {step.details.map((detail, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                              <span className="text-gray-700">{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-blue-800 mb-2">Database Updates:</h5>
                        <div className="space-y-1">
                          {step.databases.map(db => (
                            <Badge key={db} variant="secondary" className="mr-1 mb-1">{db}</Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-blue-800 mb-2">Notifications Sent:</h5>
                        <ul className="space-y-1">
                          {step.notifications.map((notif, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <MessageSquare className="w-3 h-3 text-blue-600" />
                              <span className="text-gray-700">{notif}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </CardContent>
      </Card>


      {/* Task Scenarios Explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            Task Scenarios & Goal Progression
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border border-emerald-200 bg-emerald-50">
              <CardContent className="p-4">
                <h4 className="font-semibold text-emerald-900 mb-2">Goals Without Tasks</h4>
                <ul className="text-sm text-emerald-800 space-y-1">
                  <li>• Goals can progress through all PDCA phases without creating any tasks</li>
                  <li>• Manual progression via status change buttons</li>
                  <li>• No task completion validation required</li>
                  <li>• Progress tracked via comments and workflow history</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card className="border border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Goals With Tasks</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Forward progression requires task completion</li>
                  <li>• System validates incomplete tasks before allowing next phase</li>
                  <li>• Backward moves and "On Hold" bypass task checks</li>
                  <li>• Task completion tracked with notes and completion dates</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card className="border border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <h4 className="font-semibold text-amber-900 mb-2">Mixed Scenarios</h4>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• Some phases can have tasks, others can be task-free</li>
                  <li>• Example: Plan (3 tasks) → Do (no tasks) → Check (2 tasks) → Act (no tasks)</li>
                  <li>• Validation only applies to phases with incomplete tasks</li>
                  <li>• Flexible approach supports various goal types</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Status Transition Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-600" />
            PDCA Status Transition Rules & Validation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {statusTransitions.map((rule, index) => (
                <Card key={index} className="border border-gray-200">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={rule.color}>{rule.from}</Badge>
                      <ArrowRight className="w-3 h-3 text-gray-400" />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {rule.to.map(status => (
                        <Badge key={status} variant="secondary" className="text-xs">
                          {status}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
              <h4 className="font-semibold text-gray-900 mb-3">Validation Logic</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">Forward Progression (Task Validation Required):</h5>
                  <ul className="space-y-1 text-gray-700">
                    <li>• Plan → Do: Check Plan phase tasks</li>
                    <li>• Do → Check: Check Do phase tasks</li>
                    <li>• Check → Act: Check Check phase tasks</li>
                    <li>• Act → Completed: Check Act phase tasks</li>
                    <li>• If no tasks exist: <code className="bg-gray-200 px-1 rounded">incompleteTasks.length === 0</code> → ✅ Allow</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">No Validation Required:</h5>
                  <ul className="space-y-1 text-gray-700">
                    <li>• Any status → On Hold</li>
                    <li>• Check → Do (backward)</li>
                    <li>• Act → Plan (cycle back)</li>
                    <li>• On Hold → Any previous status</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-sm">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-gray-400" />
              <span className="text-sm">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <Pause className="w-4 h-4 text-red-600" />
              <span className="text-sm">Blocked/On Hold</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}