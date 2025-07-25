"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Filter, ChevronDown, ChevronUp, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { UserRecord } from "@/lib/database"
import { MultiSelectFilter, MultiSelectOption } from "@/components/ui/multi-select-filter"

interface CollapsibleFiltersProps {
  searchTerm: string
  setSearchTerm: (value: string) => void
  statusFilter: string[]
  setStatusFilter: (value: string[]) => void
  requestTypeFilter: string
  setRequestTypeFilter: (value: string) => void
  departmentFilter: string
  setDepartmentFilter: (value: string) => void
  picFilter: string[]
  setPicFilter: (value: string[]) => void
  techLeadFilter: string[]
  setTechLeadFilter: (value: string[]) => void
  requestorFilter: string[]
  setRequestorFilter: (value: string[]) => void
  executorFilter: string[]
  setExecutorFilter: (value: string[]) => void
  applicationFilter: string[]
  setApplicationFilter: (value: string[]) => void
  hideClosed: boolean
  setHideClosed: (value: boolean) => void
  users: UserRecord[]
  userAccessibleDepartments: string[]
  userProfile: UserRecord
  totalRequests: number
  filteredRequests: number
  allRequests?: any[] // Add requests data to extract dynamic values
}

export function CollapsibleFilters({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  requestTypeFilter,
  setRequestTypeFilter,
  departmentFilter,
  setDepartmentFilter,
  picFilter,
  setPicFilter,
  techLeadFilter,
  setTechLeadFilter,
  requestorFilter,
  setRequestorFilter,
  executorFilter,
  setExecutorFilter,
  applicationFilter,
  setApplicationFilter,
  hideClosed,
  setHideClosed,
  users,
  userAccessibleDepartments,
  userProfile,
  totalRequests,
  filteredRequests,
  allRequests = []
}: CollapsibleFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Get unique values from actual data
  const uniqueStatuses = [...new Set(allRequests.map(r => r.status))].filter(Boolean).sort()
  const uniqueRequestTypes = [...new Set(allRequests.map(r => r.request_type))].filter(Boolean).sort()
  
  // Simple approach: Just show actual people from the requests data
  
  // Get actual requestors from requests data
  const uniqueRequestorIds = [...new Set(allRequests.map(r => r.requestor?.id).filter(Boolean))]
  const actualRequestors = users.filter(user => uniqueRequestorIds.includes(user.id)).sort((a, b) => a.full_name.localeCompare(b.full_name))
  
  // Get actual tech leads from requests data
  const uniqueTechLeadIds = [...new Set(allRequests.map(r => r.tech_lead?.id).filter(Boolean))]
  const actualTechLeads = users.filter(user => uniqueTechLeadIds.includes(user.id)).sort((a, b) => a.full_name.localeCompare(b.full_name))
  
  // Get actual executors from requests data (both single and multi-executor)
  const uniqueExecutorIds = [...new Set([
    ...allRequests.map(r => r.executor?.id).filter(Boolean),
    ...allRequests.flatMap(r => r.executors?.map((e: any) => e.user_id) || []).filter(Boolean)
  ])]
  const actualExecutors = users.filter(user => uniqueExecutorIds.includes(user.id)).sort((a, b) => a.full_name.localeCompare(b.full_name))
  
  // Get actual PICs from requests data
  const uniquePICIds = [...new Set(allRequests.map(r => r.current_pic_id).filter(Boolean))]
  const actualPICs = users.filter(user => uniquePICIds.includes(user.id)).sort((a, b) => a.full_name.localeCompare(b.full_name))
  
  // Get actual applications from requests data
  const uniqueApplications = Array.from(
    new Map(
      allRequests
        .map(r => r.application)
        .filter(Boolean)
        .map((app: any) => [app.id, app])
    ).values()
  ).sort((a: any, b: any) => a.name.localeCompare(b.name))

  // Check if any filters are active
  const hasActiveFilters = searchTerm !== "" || !statusFilter.includes("all") || requestTypeFilter !== "all" || 
                          departmentFilter !== "all" || !picFilter.includes("all") || !techLeadFilter.includes("all") || 
                          !requestorFilter.includes("all") || !executorFilter.includes("all") || 
                          !applicationFilter.includes("all") || hideClosed !== true

  const clearAllFilters = () => {
    setSearchTerm("")
    setStatusFilter(["all"])
    setRequestTypeFilter("all")
    setDepartmentFilter("all")
    setPicFilter(["all"])
    setTechLeadFilter(["all"])
    setRequestorFilter(["all"])
    setExecutorFilter(["all"])
    setApplicationFilter(["all"])
    setHideClosed(true) // Reset to default (hide closed)
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (searchTerm !== "") count++
    if (!statusFilter.includes("all")) count++
    if (requestTypeFilter !== "all") count++
    if (departmentFilter !== "all") count++
    if (!picFilter.includes("all")) count++
    if (!techLeadFilter.includes("all")) count++
    if (!requestorFilter.includes("all")) count++
    if (!executorFilter.includes("all")) count++
    if (!applicationFilter.includes("all")) count++
    if (hideClosed !== true) count++ // Count when showing closed requests
    return count
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      {/* Compact Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-4 flex-1">
          {/* Primary Search - Always Visible */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input 
              placeholder="Search requests..." 
              className="pl-10 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Key Filters - Always Visible */}
          <div className="flex items-center gap-2">
            <MultiSelectFilter
              options={uniqueStatuses.map(status => ({ value: status, label: status }))}
              selected={statusFilter}
              onSelectionChange={setStatusFilter}
              placeholder="Status"
              allLabel="All Status"
              width="w-[130px]"
            />

            <Select value={requestTypeFilter} onValueChange={setRequestTypeFilter}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue placeholder="Request Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="new">New Application</SelectItem>
                <SelectItem value="enhancement">Enhancement</SelectItem>
                <SelectItem value="hardware">Hardware</SelectItem>
              </SelectContent>
            </Select>

            {/* Hide Closed Requests Checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox 
                id="hideClosed"
                checked={hideClosed}
                onCheckedChange={(checked) => setHideClosed(checked as boolean)}
              />
              <label htmlFor="hideClosed" className="text-sm text-gray-700 cursor-pointer">
                Hide Closed
              </label>
            </div>
          </div>
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center gap-2">
          {/* Dynamic Count Display */}
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Filter className="h-3 w-3" />
            {hasActiveFilters ? (
              <span className="font-medium">
                {filteredRequests} of {totalRequests} requests
              </span>
            ) : (
              <span>
                {totalRequests} requests
              </span>
            )}
          </div>

          {/* Active Filters Badge */}
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs">
              {getActiveFiltersCount()} active
            </Badge>
          )}

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-8 px-2 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}

          {/* Expand/Collapse Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 px-2"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                <span className="text-xs">Less</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                <span className="text-xs">More</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Expanded Additional Filters */}
      {isExpanded && (
        <div className="px-4 py-3 bg-gray-50 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Department Filter */}
            {(userAccessibleDepartments.length > 0 || userProfile.role === "Admin") && (
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Department</label>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {userProfile.role !== "Admin" && (
                      <SelectItem value="my-requests">
                        {userProfile.role === "PIC" ? "My Assigned Tasks" : "My Requests Only"}
                      </SelectItem>
                    )}
                    <SelectItem value="no-department">No Department</SelectItem>
                    {userAccessibleDepartments.map(dept => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* PIC Filter */}
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Current PIC</label>
              <MultiSelectFilter
                options={[
                  { value: "admin", label: "Admin Review" },
                  ...actualPICs.map(user => ({ value: user.id, label: user.full_name }))
                ]}
                selected={picFilter}
                onSelectionChange={setPicFilter}
                placeholder="Current PIC"
                allLabel="All PICs"
                width="w-full"
              />
            </div>

            {/* Tech Lead Filter */}
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Tech Lead</label>
              <MultiSelectFilter
                options={actualTechLeads.map(user => ({ value: user.id, label: user.full_name }))}
                selected={techLeadFilter}
                onSelectionChange={setTechLeadFilter}
                placeholder="Tech Lead"
                allLabel="All Tech Leads"
                width="w-full"
              />
            </div>

            {/* Requestor Filter */}
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Requestor</label>
              <MultiSelectFilter
                options={actualRequestors.map(user => ({ value: user.id, label: user.full_name }))}
                selected={requestorFilter}
                onSelectionChange={setRequestorFilter}
                placeholder="Requestor"
                allLabel="All Requestors"
                width="w-full"
              />
            </div>

            {/* Executor Filter */}
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Executor</label>
              <MultiSelectFilter
                options={[
                  { value: "unassigned", label: "Unassigned" },
                  ...actualExecutors.map(user => ({ value: user.id, label: user.full_name }))
                ]}
                selected={executorFilter}
                onSelectionChange={setExecutorFilter}
                placeholder="Executor"
                allLabel="All Executors"
                width="w-full"
              />
            </div>

            {/* Application Filter */}
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Application</label>
              <MultiSelectFilter
                options={uniqueApplications.map((app: any) => ({ value: app.id, label: app.name }))}
                selected={applicationFilter}
                onSelectionChange={setApplicationFilter}
                placeholder="Application"
                allLabel="All Applications"
                width="w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
