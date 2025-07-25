"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CreateGoalForm } from "@/components/create-goal-form"
import { UserRecord } from "@/lib/goal-database"

interface CreateGoalModalProps {
  isOpen: boolean
  onClose: () => void
  users: UserRecord[]
  userProfile: UserRecord
  departmentTeamMappings: Record<string, string[]>
  onGoalCreated?: () => void
}

export function CreateGoalModal({ 
  isOpen, 
  onClose, 
  users, 
  userProfile, 
  departmentTeamMappings,
  onGoalCreated 
}: CreateGoalModalProps) {
  
  const handleGoalCreated = () => {
    onGoalCreated?.()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Goal</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          <CreateGoalForm 
            users={users as any}
            userProfile={userProfile as any}
            departmentTeamMappings={departmentTeamMappings}
            onSuccess={handleGoalCreated}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}