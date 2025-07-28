"use client"

import { useState, useEffect } from "react"
import { updateUserRole } from "@/actions/admin"
import { updateUserDepartmentTeam, getDepartmentTeamStructure } from "@/actions/department-management"
import { UserRecord } from "@/lib/goal-database"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, UserCheck, UserX, Shield, User } from "lucide-react"

interface UserManagementTableProps {
  users: UserRecord[]
  currentUserId: string
}

export function UserManagementTable({ users, currentUserId }: UserManagementTableProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; currentRole: string; newRole: string } | null>(null)
  const [departments, setDepartments] = useState<Record<string, string[]>>({})
  const [departmentAssignments, setDepartmentAssignments] = useState<Record<string, { department: string; team: string }>>({})

  // Load department structure
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const result = await getDepartmentTeamStructure()
        if (result.success && result.data) {
          setDepartments(result.data)
        }
      } catch (error) {
        console.error('Failed to load departments:', error)
      }
    }
    loadDepartments()
  }, [])

  const handleRoleChange = async (userId: string, userName: string, currentRole: string, newRole: string) => {
    if (currentRole === newRole) return

    setSelectedUser({
      id: userId,
      name: userName,
      currentRole,
      newRole
    })
  }

  const confirmRoleChange = async () => {
    if (!selectedUser) return

    setLoading(selectedUser.id)
    try {
      const result = await updateUserRole(selectedUser.id, selectedUser.newRole as "Employee" | "Head" | "Admin")
      
      if (result.error) {
        toast.error("Failed to update role", {
          description: result.error
        })
      } else {
        toast.success("Role updated successfully", {
          description: `${selectedUser.name} is now a ${selectedUser.newRole}`
        })
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(null)
      setSelectedUser(null)
    }
  }

  const cancelRoleChange = () => {
    setSelectedUser(null)
  }

  const handleDepartmentChange = async (userId: string, department: string) => {
    setLoading(userId)
    try {
      const result = await updateUserDepartmentTeam(userId, department)
      if (result.error) {
        toast.error("Failed to update department", {
          description: result.error
        })
      } else {
        toast.success("Department updated successfully")
        // Update local state or trigger a refresh
        window.location.reload()
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(null)
    }
  }

  const handleTeamChange = async (userId: string, department: string, team: string) => {
    setLoading(userId)
    try {
      const result = await updateUserDepartmentTeam(userId, department, team)
      if (result.error) {
        toast.error("Failed to update team", {
          description: result.error
        })
      } else {
        toast.success("Team updated successfully")
        // Update local state or trigger a refresh
        window.location.reload()
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(null)
    }
  }

  const getRoleBadge = (role: string) => {
    if (role === "Admin") {
      return (
        <Badge variant="destructive" className="gap-1">
          <Shield className="w-3 h-3" />
          Admin
        </Badge>
      )
    }
    if (role === "Head") {
      return (
        <Badge className="gap-1 bg-green-100 text-green-800 border-green-200">
          <UserCheck className="w-3 h-3" />
          Head
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <User className="w-3 h-3" />
        Employee
      </Badge>
    )
  }

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <Badge variant="outline" className="gap-1 text-green-700 border-green-200 bg-green-50">
          <UserCheck className="w-3 h-3" />
          Active
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="gap-1 text-red-700 border-red-200 bg-red-50">
        <UserX className="w-3 h-3" />
        Inactive
      </Badge>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Department Assignment</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.full_name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {user.department ? (
                    <Badge variant="outline">{user.department}</Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {user.team ? (
                    <Badge variant="outline">{user.team}</Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>{getRoleBadge(user.role)}</TableCell>
                <TableCell>{getStatusBadge(user.is_active)}</TableCell>
                <TableCell>
                  <div className="space-y-2">
                    {/* Department Assignment */}
                    <Select
                      value={user.department || "none"}
                      onValueChange={(dept) => handleDepartmentChange(user.id, dept === "none" ? "" : dept)}
                      disabled={loading === user.id || user.id === currentUserId}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Select Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Department</SelectItem>
                        {Object.keys(departments).map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Team Assignment */}
                    {user.department && departments[user.department] && (
                      <Select
                        value={user.team || "none"}
                        onValueChange={(team) => handleTeamChange(user.id, user.department!, team === "none" ? "" : team)}
                        disabled={loading === user.id || user.id === currentUserId}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Select Team" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Team</SelectItem>
                          {departments[user.department].map(team => (
                            <SelectItem key={team} value={team}>{team}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    
                    {user.id === currentUserId && (
                      <p className="text-xs text-muted-foreground">
                        Cannot change your own assignment
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Select
                    value={user.role}
                    onValueChange={(newRole) => handleRoleChange(user.id, user.full_name, user.role, newRole)}
                    disabled={loading === user.id || user.id === currentUserId}
                  >
                    <SelectTrigger className="w-32">
                      {loading === user.id ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Updating...</span>
                        </div>
                      ) : (
                        <SelectValue />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Employee">Employee</SelectItem>
                      <SelectItem value="Head">Head</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {user.id === currentUserId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Cannot change your own role
                    </p>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!selectedUser} onOpenChange={cancelRoleChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Role Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change <strong>{selectedUser?.name}</strong>&apos;s role from{" "}
              <strong>{selectedUser?.currentRole}</strong> to <strong>{selectedUser?.newRole}</strong>?
              {selectedUser?.newRole === "Admin" && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm">
                  <strong>Warning:</strong> Admin users have full system access including user management.
                </div>
              )}
              {selectedUser?.newRole === "Head" && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-blue-800 text-sm">
                  <strong>Info:</strong> Head users can create goals and manage their department.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}