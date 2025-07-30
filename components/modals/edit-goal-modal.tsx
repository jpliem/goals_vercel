"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Markdown } from "@/components/ui/markdown"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit, Eye } from "lucide-react"
import { updateGoal } from "@/actions/goals"
import { Goal } from "@/lib/goal-database"

interface EditGoalModalProps {
  isOpen: boolean
  onClose: () => void
  goal: Goal
  onUpdate: () => void
}

export function EditGoalModal({ isOpen, onClose, goal, onUpdate }: EditGoalModalProps) {
  const [formData, setFormData] = useState({
    subject: goal.subject,
    description: goal.description,
    priority: goal.priority,
    target_date: goal.target_date || "",
    target_metrics: goal.target_metrics || "",
    success_criteria: goal.success_criteria || "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await updateGoal(goal.id, {
        ...formData,
        target_date: formData.target_date || null
      })
      onUpdate()
      onClose()
    } catch (error) {
      console.error("Error updating goal:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Goal</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Tabs defaultValue="edit" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="edit" className="flex items-center gap-1">
                  <Edit className="h-3 w-3" />
                  Write
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  Preview
                </TabsTrigger>
              </TabsList>
              <TabsContent value="edit" className="mt-2">
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what you want to achieve... (Markdown supported)"
                  rows={4}
                  required
                />
              </TabsContent>
              <TabsContent value="preview" className="mt-2">
                <div className="min-h-[100px] p-3 border rounded-md bg-gray-50">
                  {formData.description ? (
                    <Markdown content={formData.description} variant="compact" />
                  ) : (
                    <p className="text-gray-500 text-sm italic">Nothing to preview yet...</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="target_date">Target Date</Label>
            <Input
              id="target_date"
              type="date"
              value={formData.target_date}
              onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="target_metrics">Target Metrics</Label>
            <Textarea
              id="target_metrics"
              value={formData.target_metrics}
              onChange={(e) => setFormData({ ...formData, target_metrics: e.target.value })}
              rows={2}
              placeholder="Measurable success criteria..."
            />
          </div>

          <div>
            <Label htmlFor="success_criteria">Success Criteria</Label>
            <Textarea
              id="success_criteria"
              value={formData.success_criteria}
              onChange={(e) => setFormData({ ...formData, success_criteria: e.target.value })}
              rows={2}
              placeholder="What defines success for this goal..."
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Goal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}