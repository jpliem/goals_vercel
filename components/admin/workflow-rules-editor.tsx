"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Bell,
  Shield
} from "lucide-react"
import {
  getWorkflowRules,
  createWorkflowRule,
  updateWorkflowRule,
  deleteWorkflowRule,
  type WorkflowRule
} from "@/actions/workflow-config"

interface WorkflowRulesEditorProps {
  className?: string
}

const RULE_TYPES = [
  { value: 'phase_completion_threshold', label: 'Phase Completion Threshold', icon: CheckCircle, description: 'Set percentage of tasks that must be completed before phase progression' },
  { value: 'mandatory_fields', label: 'Mandatory Fields', icon: Shield, description: 'Define required fields for status transitions' },
  { value: 'validation_rule', label: 'Validation Rule', icon: AlertTriangle, description: 'Custom validation logic for workflow transitions' },
  { value: 'notification_rule', label: 'Notification Rule', icon: Bell, description: 'Configure notification settings for workflow events' },
  { value: 'duration_limit', label: 'Duration Limit', icon: Clock, description: 'Set time limits and warnings for PDCA phases' }
] as const

const PHASES = [
  { value: 'Plan', label: 'Plan Phase' },
  { value: 'Do', label: 'Do Phase' },
  { value: 'Check', label: 'Check Phase' },
  { value: 'Act', label: 'Act Phase' },
  { value: 'All', label: 'All Phases' }
] as const

export function WorkflowRulesEditor({ className = "" }: WorkflowRulesEditorProps) {
  const [rules, setRules] = useState<WorkflowRule[]>([])
  const [loading, setLoading] = useState(true)
  const [editingRule, setEditingRule] = useState<WorkflowRule | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const loadRules = async () => {
    setLoading(true)
    try {
      const result = await getWorkflowRules()
      if (result.error) {
        toast.error(result.error)
      } else {
        setRules(result.data || [])
      }
    } catch (error) {
      toast.error('Failed to load workflow rules')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRules()
  }, [])

  const handleCreateRule = async (ruleData: {
    rule_type: WorkflowRule['rule_type']
    phase: WorkflowRule['phase']
    configuration: any
    is_active: boolean
  }) => {
    try {
      const result = await createWorkflowRule(ruleData)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Workflow rule created successfully')
        setIsCreateModalOpen(false)
        loadRules()
      }
    } catch (error) {
      toast.error('Failed to create workflow rule')
    }
  }

  const handleUpdateRule = async (ruleId: string, updates: Partial<WorkflowRule>) => {
    try {
      const result = await updateWorkflowRule(ruleId, updates)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Workflow rule updated successfully')
        setIsEditModalOpen(false)
        setEditingRule(null)
        loadRules()
      }
    } catch (error) {
      toast.error('Failed to update workflow rule')
    }
  }

  const handleDeleteRule = async (ruleId: string, ruleName: string) => {
    if (!confirm(`Are you sure you want to delete the rule "${ruleName}"?`)) {
      return
    }

    try {
      const result = await deleteWorkflowRule(ruleId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Workflow rule deleted successfully')
        loadRules()
      }
    } catch (error) {
      toast.error('Failed to delete workflow rule')
    }
  }

  const toggleRuleActive = async (rule: WorkflowRule) => {
    await handleUpdateRule(rule.id, { is_active: !rule.is_active })
  }

  const getRulesByType = (ruleType: WorkflowRule['rule_type']) => {
    return rules.filter(rule => rule.rule_type === ruleType)
  }

  const getRuleTypeInfo = (ruleType: WorkflowRule['rule_type']) => {
    return RULE_TYPES.find(type => type.value === ruleType)
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-orange-600" />
            Workflow Rules Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-muted-foreground">Loading workflow rules...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-orange-600" />
          Workflow Rules Configuration
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure PDCA transition validation rules, task completion thresholds, and business logic enforcement.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-muted-foreground">
            Manage {rules.length} workflow rules across all PDCA phases
          </div>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Workflow Rule</DialogTitle>
              </DialogHeader>
              <RuleForm onSubmit={handleCreateRule} onCancel={() => setIsCreateModalOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="phase_completion_threshold" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            {RULE_TYPES.map((type) => {
              const Icon = type.icon
              const count = getRulesByType(type.value).length
              return (
                <TabsTrigger key={type.value} value={type.value} className="flex items-center gap-1">
                  <Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{type.label}</span>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {count}
                  </Badge>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {RULE_TYPES.map((type) => (
            <TabsContent key={type.value} value={type.value} className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <type.icon className="w-5 h-5 text-muted-foreground" />
                <div>
                  <h3 className="font-medium">{type.label}</h3>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </div>
              </div>

              <div className="space-y-3">
                {getRulesByType(type.value).map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    onEdit={(rule) => {
                      setEditingRule(rule)
                      setIsEditModalOpen(true)
                    }}
                    onDelete={(rule) => handleDeleteRule(rule.id, `${rule.rule_type} - ${rule.phase || 'All'}`)}
                    onToggleActive={toggleRuleActive}
                  />
                ))}

                {getRulesByType(type.value).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <type.icon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No {type.label.toLowerCase()} rules configured</p>
                    <p className="text-xs mt-1">Click "Add Rule" to create your first rule</p>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Edit Rule Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Workflow Rule</DialogTitle>
            </DialogHeader>
            {editingRule && (
              <RuleForm
                initialRule={editingRule}
                onSubmit={(ruleData) => handleUpdateRule(editingRule.id, ruleData)}
                onCancel={() => {
                  setIsEditModalOpen(false)
                  setEditingRule(null)
                }}
                isEditing
              />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

interface RuleCardProps {
  rule: WorkflowRule
  onEdit: (rule: WorkflowRule) => void
  onDelete: (rule: WorkflowRule) => void
  onToggleActive: (rule: WorkflowRule) => void
}

function RuleCard({ rule, onEdit, onDelete, onToggleActive }: RuleCardProps) {
  const ruleTypeInfo = RULE_TYPES.find(type => type.value === rule.rule_type)
  const Icon = ruleTypeInfo?.icon || Settings

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium">
                {rule.phase || 'All Phases'}
              </h4>
              <Badge variant={rule.is_active ? "default" : "secondary"}>
                {rule.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{ruleTypeInfo?.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={rule.is_active}
            onCheckedChange={() => onToggleActive(rule)}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(rule)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(rule)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="bg-muted/50 rounded p-3">
        <h5 className="text-sm font-medium mb-2">Configuration</h5>
        <pre className="text-xs text-muted-foreground overflow-x-auto">
          {JSON.stringify(rule.configuration, null, 2)}
        </pre>
      </div>
    </div>
  )
}

interface RuleFormProps {
  initialRule?: WorkflowRule
  onSubmit: (ruleData: any) => void
  onCancel: () => void
  isEditing?: boolean
}

function RuleForm({ initialRule, onSubmit, onCancel, isEditing = false }: RuleFormProps) {
  const [ruleType, setRuleType] = useState<WorkflowRule['rule_type']>(initialRule?.rule_type || 'phase_completion_threshold')
  const [phase, setPhase] = useState<string>(initialRule?.phase || 'Plan')
  const [isActive, setIsActive] = useState(initialRule?.is_active ?? true)
  const [configuration, setConfiguration] = useState(
    JSON.stringify(initialRule?.configuration || getDefaultConfiguration('phase_completion_threshold'), null, 2)
  )

  function getDefaultConfiguration(type: WorkflowRule['rule_type']) {
    switch (type) {
      case 'phase_completion_threshold':
        return { threshold: 100, enforce: true, message: "All tasks must be completed before phase progression" }
      case 'mandatory_fields':
        return { fields: ['target_date'], message: "Required fields must be completed" }
      case 'validation_rule':
        return { script: "return true", message: "Custom validation failed" }
      case 'notification_rule':
        return { notify_on_status_change: true, notify_assignees: true, notify_owner: true }
      case 'duration_limit':
        return { max_days: 30, warning_days: 25, enforce: false }
      default:
        return {}
    }
  }

  const handleRuleTypeChange = (newType: WorkflowRule['rule_type']) => {
    setRuleType(newType)
    if (!isEditing) {
      setConfiguration(JSON.stringify(getDefaultConfiguration(newType), null, 2))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const parsedConfig = JSON.parse(configuration)
      onSubmit({
        rule_type: ruleType,
        phase: phase === 'All' ? null : phase,
        configuration: parsedConfig,
        is_active: isActive
      })
    } catch (error) {
      toast.error('Invalid JSON configuration')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="rule_type">Rule Type</Label>
          <Select value={ruleType} onValueChange={handleRuleTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select rule type" />
            </SelectTrigger>
            <SelectContent>
              {RULE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phase">PDCA Phase</Label>
          <Select value={phase} onValueChange={setPhase}>
            <SelectTrigger>
              <SelectValue placeholder="Select phase" />
            </SelectTrigger>
            <SelectContent>
              {PHASES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="configuration">Configuration (JSON)</Label>
        <Textarea
          id="configuration"
          value={configuration}
          onChange={(e) => setConfiguration(e.target.value)}
          placeholder="Enter JSON configuration..."
          className="font-mono text-sm"
          rows={6}
        />
        <p className="text-xs text-muted-foreground">
          Configure rule parameters in JSON format. Structure varies by rule type.
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="is_active"
          checked={isActive}
          onCheckedChange={setIsActive}
        />
        <Label htmlFor="is_active">Rule is active</Label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {isEditing ? 'Update Rule' : 'Create Rule'}
        </Button>
      </div>
    </form>
  )
}