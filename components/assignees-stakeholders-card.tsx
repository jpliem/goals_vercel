"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, User, Building2, CheckCircle, Clock } from "lucide-react"
import type { GoalWithDetails, GoalAssignee } from "@/lib/goal-database"

interface AssigneesStakeholdersCardProps {
  goal: GoalWithDetails
  assignees: GoalAssignee[]
}

export function AssigneesStakeholdersCard({ goal, assignees }: AssigneesStakeholdersCardProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Users className="h-5 w-5 text-orange-600" />
          Assignees & Stakeholders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {/* Department & Teams */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Department & Teams
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Department:</span>
              <Badge variant="outline" className="text-xs">
                {goal.department}
              </Badge>
            </div>
            {goal.teams && goal.teams.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-sm text-gray-600 mt-1">Teams:</span>
                <div className="flex flex-wrap gap-1">
                  {goal.teams.map((team, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {team}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Person in Charge */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <User className="h-4 w-4" />
            Person in Charge (PIC)
          </h4>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="font-medium text-sm text-gray-900">
              {goal.owner?.full_name || 'Unknown'}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Goal Owner & Primary Contact
            </div>
          </div>
        </div>

        {/* Assignees */}
        {assignees && assignees.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Current Assignees
              <Badge variant="secondary" className="text-xs">
                {assignees.length}
              </Badge>
            </h4>
            <div className="space-y-2">
              {assignees.map((assignee, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-sm text-gray-900">
                      {(assignee as any)?.users?.full_name || (assignee as any)?.full_name || 'Unknown'}
                    </div>
                    <div className="text-xs text-gray-600">
                      {assignee.task_status === 'completed' ? 'Task completed' : 'Working on task'}
                    </div>
                  </div>
                  <div className="flex items-center">
                    {assignee.task_status === 'completed' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Support Requirements */}
        {goal.support && goal.support.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Support Requirements
            </h4>
            <div className="space-y-2">
              {goal.support.map((support: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {support.support_name}
                    </div>
                    <div className="text-xs text-gray-600">
                      {support.support_type}
                    </div>
                  </div>
                  <Badge 
                    variant={support.status === 'Accepted' ? 'default' : 'outline'}
                    className="text-xs"
                  >
                    {support.status || 'Accepted'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}