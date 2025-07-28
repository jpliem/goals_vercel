"use client"

import type { UserSession } from "@/lib/auth"
import Link from "next/link"
import { LogoutButton } from "./logout-button"
import { CreateRequestButton } from "./create-request-button"
import { NotificationBell } from "./notification-bell"
import { Button } from "./ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "./ui/dropdown-menu"
import { ChevronDown, User, Key, UserPlus } from "lucide-react"
import { ChangePasswordModal } from "./modals/change-password-modal"
import { useState } from "react"
import { RequestWithDetails, UserRecord } from "@/lib/database"
import { DebugUserSwitcher } from "./debug-user-switcher"
import { debugSwitchUser } from "@/actions/auth"

interface DashboardHeaderProps {
  user: UserSession
  currentTab?: string
  users?: UserRecord[]
  departmentTeamMappings?: Record<string, string[]>
  onGoalCreated?: () => void
}

export function DashboardHeader({ user, currentTab = 'overview', users, departmentTeamMappings = {}, onGoalCreated }: DashboardHeaderProps) {
  const [showChangePassword, setShowChangePassword] = useState(false)

  const handleDebugUserSwitch = async (debugUser: any) => {
    const result = await debugSwitchUser(debugUser.id)
    if (result.success) {
      // Refresh the page to reflect the new user session
      window.location.reload()
    } else {
      console.error('Failed to switch user:', result.error)
      alert('Failed to switch user: ' + result.error)
    }
  }

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-semibold text-gray-900">Goal Management System</h1>
            <nav className="flex space-x-1">
              <Link 
                href="/dashboard?tab=overview" 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentTab === 'overview' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Overview
              </Link>
              <Link 
                href="/tasks" 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentTab === 'tasks' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                My Tasks
              </Link>
              {user.role === "Admin" && (
                <Link 
                  href="/admin" 
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentTab === 'admin-settings' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  User Management
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center space-x-3">
            {(user.role === "Head" || user.role === "Admin") && (
              <CreateRequestButton 
                users={users as any}
                userProfile={user as any}
                departmentTeamMappings={departmentTeamMappings}
                onGoalCreated={onGoalCreated}
              />
            )}
            <NotificationBell 
              user={user as any} 
            />
            <DebugUserSwitcher 
              currentUser={user}
              onUserSwitch={handleDebugUserSwitch}
            />
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center space-x-1 text-sm text-gray-700 hover:text-gray-900 focus:outline-none">
                <User className="h-4 w-4" />
                <span>
                  Welcome, <strong>{user.full_name}</strong> ({user.role})
                </span>
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setShowChangePassword(true)}>
                  <Key className="h-4 w-4 mr-2" />
                  Change Password
                </DropdownMenuItem>
                {user.role === "Admin" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/register">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Register New User
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <LogoutButton />
          </div>
        </div>
      </div>
      <ChangePasswordModal 
        isOpen={showChangePassword} 
        onClose={() => setShowChangePassword(false)} 
      />
    </header>
  )
}
