"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { CreateGoalModal } from "@/components/create-goal-modal"
import { UserRecord } from "@/lib/goal-database"

interface CreateGoalButtonProps {
  users?: UserRecord[]
  userProfile?: UserRecord
  departmentTeamMappings?: Record<string, string[]>
  onGoalCreated?: () => void
}

export function CreateGoalButton({ users = [], userProfile, departmentTeamMappings = {}, onGoalCreated }: CreateGoalButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Don't render if we don't have required data
  if (!userProfile) {
    return (
      <Button 
        className="bg-blue-600 hover:bg-blue-700"
        disabled
      >
        <Plus className="w-4 h-4 mr-2" />
        Create Goal
      </Button>
    )
  }

  return (
    <>
      <Button 
        onClick={() => setIsModalOpen(true)}
        className="bg-blue-600 hover:bg-blue-700"
      >
        <Plus className="w-4 h-4 mr-2" />
        Create Goal
      </Button>
      
      <CreateGoalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        users={users}
        userProfile={userProfile}
        departmentTeamMappings={departmentTeamMappings}
        onGoalCreated={onGoalCreated}
      />
    </>
  )
}

// Legacy export for backward compatibility
export function CreateRequestButton(props: CreateGoalButtonProps) {
  return <CreateGoalButton {...props} />
}