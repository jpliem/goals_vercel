"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth"
import { 
  getApplications, 
  getUsers, 
  getRequests, 
  createRequest as dbCreateRequest,
  getRequestById,
  getAllSystemRequests,
  bulkCreateUsers,
  bulkCreateApplications,
  createRequestOnBehalf,
  getUserByEmail,
  getUsersWithDepartmentPermissionsForExport
} from "@/lib/database"
import { 
  createExcelTemplate, 
  exportRequestsToExcel, 
  parseExcelFile,
  parseUsersFromExcel,
  parseApplicationsFromExcel,
  exportMultiEntityToExcel,
  validateRequestTypeConsistency,
  convertRequestTypeToDatabase,
  type ExcelRequestRow,
  type ExcelUserRow,
  type ExcelApplicationRow
} from "@/lib/excel-utils"
import { detectDuplicates, detectInternalDuplicates } from "@/lib/duplicate-detector"

export async function downloadExcelTemplate() {
  try {
    const user = await requireAuth()
    
    // All authenticated users can download templates
    // Admins get the full template with all sheets
    const isAdmin = user.role === 'Admin'

    const [applicationsResult, usersResult] = await Promise.all([
      getApplications(),
      getUsers()
    ])

    const applications = applicationsResult.data || []
    const users = usersResult.data || []

    const buffer = createExcelTemplate(applications, users, isAdmin)
    
    return { 
      success: true, 
      data: Array.from(buffer),
      filename: `request-template-${new Date().toISOString().split('T')[0]}.xlsx`
    }
  } catch (error) {
    console.error("Download template error:", error)
    return { error: "Failed to generate template" }
  }
}

export async function exportAllRequests() {
  try {
    const user = await requireAuth()
    
    // All authenticated users can export requests they have access to

    const requestsResult = await getRequests({
      userId: user.id,
      userRole: user.role
    })
    const requests = requestsResult.data?.data || []

    const buffer = exportRequestsToExcel(requests)
    
    return { 
      success: true, 
      data: Array.from(buffer),
      filename: `requests-export-${new Date().toISOString().split('T')[0]}.xlsx`
    }
  } catch (error) {
    console.error("Export requests error:", error)
    return { error: "Failed to export requests" }
  }
}

export async function parseImportFile(formData: FormData) {
  try {
    const user = await requireAuth()
    
    // All authenticated users can import requests

    const file = formData.get("file") as File
    if (!file) {
      return { error: "No file provided" }
    }

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return { error: "File must be an Excel file (.xlsx or .xls)" }
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const parseResult = parseExcelFile(buffer)

    if (parseResult.errors.length > 0) {
      return { 
        error: "File parsing errors", 
        details: parseResult.errors 
      }
    }

    // Check for internal duplicates within the import file and remove them
    const internalDuplicateCheck = detectInternalDuplicates(parseResult.requests)
    const requestsAfterDeduplication = internalDuplicateCheck.unique
    const internalDuplicatesSkipped = internalDuplicateCheck.duplicates

    // Get existing requests and validate against them
    const [existingRequestsResult, applicationsResult, usersResult] = await Promise.all([
      getRequests({
        userId: user.id,
        userRole: user.role
      }),
      getApplications(),
      getUsers()
    ])
    const existingRequests = existingRequestsResult.data?.data || []
    const applications = applicationsResult.data || []
    const users = usersResult.data || []

    // Validate applications and users exist (using deduplicated requests)
    const validationErrors: string[] = []
    const applicationNames = applications.map(app => app.name.toLowerCase())
    const userEmails = users.map(user => user.email.toLowerCase())

    requestsAfterDeduplication.forEach((request, index) => {
      // Note: We need to find the original row number since duplicates were removed
      const originalIndex = parseResult.requests.findIndex(r => 
        r.Subject === request.Subject && 
        r.Application === request.Application && 
        r.Description === request.Description
      )
      const rowNum = originalIndex + 2

      // Validate request type consistency
      const requestTypeErrors = validateRequestTypeConsistency(request, rowNum)
      validationErrors.push(...requestTypeErrors)

      // Application validation only for Enhancement requests
      if (request['Request Type'] === 'Enhancement' && request.Application) {
        if (!applicationNames.includes(request.Application.toLowerCase())) {
          validationErrors.push(`Row ${rowNum}: Application "${request.Application}" not found`)
        }
      }

      // Skip requestor email validation - will auto-set to uploading user
    })

    if (validationErrors.length > 0) {
      return { 
        error: "Validation errors", 
        details: validationErrors 
      }
    }

    // Check for duplicates against existing requests
    const duplicateResult = detectDuplicates(requestsAfterDeduplication, existingRequests)

    return {
      success: true,
      data: {
        totalRows: parseResult.requests.length,
        uniqueRequests: duplicateResult.uniqueRequests,
        duplicates: duplicateResult.duplicates,
        internalDuplicatesSkipped: internalDuplicatesSkipped,
        readyToImport: duplicateResult.uniqueRequests.length,
        duplicateCount: duplicateResult.duplicates.length,
        internalDuplicateCount: internalDuplicatesSkipped.length
      }
    }
  } catch (error) {
    console.error("Parse import file error:", error)
    return { error: "Failed to parse import file" }
  }
}

export async function importRequests(formData: FormData) {
  try {
    const user = await requireAuth()
    
    // All authenticated users can import requests

    const requestsData = formData.get("requestsData") as string
    if (!requestsData) {
      return { error: "No requests data provided" }
    }

    const requests: (ExcelRequestRow & { rowIndex: number })[] = JSON.parse(requestsData)
    
    // Get reference data
    const [applicationsResult, usersResult] = await Promise.all([
      getApplications(),
      getUsers()
    ])
    const applications = applicationsResult.data || []
    const users = usersResult.data || []

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Import each request
    for (const request of requests) {
      try {
        // Find application for Enhancement requests only
        let application = null
        if (request['Request Type'] === 'Enhancement') {
          application = applications.find(app => 
            app.name.toLowerCase() === request.Application?.toLowerCase()
          )
          if (!application) {
            results.errors.push(`Row ${request.rowIndex}: Application "${request.Application}" not found`)
            results.failed++
            continue
          }
        }

        // Determine requestor - use Requestor Email if provided, otherwise use uploading user
        let requestorId = user.id
        const requestWithAny = request as any
        if (requestWithAny['Requestor Email']) {
          const requestorUser = await getUserByEmail(requestWithAny['Requestor Email'])
          if (requestorUser) {
            requestorId = requestorUser.id
          } else {
            results.errors.push(`Row ${request.rowIndex}: Requestor with email "${requestWithAny['Requestor Email']}" not found`)
            results.failed++
            continue
          }
        }

        // Create the request
        const requestData = {
          application_id: application?.id || null,
          subject: request.Subject || '',
          description: request.Description || '',
          priority: request.Priority || 'Medium',
          requested_deadline: request['Requested Deadline'] || undefined,
          request_type: convertRequestTypeToDatabase(request['Request Type'] || 'Enhancement'),
          proposed_application_name: request['Proposed Application Name'] || null,
          requestor_id: requestorId
        }

        const createResult = await dbCreateRequest(requestData)
        
        if (createResult?.error) {
          results.errors.push(`Row ${request.rowIndex}: ${createResult.error}`)
          results.failed++
        } else {
          results.successful++
        }
      } catch (error) {
        results.errors.push(`Row ${request.rowIndex}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        results.failed++
      }
    }

    // Log import results
    console.log(`Import completed: ${results.successful} successful, ${results.failed} failed`)
    if (results.errors.length > 0) {
      console.log("Import errors:", results.errors)
    }

    // Revalidate relevant pages
    revalidatePath("/dashboard")
    revalidatePath("/admin")

    return {
      success: true,
      data: results
    }
  } catch (error) {
    console.error("Import requests error:", error)
    return { error: "Failed to import requests" }
  }
}

// Parse file for multi-entity import (admin only)
export async function parseMultiEntityFile(formData: FormData) {
  try {
    const user = await requireAuth()
    
    // Only admins can use multi-entity import
    if (user.role !== 'Admin') {
      return { error: "Unauthorized: Admin access required for multi-entity import" }
    }

    const file = formData.get("file") as File
    if (!file) {
      return { error: "No file provided" }
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Parse all entity types
    const usersResult = parseUsersFromExcel(buffer)
    const applicationsResult = parseApplicationsFromExcel(buffer)
    const requestsResult = parseExcelFile(buffer)

    return {
      success: true,
      data: {
        users: usersResult,
        applications: applicationsResult,
        requests: requestsResult,
        hasUsers: usersResult.users.length > 0,
        hasApplications: applicationsResult.applications.length > 0,
        hasRequests: requestsResult.requests.length > 0
      }
    }
  } catch (error) {
    console.error("Parse multi-entity file error:", error)
    return { error: "Failed to parse multi-entity file" }
  }
}

// Import Users (admin only)
export async function importUsers(formData: FormData) {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: "Unauthorized: Admin access required" }
    }

    const usersData = formData.get("usersData") as string
    if (!usersData) {
      return { error: "No users data provided" }
    }

    const users: ExcelUserRow[] = JSON.parse(usersData)
    
    // Convert to database format
    const usersToCreate = users.map(user => ({
      email: user.Email,
      full_name: user['Full Name'],
      password: user.Password,
      role: user.Role as 'Admin' | 'Head' | 'Employee',
      department: user.Department || undefined,
      departmentPermissions: user['Department Permissions']?.trim() 
        ? user['Department Permissions'].split(',').map(d => d.trim()).filter(d => d.length > 0)
        : undefined
    }))

    const results = await bulkCreateUsers(usersToCreate, user.id)
    
    revalidatePath("/admin")
    revalidatePath("/dashboard")

    return {
      success: true,
      data: results
    }
  } catch (error) {
    console.error("Import users error:", error)
    return { error: "Failed to import users" }
  }
}

// Import Applications (admin only)
export async function importApplications(formData: FormData) {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: "Unauthorized: Admin access required" }
    }

    const applicationsData = formData.get("applicationsData") as string
    if (!applicationsData) {
      return { error: "No applications data provided" }
    }

    const applications: ExcelApplicationRow[] = JSON.parse(applicationsData)
    
    // Convert to database format
    const applicationsToCreate = applications.map(app => ({
      name: app['Application Name'],
      tech_lead_email: app['Tech Lead Email'],
      description: app.Description || undefined,
      context: app.Context || undefined
    }))

    const results = await bulkCreateApplications(applicationsToCreate)
    
    revalidatePath("/admin")
    revalidatePath("/dashboard")

    return {
      success: true,
      data: results
    }
  } catch (error) {
    console.error("Import applications error:", error)
    return { error: "Failed to import applications" }
  }
}


// Import Requests on behalf of users (admin only)
export async function importRequestsOnBehalf(formData: FormData) {
  try {
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      return { error: "Unauthorized: Admin access required" }
    }

    const requestsData = formData.get("requestsData") as string
    if (!requestsData) {
      return { error: "No requests data provided" }
    }

    const requests: (ExcelRequestRow & { rowIndex: number })[] = JSON.parse(requestsData)
    
    // Get reference data
    const applicationsResult = await getApplications()
    const applications = applicationsResult.data || []
    
    // Pre-load all unique users to minimize database queries
    const uniqueEmails = [...new Set(requests
      .map(r => (r as any)['Requestor Email'])
      .filter(Boolean))] as string[]
    
    const userLookupPromises = uniqueEmails.map(email => 
      getUserByEmail(email).then(user => ({ email, user }))
    )
    const userLookupResults = await Promise.all(userLookupPromises)
    const userCache = new Map(
      userLookupResults.map(({ email, user }) => [email.toLowerCase(), user])
    )

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Process requests in batches
    const BATCH_SIZE = 10
    const batches = []
    for (let i = 0; i < requests.length; i += BATCH_SIZE) {
      batches.push(requests.slice(i, i + BATCH_SIZE))
    }

    console.log(`Processing ${requests.length} requests in ${batches.length} batches of ${BATCH_SIZE}`)

    // Process each batch
    for (const [batchIndex, batch] of batches.entries()) {
      console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} requests)`)
      
      const batchPromises = batch.map(async (request) => {
        try {
          console.log('Processing request in multi mode:', {
            rowIndex: request.rowIndex,
            subject: request.Subject?.substring(0, 50),
            hasRequestorEmail: !!(request as any)['Requestor Email'],
            requestorEmail: (request as any)['Requestor Email']
          })
          
          // Find application for Enhancement requests only
          let application = null
          if (request['Request Type'] === 'Enhancement') {
            application = applications.find(app => 
              app.name.toLowerCase() === request.Application?.toLowerCase()
            )
            if (!application) {
              return {
                success: false,
                error: `Row ${request.rowIndex}: Application "${request.Application}" not found`
              }
            }
          }

          // Use cached user lookup or fall back to current user
          let requestorEmail = (request as any)['Requestor Email']
          if (requestorEmail) {
            // Check if user exists in cache
            const cachedUser = userCache.get(requestorEmail.toLowerCase())
            if (!cachedUser) {
              return {
                success: false,
                error: `Row ${request.rowIndex}: Requestor with email "${requestorEmail}" not found`
              }
            }
          } else {
            // If no Requestor Email provided, use current user (same as Simple mode)
            requestorEmail = user.email
          }

          const requestData = {
            subject: request.Subject || '',
            description: request.Description || '',
            application_id: application?.id || null,
            priority: request.Priority || 'Medium',
            requested_deadline: request['Requested Deadline'] || undefined,
            request_type: convertRequestTypeToDatabase(request['Request Type'] || 'Enhancement'),
            proposed_application_name: request['Proposed Application Name'] || null,
            requestor_email: requestorEmail || ''
          }

          const createResult = await createRequestOnBehalf(requestData)
          
          if (createResult?.error) {
            return {
              success: false,
              error: `Row ${request.rowIndex}: ${createResult.error}`
            }
          } else {
            return { success: true }
          }
        } catch (error) {
          const rowNum = request.rowIndex || 'Unknown'
          const errorMsg = error instanceof Error ? error.message : String(error)
          return {
            success: false,
            error: `Row ${rowNum}: ${errorMsg}`
          }
        }
      })
      
      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises)
      
      // Process batch results
      batchResults.forEach(result => {
        if (result.success) {
          results.successful++
        } else {
          results.failed++
          if (result.error) {
            results.errors.push(result.error)
          }
        }
      })
    }

    revalidatePath("/dashboard")
    revalidatePath("/admin")

    // Log final results
    console.log(`Import completed: ${results.successful} successful, ${results.failed} failed`)
    if (results.errors.length > 0) {
      console.log("Import errors:", results.errors)
    }

    return {
      success: true,
      data: results
    }
  } catch (error) {
    console.error("Import requests on behalf error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { 
      error: `Failed to import requests: ${errorMessage}`,
      data: {
        successful: 0,
        failed: 0,
        errors: [errorMessage]
      }
    }
  }
}

// Export all data for admins (multi-entity export)
export async function exportAllData() {
  try {
    const user = await requireAuth()
    
    // Only admins can export all data
    if (user.role !== 'Admin') {
      return { error: "Unauthorized: Admin access required" }
    }

    const [requests, applications, users, departmentPermissions] = await Promise.all([
      getAllSystemRequests(),
      getApplications(),
      getUsers(),
      getUsersWithDepartmentPermissionsForExport()
    ])
    
    // Create multi-entity export with all current data
    const buffer = exportMultiEntityToExcel(requests.data || [], applications.data || [], users.data || [], departmentPermissions.data || new Map())
    
    return { 
      success: true, 
      data: Array.from(buffer),
      filename: `multi-entity-export-${new Date().toISOString().split('T')[0]}.xlsx`
    }
  } catch (error) {
    console.error("Export all data error:", error)
    return { error: "Failed to export all data" }
  }
}
