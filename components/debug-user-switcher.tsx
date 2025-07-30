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

// Test users from debug seed data for debug switching - aligned with debug-seed-data.sql
const DEBUG_USERS: DebugUser[] = [
  // System Admin
  {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'primary.admin@company.com',
    full_name: 'Primary Admin',
    role: 'Admin',
    department: 'IT',
    team: 'Administration'
  },
  
  // Additional Admin Users
  {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'admin2@company.com',
    full_name: 'Sarah Admin',
    role: 'Admin',
    department: 'IT',
    team: 'Infrastructure'
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'superadmin@company.com',
    full_name: 'Michael SuperAdmin',
    role: 'Admin',
    department: 'IT',
    team: 'GSPE'
  },
  
  // Department Heads (for testing support requests)
  {
    id: '44444444-4444-4444-4444-444444444444',
    email: 'head.hr@company.com',
    full_name: 'Lisa Thompson',
    role: 'Head',
    department: 'HR',
    team: 'Recruitment'
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    email: 'head.finance@company.com',
    full_name: 'Robert Chen',
    role: 'Head',
    department: 'Finance',
    team: 'Finance'
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    email: 'head.operations@company.com',
    full_name: 'Maria Rodriguez',
    role: 'Head',
    department: 'Operation',
    team: 'Project'
  },
  {
    id: '77777777-7777-7777-7777-777777777777',
    email: 'head.engineering@company.com',
    full_name: 'David Kim',
    role: 'Head',
    department: 'Engineer',
    team: 'Mechanical Engineering'
  },
  {
    id: '88888888-8888-8888-8888-888888888888',
    email: 'head.sales@company.com',
    full_name: 'Jennifer Wilson',
    role: 'Head',
    department: 'Sales',
    team: 'ABB'
  },
  {
    id: '99999999-9999-9999-9999-999999999999',
    email: 'head.marketing@company.com',
    full_name: 'Alex Johnson',
    role: 'Head',
    department: 'Marketing',
    team: 'Marketing'
  },

  // Employee Users (sample from different departments)
  {
    id: 'a1b2c3d4-e5f6-4789-a012-111111111111',
    email: 'emp.hr1@company.com',
    full_name: 'Emily Davis',
    role: 'Employee',
    department: 'HR',
    team: 'Recruitment'
  },
  {
    id: 'c3d4e5f6-a7b8-4901-c234-333333333333',
    email: 'emp.it1@company.com',
    full_name: 'Anna Lee',
    role: 'Employee',
    department: 'IT',
    team: 'IoT'
  },
  {
    id: 'e5f6a7b8-c9d0-4123-e456-555555555555',
    email: 'emp.finance1@company.com',
    full_name: 'Priya Patel',
    role: 'Employee',
    department: 'Finance',
    team: 'Finance'
  },
  {
    id: 'b8c9d0e1-f2a3-4456-b789-888888888888',
    email: 'emp.ops2@company.com',
    full_name: 'Daniel Garcia',
    role: 'Employee',
    department: 'Operation',
    team: 'PPC'
  },
  {
    id: 'a3b4c5d6-e7f8-4901-a234-444444444444',
    email: 'emp.sales1@company.com',
    full_name: 'Amanda White',
    role: 'Employee',
    department: 'Sales',
    team: 'ABB'
  },
  {
    id: 'd6e7f8a9-b0c1-4234-d567-777777777777',
    email: 'emp.marketing1@company.com',
    full_name: 'Jordan Smith',
    role: 'Employee',
    department: 'Marketing',
    team: 'Marketing'
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
      <DropdownMenuContent align="end" className="w-64 max-h-[400px] overflow-y-auto">
        <DropdownMenuLabel className="text-orange-600 font-semibold sticky top-0 bg-white z-10 pb-2">
          🐛 Debug User Switcher
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="overflow-y-auto">
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
        </div>
        <DropdownMenuSeparator className="sticky bottom-8 bg-white" />
        <div className="px-2 py-1 text-xs text-gray-500 sticky bottom-0 bg-white">
          ⚠️ Development only - not visible in production
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}