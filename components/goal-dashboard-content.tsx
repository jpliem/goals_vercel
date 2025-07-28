"use client"

import { DashboardHeader } from "@/components/dashboard-header"
import { PDCABoard } from "@/components/pdca-board"
import { UserRecord, GoalWithDetails } from "@/lib/goal-database";

interface GoalDashboardContentProps {
  userProfile: UserRecord;
  goals: GoalWithDetails[];
  userDepartmentPermissions: string[];
  departmentTeamMappings?: Record<string, string[]>;
  users?: UserRecord[];
}

export function GoalDashboardContent({ userProfile, goals, userDepartmentPermissions, departmentTeamMappings = {}, users = [] }: GoalDashboardContentProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader 
        user={{ 
          id: userProfile.id, 
          email: userProfile.email, 
          full_name: userProfile.full_name, 
          role: userProfile.role as "Admin" | "Head" | "Employee", 
          department: userProfile.department || undefined 
        }} 
        currentTab="overview"
        departmentTeamMappings={departmentTeamMappings}
        users={users as any}
      />

      <main className="max-w-7xl mx-auto py-4 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">PDCA Workflow</h2>
              <PDCABoard userProfile={userProfile as any} goals={goals} userDepartmentPermissions={userDepartmentPermissions} users={users as any} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}