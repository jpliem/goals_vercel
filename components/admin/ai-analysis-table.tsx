"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Bot, 
  Search, 
  Filter, 
  Calendar,
  Building2,
  Target,
  Eye,
  ChevronUp,
  ChevronDown,
  Loader2
} from "lucide-react"
import { AnalysisModal } from "./analysis-modal"

interface Goal {
  id: string
  subject: string
  description: string
  status: string
  priority: string
  department: string
  created_at: string
  target_date: string | null
  owner: { full_name: string } | null
  latest_analysis?: {
    id: string
    analysis_type: string
    created_at: string
    analysis_result: string
    ai_config: { model_name: string } | null
  }
}

export function AIAnalysisTable() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [filteredGoals, setFilteredGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [analysisFilter, setAnalysisFilter] = useState("all")
  const [sortBy, setSortBy] = useState<"created_at" | "analysis_date" | "subject">("created_at")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  
  // Modal state
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Load goals with analysis data
  const loadGoals = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/admin/goals-with-analysis')
      if (!response.ok) {
        throw new Error('Failed to load goals')
      }
      const data = await response.json()
      setGoals(data.goals || [])
    } catch (err) {
      setError('Failed to load goals. Please try again.')
      console.error('Error loading goals:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle AI analysis
  const handleAnalyze = async (goalId: string, analysisType: string = 'custom') => {
    setAnalyzing(goalId)
    setError(null)
    
    try {
      const { generateAIAnalysis } = await import('@/actions/ollama-integration')
      const result = await generateAIAnalysis(goalId, analysisType)
      
      if (result.error) {
        setError(result.error)
      } else {
        // Reload goals to show new analysis
        await loadGoals()
      }
    } catch (err) {
      setError('Failed to generate AI analysis. Please try again.')
      console.error('Error generating analysis:', err)
    } finally {
      setAnalyzing(null)
    }
  }

  // View analysis in modal
  const handleViewAnalysis = (goal: Goal) => {
    if (goal.latest_analysis) {
      setSelectedAnalysis({
        goal: goal,
        analysis: goal.latest_analysis
      })
      setModalOpen(true)
    }
  }

  // Filter and sort goals
  useEffect(() => {
    let filtered = [...goals]
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(goal => 
        goal.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        goal.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        goal.department.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // Department filter
    if (departmentFilter !== "all") {
      filtered = filtered.filter(goal => goal.department === departmentFilter)
    }
    
    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(goal => goal.status === statusFilter)
    }
    
    // Analysis filter
    if (analysisFilter === "analyzed") {
      filtered = filtered.filter(goal => goal.latest_analysis)
    } else if (analysisFilter === "not_analyzed") {
      filtered = filtered.filter(goal => !goal.latest_analysis)
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aValue: string | Date
      let bValue: string | Date
      
      switch (sortBy) {
        case "subject":
          aValue = a.subject
          bValue = b.subject
          break
        case "analysis_date":
          aValue = a.latest_analysis?.created_at ? new Date(a.latest_analysis.created_at) : new Date(0)
          bValue = b.latest_analysis?.created_at ? new Date(b.latest_analysis.created_at) : new Date(0)
          break
        default: // created_at
          aValue = new Date(a.created_at)
          bValue = new Date(b.created_at)
      }
      
      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1
      return 0
    })
    
    setFilteredGoals(filtered)
  }, [goals, searchTerm, departmentFilter, statusFilter, analysisFilter, sortBy, sortOrder])

  // Load goals on mount
  useEffect(() => {
    loadGoals()
  }, [])

  // Get unique departments for filter
  const departments = [...new Set(goals.map(goal => goal.department))].sort()

  // Handle sort
  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("desc")
    }
  }

  const getSortIcon = (field: typeof sortBy) => {
    if (sortBy !== field) return null
    return sortOrder === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading goals...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
        <div className="flex-1">
          <Label htmlFor="search">Search Goals</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              id="search"
              placeholder="Search by subject, description, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <div>
            <Label htmlFor="department">Department</Label>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Plan">Plan</SelectItem>
                <SelectItem value="Do">Do</SelectItem>
                <SelectItem value="Check">Check</SelectItem>
                <SelectItem value="Act">Act</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="On Hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="analysis">Analysis</Label>
            <Select value={analysisFilter} onValueChange={setAnalysisFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Goals</SelectItem>
                <SelectItem value="analyzed">Analyzed</SelectItem>
                <SelectItem value="not_analyzed">Not Analyzed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-gray-600">
        Showing {filteredGoals.length} of {goals.length} goals
      </div>

      {/* Goals Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-gray-50" 
                onClick={() => handleSort("subject")}
              >
                <div className="flex items-center gap-2">
                  Goal {getSortIcon("subject")}
                </div>
              </TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-50" 
                onClick={() => handleSort("created_at")}
              >
                <div className="flex items-center gap-2">
                  Created {getSortIcon("created_at")}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-50" 
                onClick={() => handleSort("analysis_date")}
              >
                <div className="flex items-center gap-2">
                  AI Analysis {getSortIcon("analysis_date")}
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGoals.map((goal) => (
              <TableRow key={goal.id} className="hover:bg-gray-50">
                <TableCell>
                  <div>
                    <div className="font-medium text-sm">{goal.subject}</div>
                    <div className="text-xs text-gray-500 line-clamp-1">
                      {goal.description}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Owner: {goal.owner?.full_name || 'Unknown'}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {goal.department}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {goal.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {new Date(goal.created_at).toLocaleDateString()}
                  </div>
                  {goal.target_date && (
                    <div className="text-xs text-gray-500">
                      Due: {new Date(goal.target_date).toLocaleDateString()}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {goal.latest_analysis ? (
                    <div>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                        ✓ Analyzed
                      </Badge>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(goal.latest_analysis.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-400">
                        {goal.latest_analysis.analysis_type}
                      </div>
                    </div>
                  ) : (
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                      Not analyzed
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {goal.latest_analysis && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewAnalysis(goal)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleAnalyze(goal.id)}
                      disabled={analyzing === goal.id}
                    >
                      {analyzing === goal.id ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Bot className="w-4 h-4 mr-1" />
                      )}
                      {analyzing === goal.id ? 'Analyzing...' : 'AI Analyze'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredGoals.length === 0 && !loading && (
        <div className="text-center py-12">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No goals found</h3>
          <p className="text-gray-600">
            {searchTerm || departmentFilter !== "all" || statusFilter !== "all" || analysisFilter !== "all"
              ? "Try adjusting your filters or search terms."
              : "No goals have been created yet."}
          </p>
        </div>
      )}

      {/* Analysis Modal */}
      <AnalysisModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        analysisData={selectedAnalysis}
      />
    </div>
  )
}