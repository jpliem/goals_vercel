"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "./ui/dropdown-menu"
import { ChevronDown, Bug, User } from "lucide-react"
import { UserSession } from "@/lib/auth"

interface DebugUser {
  id: string
  email: string
  full_name: string
  role: string
  department: string
  team?: string
}

// Test users from seed data for debug switching
const DEBUG_USERS: DebugUser[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'admin@company.com',
    full_name: 'System Administrator',
    role: 'Admin',
    department: 'IT',
    team: 'Infrastructure'
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'john.smith@company.com',
    full_name: 'John Smith',
    role: 'Head',
    department: 'IT',
    team: 'Development'
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'sarah.johnson@company.com',
    full_name: 'Sarah Johnson',
    role: 'Head',
    department: 'HR',
    team: 'Recruitment'
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    email: 'mike.chen@company.com',
    full_name: 'Mike Chen',
    role: 'Employee',
    department: 'IT',
    team: 'Development'
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    email: 'lisa.davis@company.com',
    full_name: 'Lisa Davis',
    role: 'Employee',
    department: 'Sales',
    team: 'Inside Sales'
  }
]

interface DebugUserSwitcherProps {
  currentUser: UserSession
  onUserSwitch: (user: DebugUser) => Promise<void>
}

export function DebugUserSwitcher({ currentUser, onUserSwitch }: DebugUserSwitcherProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleUserSwitch = async (user: DebugUser) => {
    if (user.id === currentUser.id) {
      return // Already the current user
    }

    setIsLoading(true)
    try {
      await onUserSwitch(user)
    } catch (error) {
      console.error('Failed to switch user:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Only show in development environment
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                       process.env.NODE_ENV !== 'production' ||
                       (typeof window !== 'undefined' && (
                         window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname.startsWith('192.168.') ||
                         window.location.hostname.endsWith('.local')
                       ))

  if (!isDevelopment) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center space-x-1 text-orange-600 border-orange-300 hover:bg-orange-50 hover:border-orange-400"
          disabled={isLoading}
        >
          <Bug className="h-4 w-4" />
          <span className="hidden sm:inline">Debug</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-orange-600 font-semibold">
          🐛 Debug User Switcher
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {DEBUG_USERS.map((user) => (
          <DropdownMenuItem
            key={user.id}
            onClick={() => handleUserSwitch(user)}
            className={`cursor-pointer flex items-start space-x-2 py-3 ${
              user.id === currentUser.id 
                ? 'bg-orange-50 text-orange-700' 
                : 'hover:bg-gray-50'
            }`}
            disabled={isLoading}
          >
            <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-sm truncate">
                  {user.full_name}
                </span>
                {user.id === currentUser.id && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                    Current
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 space-y-0.5">
                <div>{user.email}</div>
                <div className="flex items-center space-x-2">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                    user.role === 'Admin' 
                      ? 'bg-purple-100 text-purple-700' 
                      : user.role === 'Head'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {user.role}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span>{user.department}</span>
                  {user.team && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span>{user.team}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-2 py-1 text-xs text-gray-500">
          ⚠️ Development only - not visible in production
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}