"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { assignGoalAssignees } from "@/actions/goals"
import { User } from "@/lib/goal-database"

interface AssignGoalAssigneeModalProps {
  isOpen: boolean
  onClose: () => void
  goalId: string
  users: User[]
  currentAssignees: string[]
  onUpdate: () => void
}

export function AssignGoalAssigneeModal({ 
  isOpen, 
  onClose, 
  goalId, 
  users, 
  currentAssignees, 
  onUpdate 
}: AssignGoalAssigneeModalProps) {
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>(currentAssignees)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setSelectedAssignees(currentAssignees)
      setError(null)
    }
  }, [isOpen, currentAssignees])

  const handleAssigneeToggle = (userId: string) => {
    setSelectedAssignees(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const result = await assignGoalAssignees(goalId, selectedAssignees)
      if (result.error) {
        setError(result.error)
      } else {
        onUpdate()
        onClose()
      }
    } catch (error) {
      console.error("Error assigning goal assignees:", error)
      setError("Failed to assign goal assignees")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Goal Assignees</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div className="max-h-60 overflow-y-auto space-y-2">
            {users.length === 0 ? (
              <div className="text-gray-500 text-center py-4">
                No users available for assignment
              </div>
            ) : (
              users.map((user) => (
              <div key={user.id} className="flex items-center space-x-2">
                <Checkbox
                  id={user.id}
                  checked={selectedAssignees.includes(user.id)}
                  onCheckedChange={() => handleAssigneeToggle(user.id)}
                />
                <label
                  htmlFor={user.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {user.full_name} ({user.department})
                </label>
              </div>
            )))}
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Assigning..." : "Assign"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}