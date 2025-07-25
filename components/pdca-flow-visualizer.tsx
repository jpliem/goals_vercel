"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  ArrowRight, 
  ArrowDown,
  Users, 
  Building2, 
  Target, 
  CheckCircle, 
  Clock,
  AlertCircle,
  Pause,
  RotateCcw,
  Play,
  Settings,
  MessageSquare,
  HandHeart
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
      description: 'Goal definition, team assignment, and support requests',
      icon: Target,
      status: 'completed',
      details: [
        'User creates goal with subject, description, priority',
        'Assigns to primary department and specific teams',
        'Requests support from other departments/teams',
        'Sets target date and success criteria',
        'System validates permissions and data'
      ],
      databases: ['goals', 'goal_assignees', 'goal_support'],
      notifications: ['Goal created', 'Support requested', 'Team assignments']
    },
    {
      id: 'do',
      title: 'Do Phase', 
      description: 'Execution with multi-assignee collaboration',
      icon: Play,
      status: 'current',
      details: [
        'Assignees work on their individual tasks',
        'Support departments provide assistance',
        'Progress tracked via comments and attachments',
        'Regular status updates and communication',
        'Cross-department coordination happens'
      ],
      databases: ['goal_assignees', 'goal_comments', 'goal_attachments'],
      notifications: ['Task updates', 'Comments added', 'Progress notifications']
    },
    {
      id: 'check',
      title: 'Check Phase',
      description: 'Review, validation, and quality assessment',
      icon: CheckCircle,
      status: 'pending',
      details: [
        'Review work completed in Do phase',
        'Validate against success criteria',
        'Collect feedback from all stakeholders',
        'Identify issues or gaps requiring attention',
        'Can loop back to Do if problems found'
      ],
      databases: ['goal_comments', 'workflow_history'],
      notifications: ['Review requests', 'Feedback collection', 'Issue alerts']
    },
    {
      id: 'act',
      title: 'Act Phase',
      description: 'Finalization and continuous improvement',
      icon: RotateCcw,
      status: 'pending',
      details: [
        'Implement improvements based on Check phase',
        'Finalize deliverables and documentation',
        'Can cycle back to Plan for continuous improvement',
        'Or mark as Completed if fully satisfied',
        'Capture lessons learned for future goals'
      ],
      databases: ['goals', 'workflow_history'],
      notifications: ['Completion alerts', 'Improvement suggestions', 'Final approvals']
    }
  ]

  const supportSteps: FlowStep[] = [
    {
      id: 'support-request',
      title: 'Support Request',
      description: 'Request help from other departments',
      icon: HandHeart,
      status: 'completed',
      details: [
        'Goal creator identifies needed support',
        'Selects departments and specific teams',
        'System creates support records with "Requested" status',
        'Notifications sent to target departments',
        'Support requirements tracked in database'
      ],
      databases: ['goal_support'],
      notifications: ['Support requested to departments']
    },
    {
      id: 'support-approval',
      title: 'Support Approval',
      description: 'Department leads approve/decline support',
      icon: Users,
      status: 'current',
      details: [
        'Department leads receive support notifications',
        'Review goal details and support requirements',
        'Approve, decline, or request more information',
        'If approved, assign team members to assist',
        'Status updated to "Approved" in system'
      ],
      databases: ['goal_support', 'goal_assignees'],
      notifications: ['Support approved/declined', 'New assignees added']
    },
    {
      id: 'support-execution',
      title: 'Support Execution',
      description: 'Cross-department collaboration',
      icon: Building2,
      status: 'pending',
      details: [
        'Supporting team members get goal access',
        'Collaborate with primary team on execution',
        'Contribute expertise and resources',
        'Track individual task completion',
        'Coordinate through comments and updates'
      ],
      databases: ['goal_assignees', 'goal_comments'],
      notifications: ['Task assignments', 'Collaboration updates']
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
          <p className="text-gray-600">Interactive visualization of the complete goal workflow with department support</p>
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

      {/* Department Support Flow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HandHeart className="w-5 h-5 text-green-600" />
            Department Support Workflow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {supportSteps.map((step, index) => {
              const Icon = step.icon
              const isSelected = selectedStep === step.id
              
              return (
                <div key={step.id} className="relative">
                  <Card 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      getStatusColor(step.status)
                    } ${isSelected ? 'ring-2 ring-green-500' : ''}`}
                    onClick={() => setSelectedStep(isSelected ? null : step.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-5 h-5 text-green-600" />
                        {getStatusIcon(step.status)}
                      </div>
                      <h3 className="font-semibold text-sm mb-1">{step.title}</h3>
                      <p className="text-xs text-gray-600">{step.description}</p>
                    </CardContent>
                  </Card>
                  
                  {index < supportSteps.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                      <ArrowDown className="w-4 h-4 text-gray-400 bg-white rounded-full p-0.5 border md:rotate-90" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Status Transition Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-600" />
            PDCA Status Transition Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
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