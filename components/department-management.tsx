"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { 
  Building2, 
  Users, 
  Plus, 
  Trash2, 
  Edit, 
  ChevronDown, 
  ChevronRight,
  Target,
  BarChart3,
  Loader2
} from "lucide-react"
import { toast } from "sonner"
import {
  getDepartmentTeamStructure,
  createDepartment,
  createTeam,
  deleteDepartment,
  deleteTeam,
  renameDepartment,
  renameTeam,
  updateDepartmentDescription,
  getDepartmentUsageStats
} from "@/actions/department-management"

interface DepartmentStats {
  totalDepartments: number
  totalTeams: number
  usersByDepartment: Record<string, number>
  goalsByDepartment: Record<string, number>
  teamsByDepartment: Record<string, number>
}

export function DepartmentManagement() {
  const [departments, setDepartments] = useState<Record<string, string[]>>({})
  const [stats, setStats] = useState<DepartmentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set())
  
  // Modal states
  const [createDeptModal, setCreateDeptModal] = useState(false)
  const [createTeamModal, setCreateTeamModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean
    type: 'department' | 'team'
    department: string
    team?: string
  }>({ open: false, type: 'department', department: '' })
  
  const [editDeptModal, setEditDeptModal] = useState<{
    open: boolean
    department: string
    newName: string
    description: string
  }>({ open: false, department: '', newName: '', description: '' })
  
  const [editTeamModal, setEditTeamModal] = useState<{
    open: boolean
    department: string
    team: string
    newName: string
  }>({ open: false, department: '', team: '', newName: '' })
  
  // Form states
  const [newDeptName, setNewDeptName] = useState("")
  const [newTeamName, setNewTeamName] = useState("")
  const [selectedDept, setSelectedDept] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  // Load data
  const loadData = async () => {
    setLoading(true)
    try {
      const [deptResult, statsResult] = await Promise.all([
        getDepartmentTeamStructure(),
        getDepartmentUsageStats()
      ])

      if (deptResult.error) {
        toast.error("Failed to load departments", { description: deptResult.error })
      } else if (deptResult.data) {
        setDepartments(deptResult.data)
        // Expand all departments by default
        setExpandedDepts(new Set(Object.keys(deptResult.data)))
      }

      if (statsResult.error) {
        toast.error("Failed to load statistics", { description: statsResult.error })
      } else if (statsResult.data) {
        setStats(statsResult.data)
      }
    } catch (error) {
      toast.error("Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const toggleDepartment = (dept: string) => {
    const newExpanded = new Set(expandedDepts)
    if (newExpanded.has(dept)) {
      newExpanded.delete(dept)
    } else {
      newExpanded.add(dept)
    }
    setExpandedDepts(newExpanded)
  }

  const handleCreateDepartment = async () => {
    if (!newDeptName.trim()) {
      toast.error("Department name is required")
      return
    }

    setActionLoading(true)
    try {
      const result = await createDepartment(newDeptName.trim())
      if (result.error) {
        toast.error("Failed to create department", { description: result.error })
      } else {
        toast.success(result.message)
        setNewDeptName("")
        setCreateDeptModal(false)
        loadData()
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreateTeam = async () => {
    if (!selectedDept || !newTeamName.trim()) {
      toast.error("Department and team name are required")
      return
    }

    setActionLoading(true)
    try {
      const result = await createTeam(selectedDept, newTeamName.trim())
      if (result.error) {
        toast.error("Failed to create team", { description: result.error })
      } else {
        toast.success(result.message)
        setNewTeamName("")
        setSelectedDept("")
        setCreateTeamModal(false)
        loadData()
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    setActionLoading(true)
    try {
      const result = deleteModal.type === 'department' 
        ? await deleteDepartment(deleteModal.department)
        : await deleteTeam(deleteModal.department, deleteModal.team!)

      if (result.error) {
        toast.error(`Failed to delete ${deleteModal.type}`, { description: result.error })
      } else {
        toast.success(result.message)
        setDeleteModal({ open: false, type: 'department', department: '' })
        loadData()
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setActionLoading(false)
    }
  }

  const handleRenameDepartment = async () => {
    if (!editDeptModal.newName.trim()) {
      toast.error("Department name is required")
      return
    }

    setActionLoading(true)
    try {
      const result = await renameDepartment(editDeptModal.department, editDeptModal.newName.trim())
      if (result.error) {
        toast.error("Failed to rename department", { description: result.error })
      } else {
        toast.success(result.message)
        setEditDeptModal({ open: false, department: '', newName: '', description: '' })
        loadData()
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateDepartmentDescription = async () => {
    setActionLoading(true)
    try {
      const result = await updateDepartmentDescription(editDeptModal.department, editDeptModal.description)
      if (result.error) {
        toast.error("Failed to update description", { description: result.error })
      } else {
        toast.success(result.message)
        setEditDeptModal({ open: false, department: '', newName: '', description: '' })
        loadData()
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setActionLoading(false)
    }
  }

  const handleRenameTeam = async () => {
    if (!editTeamModal.newName.trim()) {
      toast.error("Team name is required")
      return
    }

    setActionLoading(true)
    try {
      const result = await renameTeam(editTeamModal.department, editTeamModal.team, editTeamModal.newName.trim())
      if (result.error) {
        toast.error("Failed to rename team", { description: result.error })
      } else {
        toast.success(result.message)
        setEditTeamModal({ open: false, department: '', team: '', newName: '' })
        loadData()
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading department structure...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Departments</p>
                  <p className="text-2xl font-bold">{stats.totalDepartments}</p>
                </div>
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Teams</p>
                  <p className="text-2xl font-bold">{stats.totalTeams}</p>
                </div>
                <Users className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">
                    {Object.values(stats.usersByDepartment).reduce((sum, count) => sum + count, 0)}
                  </p>
                </div>
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Goals</p>
                  <p className="text-2xl font-bold">
                    {Object.values(stats.goalsByDepartment).reduce((sum, count) => sum + count, 0)}
                  </p>
                </div>
                <Target className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Department Structure */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Department & Team Structure
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={() => setCreateDeptModal(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Department
              </Button>
              <Button onClick={() => setCreateTeamModal(true)} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Team
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(departments).map(([dept, teams]) => (
              <Card key={dept} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Department Header */}
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex items-center gap-2 cursor-pointer flex-1"
                        onClick={() => toggleDepartment(dept)}
                      >
                        {expandedDepts.has(dept) ? 
                          <ChevronDown className="w-4 h-4" /> : 
                          <ChevronRight className="w-4 h-4" />
                        }
                        <Building2 className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-lg">{dept}</span>
                        <Badge variant="secondary" className="ml-2">
                          {teams.length} teams
                        </Badge>
                        {stats?.usersByDepartment[dept] && (
                          <Badge variant="outline" className="ml-1">
                            {stats.usersByDepartment[dept]} users
                          </Badge>
                        )}
                        {stats?.goalsByDepartment[dept] && (
                          <Badge variant="outline" className="ml-1">
                            {stats.goalsByDepartment[dept]} goals
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditDeptModal({
                            open: true,
                            department: dept,
                            newName: dept,
                            description: ''
                          })}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteModal({
                            open: true,
                            type: 'department',
                            department: dept
                          })}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Teams List */}
                    {expandedDepts.has(dept) && (
                      <div className="ml-6 space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {teams.map(team => (
                            <div 
                              key={team} 
                              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border"
                            >
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-gray-600" />
                                <span className="text-sm font-medium">{team}</span>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditTeamModal({
                                    open: true,
                                    department: dept,
                                    team,
                                    newName: team
                                  })}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-6 w-6 p-0"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteModal({
                                    open: true,
                                    type: 'team',
                                    department: dept,
                                    team
                                  })}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Department Modal */}
      <Dialog open={createDeptModal} onOpenChange={setCreateDeptModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Department</DialogTitle>
            <DialogDescription>
              Add a new department to the organization structure.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="dept-name">Department Name</Label>
              <Input
                id="dept-name"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="Enter department name..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDeptModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDepartment} disabled={actionLoading}>
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Department
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Team Modal */}
      <Dialog open={createTeamModal} onOpenChange={setCreateTeamModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
            <DialogDescription>
              Add a new team to an existing department.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="team-dept">Department</Label>
              <select
                id="team-dept"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full mt-1 p-2 border rounded-md"
              >
                <option value="">Select Department</option>
                {Object.keys(departments).map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Enter team name..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTeamModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTeam} disabled={actionLoading}>
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Department Modal */}
      <Dialog open={editDeptModal.open} onOpenChange={(open) => 
        setEditDeptModal(prev => ({ ...prev, open }))
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>
              Update the department name and description. This will update all related records.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-dept-name">Department Name</Label>
              <Input
                id="edit-dept-name"
                value={editDeptModal.newName}
                onChange={(e) => setEditDeptModal(prev => ({ ...prev, newName: e.target.value }))}
                placeholder="Enter department name"
              />
            </div>
            <div>
              <Label htmlFor="edit-dept-description">Description (Optional)</Label>
              <Input
                id="edit-dept-description"
                value={editDeptModal.description}
                onChange={(e) => setEditDeptModal(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter department description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditDeptModal({ open: false, department: '', newName: '', description: '' })}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRenameDepartment}
              disabled={actionLoading || !editDeptModal.newName.trim()}
            >
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update Department
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Team Modal */}
      <Dialog open={editTeamModal.open} onOpenChange={(open) => 
        setEditTeamModal(prev => ({ ...prev, open }))
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>
              Update the team name in "{editTeamModal.department}" department. This will update all related records.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-team-name">Team Name</Label>
              <Input
                id="edit-team-name"
                value={editTeamModal.newName}
                onChange={(e) => setEditTeamModal(prev => ({ ...prev, newName: e.target.value }))}
                placeholder="Enter team name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditTeamModal({ open: false, department: '', team: '', newName: '' })}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRenameTeam}
              disabled={actionLoading || !editTeamModal.newName.trim()}
            >
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={deleteModal.open} onOpenChange={(open) => 
        setDeleteModal(prev => ({ ...prev, open }))
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteModal.type === 'department' ? 'Department' : 'Team'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteModal.type === 'department' ? 
                `department "${deleteModal.department}"` : 
                `team "${deleteModal.team}" from "${deleteModal.department}"`
              }?
              <br /><br />
              <strong>This action cannot be undone.</strong> The {deleteModal.type} will only be deleted if no users or goals are assigned to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete {deleteModal.type === 'department' ? 'Department' : 'Team'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}