import * as XLSX from 'xlsx'
import type { Application, UserRecord, RequestWithDetails } from './database'
import { 
  getOverdueInfo, 
  formatOverdueStatus, 
  getOverdueRequests, 
  getDaysOverdue 
} from './overdue-utils'

export interface ExcelRequestRow {
  Subject?: string
  Description?: string
  Application?: string
  Priority?: 'Low' | 'Medium' | 'High' | 'Critical'
  'Requested Deadline'?: string
  'Request Type'?: 'Enhancement' | 'New Application'
  'Proposed Application Name'?: string
}

export interface ExcelApplicationRow {
  'Application Name': string
  'Tech Lead Email': string
  Description?: string
  Context?: string
}

export interface ExcelUserRow {
  'Full Name': string
  Email: string
  Password: string
  Role: 'Employee' | 'Head' | 'Admin'
  Department?: string
  'Department Permissions'?: string
}

// Helper function to handle large content for Excel export
function handleLargeContent(content: string | null | undefined, fieldName: string, identifier: string = ''): string {
  if (!content) return ''
  
  const trimmedContent = content.trim()
  
  // Log warning for very large content
  if (trimmedContent.length > 30000) {
    console.warn(`${identifier ? identifier + ': ' : ''}Large ${fieldName} content (${trimmedContent.length} characters). May affect Excel display.`)
  }
  
  // Ensure content doesn't exceed Excel limits
  if (trimmedContent.length > 32767) {
    console.error(`${identifier ? identifier + ': ' : ''}${fieldName} content truncated (${trimmedContent.length} > 32,767 characters).`)
    return trimmedContent.substring(0, 32767) + '... [TRUNCATED - Content exceeded Excel limit]'
  }
  
  return trimmedContent
}

export function createExcelTemplate(
  applications: Application[], 
  users: UserRecord[],
  includeAllSheets: boolean = false // Admin gets all sheets
): Buffer {
  const workbook = XLSX.utils.book_new()

  // Sheet 1: Requests Template
  const requestHeaders = includeAllSheets ? [
    'Subject',
    'Description', 
    'Application',
    'Priority',
    'Requested Deadline',
    'Request Type',
    'Proposed Application Name',
    'Owner Email'
  ] : [
    'Subject',
    'Description', 
    'Application',
    'Priority',
    'Requested Deadline',
    'Request Type',
    'Proposed Application Name'
  ]

  // Add sample data to help users understand format
  const sampleData = includeAllSheets ? [
    [
      'Example: Add reporting feature',
      'Add a new reporting dashboard to show user analytics and usage statistics',
      'Customer Portal',
      'High',
      '2024-12-31',
      'Enhancement',
      '',
      'john.doe@company.com'
    ],
    [
      'Example: Create new inventory system',
      'Develop a complete inventory management system for tracking products and stock levels',
      '', 
      'Critical',
      '2024-11-15',
      'New Application',
      'Inventory Management System',
      'jane.smith@company.com'
    ]
  ] : [
    [
      'Example: Add reporting feature',
      'Add a new reporting dashboard to show user analytics and usage statistics',
      'Customer Portal',
      'High',
      '2024-12-31',
      'Enhancement',
      ''
    ],
    [
      'Example: Create new inventory system',
      'Develop a complete inventory management system for tracking products and stock levels',
      '', 
      'Critical',
      '2024-11-15',
      'New Application',
      'Inventory Management System'
    ]
  ]
  
  const requestsSheet = XLSX.utils.aoa_to_sheet([
    requestHeaders,
    ...sampleData
  ])
  
  // Add data validation for dropdowns - this provides better user experience
  const priorityOptions = ['Low', 'Medium', 'High', 'Critical']
  const requestTypeOptions = ['Enhancement', 'New Application']
  
  // Get application names for dropdown (no sensitive data)
  const applicationOptions = applications.map(app => app.name)
  
  // Add range references for dropdowns (Excel style)
  const maxCols = includeAllSheets ? 'H100' : 'G100'
  const range = XLSX.utils.decode_range(requestsSheet['!ref'] || `A1:${maxCols}`)
  const applicationColIndex = requestHeaders.indexOf('Application')
  const priorityColIndex = requestHeaders.indexOf('Priority')
  const requestTypeColIndex = requestHeaders.indexOf('Request Type')
  
  // Extend the range to allow for more rows
  range.e.r = Math.max(range.e.r, 1000) // Allow up to 1000 rows
  requestsSheet['!ref'] = XLSX.utils.encode_range(range)
  
  // Add data validation (Excel will recognize these)
  if (!requestsSheet['!dataValidations']) requestsSheet['!dataValidations'] = []
  
  // Application dropdown validation
  if (applicationOptions.length > 0) {
    requestsSheet['!dataValidations'].push({
      type: 'list',
      allowBlank: false,
      sqref: `${XLSX.utils.encode_col(applicationColIndex)}3:${XLSX.utils.encode_col(applicationColIndex)}1000`,
      formulas: [applicationOptions.join(',')]
    })
  }
  
  // Priority dropdown validation  
  requestsSheet['!dataValidations'].push({
    type: 'list',
    allowBlank: false,
    sqref: `${XLSX.utils.encode_col(priorityColIndex)}3:${XLSX.utils.encode_col(priorityColIndex)}1000`,
    formulas: [priorityOptions.join(',')]
  })
  
  // Request Type dropdown validation
  requestsSheet['!dataValidations'].push({
    type: 'list',
    allowBlank: false,
    sqref: `${XLSX.utils.encode_col(requestTypeColIndex)}3:${XLSX.utils.encode_col(requestTypeColIndex)}1000`,
    formulas: [requestTypeOptions.join(',')]
  })
  
  
  XLSX.utils.book_append_sheet(workbook, requestsSheet, 'NEW REQUESTS ONLY')

  // Sheet 2: Users (Admin only)
  if (includeAllSheets) {
    const userHeaders = ['Full Name', 'Email', 'Password', 'Role', 'Department', 'Department Permissions']
    const userSampleData = [
      ['John Doe', 'john.doe@company.com', 'SecurePass123!', 'Employee', 'Marketing', ''],
      ['Jane Smith', 'jane.smith@company.com', 'TechLead456@', 'Head', 'IT', 'Marketing, Finance'],
      ['Bob Admin', 'admin@company.com', 'AdminPwd789#', 'Admin', 'Management', 'IT, Marketing, Finance, HR']
    ]
    
    const usersSheet = XLSX.utils.aoa_to_sheet([
      userHeaders,
      ...userSampleData
    ])
    
    // Add role validation dropdown
    const roleOptions = ['Employee', 'Head', 'Admin']
    const roleColIndex = userHeaders.indexOf('Role')
    
    if (!usersSheet['!dataValidations']) usersSheet['!dataValidations'] = []
    usersSheet['!dataValidations'].push({
      type: 'list',
      allowBlank: false,
      sqref: `${XLSX.utils.encode_col(roleColIndex)}3:${XLSX.utils.encode_col(roleColIndex)}1000`,
      formulas: [roleOptions.join(',')]
    })
    
    XLSX.utils.book_append_sheet(workbook, usersSheet, 'Users')
    
    // Sheet 3: Applications
    const appHeaders = ['Application Name', 'Tech Lead Email', 'Description', 'Context']
    const appSampleData = [
      ['Customer Portal', 'jane.smith@company.com', 'Main customer-facing web application', 'React/Next.js frontend with Node.js API, hosted on AWS. Users access customer data, invoices, and support tickets.'],
      ['HR System', 'jane.smith@company.com', 'Internal HR management system', 'Internal Django/Python application for staff records, payroll integration, and benefits management.']
    ]
    
    const appsSheet = XLSX.utils.aoa_to_sheet([
      appHeaders,
      ...appSampleData
    ])
    
    XLSX.utils.book_append_sheet(workbook, appsSheet, 'Applications')
    
  }

  // Instructions Sheet
  const instructions = includeAllSheets ? [
    ['ADMIN IMPORT TEMPLATE - INSTRUCTIONS'],
    [''],
    ['This template allows admins to bulk import multiple entity types:'],
    [''],
    ['1. USERS SHEET:'],
    ['   - Create new user accounts with roles'],
    ['   - Full Name: Display name for the user'],
    ['   - Email: Must be unique, used for login'],
    ['   - Role: Employee, Head, or Admin'],
    ['   - Department: Optional organizational unit'],
    ['   - Department Permissions: Comma-separated list of departments user can access'],
    ['   - Example: "IT, Marketing, Finance" (leave empty for no additional permissions)'],
    [''],
    ['2. APPLICATIONS SHEET:'],
    ['   - Create new applications with tech leads'],
    ['   - Application Name: Unique name for the application'],
    ['   - Tech Lead Email: Must match a user email (users with Head role)'],
    ['   - Description: Optional description'],
    ['   - Context: Optional technical context for AI analysis'],
    [''],
    ['3. REQUESTS SHEET:'],
    ['   - Create requests on behalf of users'],
    ['   - Owner Email: Email of user to create request for'],
    ['   - Request Type: Enhancement or New Application'],
    ['   - Enhancement: Requires existing Application, leave Proposed Name empty'],
    ['   - New Application: Leave Application empty, provide Proposed Name'],
    ['   - All other fields same as regular requests'],
    [''],
    ['IMPORT ORDER:'],
    ['1. Import Users first (to create user accounts)'],
    ['2. Import Applications second (requires users for tech leads)'],
    ['3. Import Requests last (requires users and applications)'],
    [''],
    ['VALIDATION:'],
    ['- Email addresses must be valid and unique'],
    ['- Role values must match dropdown options'],
    ['- Tech Lead emails must exist in Users sheet (Head role)'],
    ['- Owner emails must exist in Users sheet'],
    ['- Application names must exist for request import'],
    ['- Department Permissions must be comma-separated (e.g., "IT, Finance")'],
    [''],
    ['TIPS:'],
    ['- Start with small batches to test'],
    ['- Users with PIC role can be assigned as tech leads'],
    ['- Check preview before final import'],
    ['- Import will skip duplicates and show errors']
  ] : [
    ['REQUEST IMPORT TEMPLATE - INSTRUCTIONS'],
    [''],
    ['Use this template to bulk import requests:'],
    [''],
    ['REQUIRED FIELDS:'],
    ['- Subject: Brief description of the request'],
    ['- Description: Detailed explanation of what is needed'],
    ['- Request Type: Enhancement or New Application'],
    ['- Application: Required for Enhancement requests (must exist)'],
    ['- Proposed Application Name: Required for New Application requests'],
    ['- Priority: Low, Medium, High, or Critical'],
    [''],
    ['OPTIONAL FIELDS:'],
    ['- Requested Deadline: Date in YYYY-MM-DD format'],
    [''],
    ['REQUEST TYPE RULES:'],
    ['- Enhancement: Requires existing Application, leave Proposed Name empty'],
    ['- New Application: Leave Application empty, provide Proposed Name'],
    [''],
    ['VALIDATION:'],
    ['- Request Type must be Enhancement or New Application'],
    ['- Application names must exist for Enhancement requests'],
    ['- Proposed Application Name required for New Application requests'],
    ['- Priority must be one of the dropdown values'],
    ['- Dates must be in YYYY-MM-DD format'],
    ['- Duplicate requests will be detected and skipped'],
    [''],
    ['TIPS:'],
    ['- Use the dropdown menus for consistent data'],
    ['- Check the reference sheets for existing applications'],
    ['- Preview your import before final submission'],
    ['- System will detect and warn about duplicates']
  ]
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions)
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions')

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}

/**
 * Helper function to determine current PIC name based on status
 */
function getCurrentPicName(request: RequestWithDetails): string {
  switch (request.status) {
    case "New":
    case "Initial Analysis":
      return request.tech_lead?.full_name || ''
    case "Pending Assignment":
      return '' // No specific PIC during assignment phase
    case "In Progress":
    case "Rework":
      return request.executor?.full_name || ''
    case "Code Review":
      return request.tech_lead?.full_name || ''
    case "Pending UAT":
      return request.requestor?.full_name || ''
    case "Pending Deployment":
      return request.executor?.full_name || request.tech_lead?.full_name || ''
    case "Pending Clarification":
      // For clarification, the current_pic_id field should be used
      // This would need to be resolved from the current_pic_id field
      return request.current_pic_id ? 'See workflow history' : ''
    case "Closed":
    case "Rejected":
      return ''
    default:
      return ''
  }
}

/**
 * Calculate days between two dates
 */
function calculateDaysBetween(startDate: string | null, endDate: string | null): number {
  if (!startDate || !endDate) return 0
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Calculate days in current status (from workflow history or updated_at)
 */
function calculateDaysInStatus(request: RequestWithDetails): number {
  // For a more accurate calculation, we'd need to check workflow history
  // For now, we'll use updated_at as a proxy
  if (!request.updated_at) return 0
  return calculateDaysBetween(request.updated_at, new Date().toISOString())
}

/**
 * Format date to full date-time string
 */
function formatDateTime(dateString: string | null): { date: string, time: string } {
  if (!dateString) return { date: '', time: '' }
  const date = new Date(dateString)
  return {
    date: date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
    time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  }
}

export function exportRequestsToExcel(
  requests: RequestWithDetails[]
): Buffer {
  const workbook = XLSX.utils.book_new()

  // Enhanced headers with comprehensive data
  const requestData = [
    [
      'ID',
      'Subject',
      'Description',
      'Application',
      'Priority',
      'Request Type',
      'Proposed Application Name',
      'Status',
      'Days in Status',
      'Total Age (Days)',
      'Requestor Name',
      'Owner Email',
      'Tech Lead Name',
      'Executor Name',
      'Current PIC',
      'Requested Deadline',
      'Internal Deadline',
      'Adjusted Deadline',
      'Days Overdue',
      'Overdue Status',
      'Created Date',
      'Created Time',
      'Last Updated Date',
      'Last Updated Time',
      'Tech Lead Notes',
      'Assigned By',
      'Workflow Stage',
      'Request Category'
    ],
    ...requests.map(request => {
      const overdueInfo = getOverdueInfo(request)
      const createdDateTime = formatDateTime(request.created_at)
      const updatedDateTime = formatDateTime(request.updated_at)
      const requestAge = request.created_at ? calculateDaysBetween(request.created_at, new Date().toISOString()) : 0
      const daysInStatus = calculateDaysInStatus(request)
      const currentPicName = getCurrentPicName(request)
      
      // Determine workflow stage based on status
      const workflowStage = (() => {
        switch (request.status) {
          case 'New':
          case 'Initial Analysis':
            return 'Planning'
          case 'Pending Assignment':
          case 'In Progress':
          case 'Rework':
          case 'Code Review':
            return 'Development'
          case 'Pending UAT':
            return 'Testing'
          case 'Pending Deployment':
            return 'Deployment'
          case 'Pending Clarification':
            return 'On Hold'
          case 'Closed':
            return 'Completed'
          case 'Rejected':
            return 'Cancelled'
          default:
            return 'Unknown'
        }
      })()
      
      return [
        request.id || '',                                                              // ID
        request.subject || '',                                                         // Subject
        request.description || '',                                                     // Description
        request.application?.name || '',                                               // Application
        request.priority || '',                                                        // Priority
        request.request_type === 'enhancement' ? 'Enhancement' : 'New Application',   // Request Type
        request.proposed_application_name || '',                                       // Proposed Application Name
        request.status || '',                                                          // Status
        daysInStatus,                                                                  // Days in Status
        requestAge,                                                                    // Total Age (Days)
        request.requestor?.full_name || '',                                            // Requestor Name
        request.requestor?.email || '',                                                // Requestor Email
        request.tech_lead?.full_name || '',                                            // Tech Lead Name
        request.executor?.full_name || '',                                             // Executor Name
        currentPicName,                                                                // Current PIC
        request.requested_deadline || '',                                              // Requested Deadline
        request.internal_deadline || '',                                               // Internal Deadline
        request.adjusted_deadline || '',                                               // Adjusted Deadline
        overdueInfo.daysOverdue,                                                       // Days Overdue
        formatOverdueStatus(request),                                                  // Overdue Status
        createdDateTime.date,                                                          // Created Date
        createdDateTime.time,                                                          // Created Time
        updatedDateTime.date,                                                          // Last Updated Date
        updatedDateTime.time,                                                          // Last Updated Time
        request.tech_lead_notes || '',                                                 // Tech Lead Notes
        request.assigned_by_user?.full_name || '',                                     // Assigned By
        workflowStage,                                                                 // Workflow Stage
        request.application ? 'Enhancement' : 'New System'                             // Request Category
      ]
    })
  ]

  const requestsSheet = XLSX.utils.aoa_to_sheet(requestData)
  
  // Auto-size columns for better readability
  const maxWidth = 50
  const colWidths = requestData[0].map((_, colIndex) => {
    const maxLength = Math.max(
      ...requestData.map(row => String(row[colIndex] || '').length)
    )
    return { wch: Math.min(maxLength + 2, maxWidth) }
  })
  requestsSheet['!cols'] = colWidths
  
  XLSX.utils.book_append_sheet(workbook, requestsSheet, 'Requests')

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}

export function parseExcelFile(buffer: Buffer): {
  requests: ExcelRequestRow[]
  errors: string[]
} {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    
    // Try multiple possible sheet names for flexibility - prioritize new format
    const possibleSheetNames = ['NEW REQUESTS ONLY', 'Requests', 'requests', 'Request', 'Sheet1', 'Data']
    let requestsSheetName = possibleSheetNames.find(name => 
      workbook.SheetNames.includes(name)
    )
    
    // If none of the expected names found, use the first sheet
    if (!requestsSheetName) {
      if (workbook.SheetNames.length === 0) {
        return { requests: [], errors: ['Excel file contains no sheets'] }
      }
      requestsSheetName = workbook.SheetNames[0]
      console.log(`Using first sheet "${requestsSheetName}" as no "Requests" sheet found`)
    }

    const worksheet = workbook.Sheets[requestsSheetName]
    const jsonData = XLSX.utils.sheet_to_json<ExcelRequestRow>(worksheet, {
      header: 1,
      defval: ''
    })

    console.log(`Parsing sheet "${requestsSheetName}": found ${jsonData.length} total rows`)

    if (jsonData.length < 1) {
      return { 
        requests: [], 
        errors: [
          `Sheet "${requestsSheetName}" is empty - no NEW requests to import.`,
          `Available sheets: ${workbook.SheetNames.join(', ')}`,
          `Remember: This template is for creating NEW requests only, not editing existing ones.`
        ] 
      }
    }

    if (jsonData.length < 2) {
      return { 
        requests: [], 
        errors: [
          `Sheet "${requestsSheetName}" must contain header row and at least one NEW request data row.`,
          `Found ${jsonData.length} rows total.`,
          `Available sheets: ${workbook.SheetNames.join(', ')}`,
          `Make sure your data is in a sheet named "NEW REQUESTS ONLY" or use the latest template.`,
          `Remember: This is for creating NEW requests only, not editing existing ones.`
        ] 
      }
    }

    // Remove header row and filter empty rows more carefully
    const headers = jsonData[0] as string[]
    console.log(`Headers found: ${headers.join(', ')}`)
    
    const dataRows = jsonData.slice(1).filter((row, index) => {
      if (!Array.isArray(row)) {
        console.log(`Row ${index + 2}: Not an array, skipping`)
        return false
      }
      
      // Check if any cell has meaningful content
      const hasContent = row.some(cell => {
        if (cell === null || cell === undefined) return false
        const stringValue = String(cell).trim()
        return stringValue !== '' && stringValue !== '0' && stringValue.toLowerCase() !== 'null'
      })
      
      if (!hasContent) {
        console.log(`Row ${index + 2}: Empty row, skipping`)
      }
      
      return hasContent
    })

    console.log(`After filtering: ${dataRows.length} data rows remaining`)

    // Check if we have any data rows left after filtering
    if (dataRows.length === 0) {
      return { 
        requests: [], 
        errors: [
          `No valid NEW request data rows found in sheet "${requestsSheetName}".`,
          `Found ${jsonData.length - 1} rows after header, but all appear to be empty.`,
          `Make sure your NEW request rows contain values in the required columns:`,
          `- Request Type (Enhancement or New Application)`,
          `- Subject (brief description)`,
          `- Description (detailed requirements)`,
          `- Priority (Low/Medium/High/Critical)`,
          `Headers found: ${headers.join(', ')}`,
          `Remember: Delete the example rows before importing your actual data.`
        ] 
      }
    }

    // Convert to objects with header mapping for new template format
    const requests: ExcelRequestRow[] = dataRows.map((row: any, index: number) => {
      const obj: any = {}
      headers.forEach((header, colIndex) => {
        // Map new template headers to expected format
        let mappedHeader = header
        if (header === '*** REQUEST TYPE (REQUIRED) ***') {
          mappedHeader = 'Request Type'
        } else if (header === 'Application (for Enhancement only)') {
          mappedHeader = 'Application'
        } else if (header === 'Proposed Application Name (for New App only)') {
          mappedHeader = 'Proposed Application Name'
        }
        
        let cellValue = row[colIndex] || ''
        
        // Handle large text content - trim excess whitespace but preserve content
        if (typeof cellValue === 'string') {
          cellValue = cellValue.trim()
          
          // Log warning for very large cells (approaching Excel limit)
          if (cellValue.length > 30000) {
            console.warn(`Row ${index + 2}, Column "${mappedHeader}": Very large content (${cellValue.length} characters). Excel limit is 32,767.`)
          }
          
          // Validate against Excel's character limit
          if (cellValue.length > 32767) {
            console.error(`Row ${index + 2}, Column "${mappedHeader}": Content exceeds Excel limit (${cellValue.length} > 32,767 characters). Content will be truncated.`)
            cellValue = cellValue.substring(0, 32767)
          }
        }
        
        obj[mappedHeader] = cellValue
      })
      
      // Log first few requests for debugging (with content size info)
      if (index < 3) {
        console.log(`Request ${index + 1}:`, {
          Subject: obj.Subject,
          Application: obj.Application,
          Priority: obj.Priority,
          'Requested Deadline': obj['Requested Deadline'],
          'Request Type': obj['Request Type'],
          DescriptionLength: obj.Description?.length || 0,
          SubjectLength: obj.Subject?.length || 0
        })
      }
      
      return obj as ExcelRequestRow
    })

    // Basic validation
    const errors: string[] = []
    const validPriorities = ['Low', 'Medium', 'High', 'Critical']
    const validRequestTypes = ['Enhancement', 'New Application']

    requests.forEach((request, index) => {
      const rowNum = index + 2 // +2 because index starts at 0 and we skip header

      if (!request.Subject?.trim()) {
        errors.push(`Row ${rowNum}: Subject is required for your NEW request`)
      }

      if (!request.Description?.trim()) {
        errors.push(`Row ${rowNum}: Description is required - explain what NEW functionality you need`)
      }

      // Request Type validation - most critical field
      if (!request['Request Type']?.trim()) {
        errors.push(`Row ${rowNum}: Request Type is REQUIRED - choose "Enhancement" or "New Application"`)
      } else if (!validRequestTypes.includes(request['Request Type'])) {
        errors.push(`Row ${rowNum}: Request Type must be exactly "Enhancement" or "New Application" (case sensitive)`)
      }

      // Application validation based on request type - critical rules
      if (request['Request Type'] === 'Enhancement') {
        if (!request.Application?.trim()) {
          errors.push(`Row ${rowNum}: Enhancement requests MUST specify an existing Application - select from dropdown`)
        }
        if (request['Proposed Application Name']?.trim()) {
          errors.push(`Row ${rowNum}: Enhancement requests should leave "Proposed Application Name" EMPTY`)
        }
      } else if (request['Request Type'] === 'New Application') {
        if (request.Application?.trim()) {
          errors.push(`Row ${rowNum}: New Application requests should leave "Application" field EMPTY`)
        }
        if (!request['Proposed Application Name']?.trim()) {
          errors.push(`Row ${rowNum}: New Application requests MUST provide "Proposed Application Name" - what should the new system be called?`)
        }
      }

      if (!request.Priority || !validPriorities.includes(request.Priority)) {
        errors.push(`Row ${rowNum}: Priority must be one of: ${validPriorities.join(', ')}`)
      }

      // Validate date format if provided (YYYY-MM-DD format or Excel serial number)
      if (request['Requested Deadline'] && request['Requested Deadline'] !== '') {
        let dateString = request['Requested Deadline']
        
        // Handle Excel serial numbers (e.g., 45840) - convert to date string
        if (typeof dateString === 'number') {
          try {
            // Excel epoch starts on January 1, 1900, but Excel incorrectly treats 1900 as a leap year
            // So we need to account for that in our calculation
            const excelEpoch = new Date(1900, 0, 1)
            const msPerDay = 24 * 60 * 60 * 1000
            // Subtract 2 days to account for Excel's leap year bug and 0-indexing
            const actualDate = new Date(excelEpoch.getTime() + (dateString - 2) * msPerDay)
            dateString = actualDate.toISOString().split('T')[0] // Format as YYYY-MM-DD
          } catch (error) {
            errors.push(`Row ${rowNum}: Unable to convert Excel date number ${request['Requested Deadline']} to valid date`)
          }
        } else if (typeof dateString === 'string') {
          dateString = dateString.trim()
        } else {
          errors.push(`Row ${rowNum}: Requested Deadline must be a date value`)
        }
        
        // Validate the final date string format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        if (!dateRegex.test(dateString)) {
          errors.push(`Row ${rowNum}: Requested Deadline must be in YYYY-MM-DD format (e.g., 2024-12-31) or valid Excel date`)
        } else {
          const date = new Date(dateString)
          if (isNaN(date.getTime())) {
            errors.push(`Row ${rowNum}: Requested Deadline is not a valid date`)
          } else {
            // Update the request object with the properly formatted date string
            request['Requested Deadline'] = dateString
          }
        }
      }
    })

    return { requests, errors }
  } catch (error) {
    return { 
      requests: [], 
      errors: [`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`] 
    }
  }
}

// Parse Users sheet
export function parseUsersFromExcel(buffer: Buffer): { users: ExcelUserRow[], errors: string[] } {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    
    // Try to find Users sheet - prioritize new format
    const possibleUserSheetNames = ['NEW USERS ONLY', 'Users', 'users', 'User']
    const usersSheetName = possibleUserSheetNames.find(name => 
      workbook.SheetNames.includes(name)
    )
    
    if (!usersSheetName) {
      return { users: [], errors: [
        'No Users sheet found in the file',
        `Available sheets: ${workbook.SheetNames.join(', ')}`,
        'Expected sheet name: "NEW USERS ONLY" or "Users"'
      ] }
    }
    
    const worksheet = workbook.Sheets[usersSheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
    
    if (jsonData.length < 2) {
      return { users: [], errors: ['Users sheet must have at least header row and one data row'] }
    }
    
    const headers = jsonData[0] as string[]
    const dataRows = jsonData.slice(1).filter((row: any) => 
      Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && cell !== '')
    )
    
    const users: ExcelUserRow[] = dataRows.map((row: unknown) => {
      const rowArray = row as any[]
      const obj: any = {}
      headers.forEach((header, colIndex) => {
        obj[header] = rowArray[colIndex] || ''
      })
      return obj as ExcelUserRow
    })
    
    // Validation
    const errors: string[] = []
    const validRoles = ['Employee', 'Head', 'Admin']
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    users.forEach((user, index) => {
      const rowNum = index + 2
      
      if (!user['Full Name']?.trim()) {
        errors.push(`Row ${rowNum}: Full Name is required`)
      }
      
      if (!user.Email?.trim()) {
        errors.push(`Row ${rowNum}: Email is required`)
      } else if (!emailRegex.test(user.Email)) {
        errors.push(`Row ${rowNum}: Invalid email format`)
      }
      
      if (!user.Password?.trim()) {
        errors.push(`Row ${rowNum}: Password is required`)
      } else if (user.Password.length < 6) {
        errors.push(`Row ${rowNum}: Password must be at least 6 characters long`)
      }
      
      if (!user.Role?.trim()) {
        errors.push(`Row ${rowNum}: Role is required`)
      } else if (!validRoles.includes(user.Role)) {
        errors.push(`Row ${rowNum}: Role must be one of: ${validRoles.join(', ')}`)
      }
      
      // Validate Department Permissions format (optional field)
      if (user['Department Permissions']?.trim()) {
        const deptPermissions = user['Department Permissions'].trim()
        // Check for basic comma-separated format
        if (deptPermissions.includes(',,') || deptPermissions.startsWith(',') || deptPermissions.endsWith(',')) {
          errors.push(`Row ${rowNum}: Department Permissions format invalid - avoid empty departments or trailing commas`)
        }
        // Check for reasonable length (each department should be reasonable)
        const departments = deptPermissions.split(',').map(d => d.trim()).filter(d => d.length > 0)
        if (departments.some(dept => dept.length > 50)) {
          errors.push(`Row ${rowNum}: Department names in permissions should be 50 characters or less`)
        }
        if (departments.length > 20) {
          errors.push(`Row ${rowNum}: Too many department permissions (max 20 departments)`)
        }
      }
    })
    
    return { users, errors }
  } catch (error) {
    return { 
      users: [], 
      errors: [`Failed to parse Users sheet: ${error instanceof Error ? error.message : 'Unknown error'}`] 
    }
  }
}

// Parse Applications sheet
export function parseApplicationsFromExcel(buffer: Buffer): { applications: ExcelApplicationRow[], errors: string[] } {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    
    // Try to find Applications sheet - prioritize new format
    const possibleAppSheetNames = ['NEW APPLICATIONS ONLY', 'Applications', 'applications', 'Apps']
    const appsSheetName = possibleAppSheetNames.find(name => 
      workbook.SheetNames.includes(name)
    )
    
    if (!appsSheetName) {
      return { applications: [], errors: [
        'No Applications sheet found in the file',
        `Available sheets: ${workbook.SheetNames.join(', ')}`,
        'Expected sheet name: "NEW APPLICATIONS ONLY" or "Applications"'
      ] }
    }
    
    const worksheet = workbook.Sheets[appsSheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
    
    if (jsonData.length < 2) {
      return { applications: [], errors: ['Applications sheet must have at least header row and one data row'] }
    }
    
    const headers = jsonData[0] as string[]
    const dataRows = jsonData.slice(1).filter((row: any) => 
      Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && cell !== '')
    )
    
    const applications: ExcelApplicationRow[] = dataRows.map((row: unknown) => {
      const rowArray = row as any[]
      const obj: any = {}
      headers.forEach((header, colIndex) => {
        obj[header] = rowArray[colIndex] || ''
      })
      return obj as ExcelApplicationRow
    })
    
    // Validation
    const errors: string[] = []
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    applications.forEach((app, index) => {
      const rowNum = index + 2
      
      if (!app['Application Name']?.trim()) {
        errors.push(`Row ${rowNum}: Application Name is required`)
      }
      
      if (!app['Tech Lead Email']?.trim()) {
        errors.push(`Row ${rowNum}: Tech Lead Email is required`)
      } else if (!emailRegex.test(app['Tech Lead Email'])) {
        errors.push(`Row ${rowNum}: Invalid Tech Lead Email format`)
      }
    })
    
    return { applications, errors }
  } catch (error) {
    return { 
      applications: [], 
      errors: [`Failed to parse Applications sheet: ${error instanceof Error ? error.message : 'Unknown error'}`] 
    }
  }
}


// Export multi-entity data (admin only)
// Validation helpers for request types
export function validateRequestTypeConsistency(request: ExcelRequestRow, rowNum: number): string[] {
  const errors: string[] = []
  
  if (!request['Request Type']) {
    errors.push(`Row ${rowNum}: Request Type is required`)
    return errors
  }
  
  if (request['Request Type'] === 'Enhancement') {
    if (!request.Application?.trim()) {
      errors.push(`Row ${rowNum}: Application is required for Enhancement requests`)
    }
    if (request['Proposed Application Name']?.trim()) {
      errors.push(`Row ${rowNum}: Proposed Application Name should be empty for Enhancement requests`)
    }
  } else if (request['Request Type'] === 'New Application') {
    if (request.Application?.trim()) {
      errors.push(`Row ${rowNum}: Application should be empty for New Application requests`)
    }
    if (!request['Proposed Application Name']?.trim()) {
      errors.push(`Row ${rowNum}: Proposed Application Name is required for New Application requests`)
    }
  }
  
  return errors
}

export function convertRequestTypeToDatabase(requestType: string): 'enhancement' | 'new_application' | 'hardware' {
  if (requestType === 'Enhancement') return 'enhancement'
  if (requestType === 'Hardware') return 'hardware'
  return 'new_application'
}

export function convertRequestTypeToDisplay(requestType: 'enhancement' | 'new_application' | 'hardware'): string {
  if (requestType === 'enhancement') return 'Enhancement'
  if (requestType === 'hardware') return 'Hardware'
  return 'New Application'
}

/**
 * Statistical analysis helper functions
 */
function calculateWorkloadStats(requests: RequestWithDetails[], users: UserRecord[]) {
  const workloadMap = new Map<string, {
    user: UserRecord,
    totalRequests: number,
    inProgress: number,
    completed: number,
    overdue: number,
    completionRate: number
  }>()

  // Initialize all users
  users.forEach(user => {
    workloadMap.set(user.id, {
      user,
      totalRequests: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0,
      completionRate: 0
    })
  })

  // Calculate stats for each user
  requests.forEach(request => {
    const overdueInfo = getOverdueInfo(request)
    
    // Count for tech lead
    if (request.tech_lead_id) {
      const stats = workloadMap.get(request.tech_lead_id)
      if (stats) {
        stats.totalRequests++
        if (request.status === 'Closed') stats.completed++
        else if (['Initial Analysis', 'Code Review'].includes(request.status)) stats.inProgress++
        if (overdueInfo.isOverdue) stats.overdue++
      }
    }
    
    // Count for executor
    if (request.executor_id) {
      const stats = workloadMap.get(request.executor_id)
      if (stats) {
        stats.totalRequests++
        if (request.status === 'Closed') stats.completed++
        else if (['In Progress', 'Rework', 'Pending Deployment'].includes(request.status)) stats.inProgress++
        if (overdueInfo.isOverdue) stats.overdue++
      }
    }
  })

  // Calculate completion rates
  workloadMap.forEach(stats => {
    if (stats.totalRequests > 0) {
      stats.completionRate = (stats.completed / stats.totalRequests) * 100
    }
  })

  return Array.from(workloadMap.values())
}

function calculateStatusMetrics(requests: RequestWithDetails[]) {
  const statusCounts = new Map<string, number>()
  const statusAges = new Map<string, number[]>()
  
  requests.forEach(request => {
    const status = request.status
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1)
    
    // Calculate days in current status
    const daysInStatus = calculateDaysInStatus(request)
    if (!statusAges.has(status)) {
      statusAges.set(status, [])
    }
    statusAges.get(status)?.push(daysInStatus)
  })

  return {
    statusCounts,
    statusAverages: new Map(
      Array.from(statusAges.entries()).map(([status, ages]) => [
        status,
        ages.length > 0 ? Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length) : 0
      ])
    )
  }
}

function calculateTrendAnalysis(requests: RequestWithDetails[]) {
  const trends = {
    byMonth: new Map<string, number>(),
    byPriority: new Map<string, number>(),
    byType: new Map<string, number>(),
    byApplication: new Map<string, number>()
  }

  requests.forEach(request => {
    // Monthly trends
    if (request.created_at) {
      const month = new Date(request.created_at).toISOString().substring(0, 7) // YYYY-MM
      trends.byMonth.set(month, (trends.byMonth.get(month) || 0) + 1)
    }

    // Priority breakdown
    trends.byPriority.set(request.priority, (trends.byPriority.get(request.priority) || 0) + 1)

    // Request type breakdown
    const type = convertRequestTypeToDisplay(request.request_type)
    trends.byType.set(type, (trends.byType.get(type) || 0) + 1)

    // Application breakdown
    const appName = request.application?.name || 'New Application'
    trends.byApplication.set(appName, (trends.byApplication.get(appName) || 0) + 1)
  })

  return trends
}

export function exportMultiEntityToExcel(
  requests: RequestWithDetails[],
  applications: Application[],
  users: UserRecord[],
  departmentPermissions?: Map<string, string[]>
): Buffer {
  const workbook = XLSX.utils.book_new()

  // Create a map of user IDs to names for quick lookup
  const userIdToName = new Map(users.map(user => [user.id, user.full_name]))

  // Calculate comprehensive statistics
  const workloadStats = calculateWorkloadStats(requests, users)
  const statusMetrics = calculateStatusMetrics(requests)
  const trends = calculateTrendAnalysis(requests)
  const overdueRequests = getOverdueRequests(requests)

  // 1. SUMMARY DASHBOARD SHEET
  const summaryData = [
    ['SYSTEM OVERVIEW', '', ''],
    ['Total Requests', requests.length, ''],
    ['Total Users', users.length, ''],
    ['Total Applications', applications.length, ''],
    ['Export Date', new Date().toLocaleDateString(), new Date().toLocaleTimeString()],
    ['', '', ''],
    
    ['REQUEST STATUS BREAKDOWN', '', ''],
    ...Array.from(statusMetrics.statusCounts.entries()).map(([status, count]) => [
      status, count, `${((count / requests.length) * 100).toFixed(1)}%`
    ]),
    ['', '', ''],
    
    ['PRIORITY BREAKDOWN', '', ''],
    ...Array.from(trends.byPriority.entries()).map(([priority, count]) => [
      priority, count, `${((count / requests.length) * 100).toFixed(1)}%`
    ]),
    ['', '', ''],
    
    ['REQUEST TYPE ANALYSIS', '', ''],
    ...Array.from(trends.byType.entries()).map(([type, count]) => [
      type, count, `${((count / requests.length) * 100).toFixed(1)}%`
    ]),
    ['', '', ''],
    
    ['OVERDUE ANALYSIS', '', ''],
    ['Total Overdue', overdueRequests.length, `${((overdueRequests.length / requests.length) * 100).toFixed(1)}%`],
    ['Average Days Overdue', overdueRequests.length > 0 ? 
      Math.round(overdueRequests.reduce((sum, req) => sum + getDaysOverdue(req), 0) / overdueRequests.length) : 0, ''],
    ['Most Overdue', overdueRequests.length > 0 ? 
      Math.max(...overdueRequests.map(req => getDaysOverdue(req))) : 0, 'days'],
    ['', '', ''],
    
    ['TEAM WORKLOAD SUMMARY', '', ''],
    ['Total Active Heads', users.filter(u => u.role === 'Head').length, ''],
    ['Average Requests per Head', users.filter(u => u.role === 'Head').length > 0 ? 
      Math.round(requests.length / users.filter(u => u.role === 'Head').length) : 0, ''],
    ['Heads with Overdue Tasks', workloadStats.filter(w => w.user.role === 'Head' && w.overdue > 0).length, '']
  ]
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary Dashboard')

  // 2. ENHANCED REQUESTS SHEET (using the comprehensive format from Agent 1)
  const requestData = [
    [
      'ID', 'Subject', 'Description', 'Application', 'Priority', 'Request Type',
      'Proposed Application Name', 'Status', 'Days in Status', 'Total Age (Days)',
      'Requestor Name', 'Requestor Email', 'Tech Lead Name', 'Executor Name',
      'Current PIC', 'Requested Deadline', 'Internal Deadline', 'Adjusted Deadline',
      'Days Overdue', 'Overdue Status', 'Created Date', 'Created Time',
      'Last Updated Date', 'Last Updated Time', 'Tech Lead Notes', 'Assigned By',
      'Workflow Stage', 'Request Category'
    ],
    ...requests.map(request => {
      const overdueInfo = getOverdueInfo(request)
      const createdDateTime = formatDateTime(request.created_at)
      const updatedDateTime = formatDateTime(request.updated_at)
      const requestAge = request.created_at ? calculateDaysBetween(request.created_at, new Date().toISOString()) : 0
      const daysInStatus = calculateDaysInStatus(request)
      const currentPicName = getCurrentPicName(request)
      
      const workflowStage = (() => {
        switch (request.status) {
          case 'New':
          case 'Initial Analysis':
            return 'Planning'
          case 'Pending Assignment':
          case 'In Progress':
          case 'Rework':
          case 'Code Review':
            return 'Development'
          case 'Pending UAT':
            return 'Testing'
          case 'Pending Deployment':
            return 'Deployment'
          case 'Pending Clarification':
            return 'On Hold'
          case 'Closed':
            return 'Completed'
          case 'Rejected':
            return 'Cancelled'
          default:
            return 'Unknown'
        }
      })()
      
      return [
        request.id || '',
        request.subject || '',
        request.description || '',
        request.application?.name || '',
        request.priority || '',
        convertRequestTypeToDisplay(request.request_type),
        request.proposed_application_name || '',
        request.status || '',
        daysInStatus,
        requestAge,
        request.requestor?.full_name || '',
        request.requestor?.email || '',
        request.tech_lead?.full_name || '',
        request.executor?.full_name || '',
        currentPicName,
        request.requested_deadline || '',
        request.internal_deadline || '',
        request.adjusted_deadline || '',
        overdueInfo.daysOverdue,
        formatOverdueStatus(request),
        createdDateTime.date,
        createdDateTime.time,
        updatedDateTime.date,
        updatedDateTime.time,
        request.tech_lead_notes || '',
        request.assigned_by_user?.full_name || '',
        workflowStage,
        request.application ? 'Enhancement' : 'New System'
      ]
    })
  ]
  
  const requestsSheet = XLSX.utils.aoa_to_sheet(requestData)
  XLSX.utils.book_append_sheet(workbook, requestsSheet, 'Requests (Enhanced)')

  // 3. ENHANCED USERS SHEET
  const userData = [
    [
      'ID', 'Full Name', 'Email', 'Role', 'Department', 'Department Permissions', 'Skills',
      'Active Requests', 'In Progress', 'Completed', 'Overdue Tasks',
      'Completion Rate %', 'Workload Level', 'Created Date', 'Last Updated'
    ],
    ...workloadStats.map(stats => {
      const userDeptPermissions = departmentPermissions?.get(stats.user.id) || []
      return [
        stats.user.id || '',
        stats.user.full_name || '',
        stats.user.email || '',
        stats.user.role || '',
        stats.user.department || '',
        userDeptPermissions.join(', '),
        stats.user.skills?.join(', ') || '',
        stats.totalRequests,
        stats.inProgress,
        stats.completed,
        stats.overdue,
        stats.completionRate.toFixed(1),
        stats.totalRequests === 0 ? 'None' : 
          stats.totalRequests <= 3 ? 'Light' :
          stats.totalRequests <= 7 ? 'Medium' : 'Heavy',
        stats.user.created_at ? new Date(stats.user.created_at).toLocaleDateString() : '',
        stats.user.updated_at ? new Date(stats.user.updated_at).toLocaleDateString() : ''
      ]
    })
  ]
  
  const usersSheet = XLSX.utils.aoa_to_sheet(userData)
  XLSX.utils.book_append_sheet(workbook, usersSheet, 'Users (Enhanced)')

  // 4. ENHANCED APPLICATIONS SHEET
  const appData = [
    [
      'ID', 'Application Name', 'Tech Lead', 'Tech Lead Email', 'Description', 'Context',
      'Total Requests', 'Active Requests', 'Completed Requests', 'Overdue Requests',
      'Average Request Age', 'Complexity Score', 'Created Date', 'Last Updated'
    ],
    ...applications.map(app => {
      const appRequests = requests.filter(req => req.application_id === app.id)
      const activeRequests = appRequests.filter(req => !['Closed', 'Rejected'].includes(req.status))
      const completedRequests = appRequests.filter(req => req.status === 'Closed')
      const overdueAppRequests = appRequests.filter(req => getOverdueInfo(req).isOverdue)
      const avgAge = appRequests.length > 0 ? 
        Math.round(appRequests.reduce((sum, req) => {
          return sum + (req.created_at ? calculateDaysBetween(req.created_at, new Date().toISOString()) : 0)
        }, 0) / appRequests.length) : 0
      
      const techLead = users.find(u => u.id === app.tech_lead_id)
      
      // Simple complexity score based on request count and types
      const enhancementCount = appRequests.filter(req => req.request_type === 'enhancement').length
      const complexityScore = enhancementCount === 0 ? 'New' :
        enhancementCount <= 5 ? 'Simple' :
        enhancementCount <= 15 ? 'Moderate' : 'Complex'
      
      return [
        app.id || '',
        app.name || '',
        techLead?.full_name || '',
        techLead?.email || '',
        app.description || '',
        app.context || '',
        appRequests.length,
        activeRequests.length,
        completedRequests.length,
        overdueAppRequests.length,
        avgAge,
        complexityScore,
        app.created_at ? new Date(app.created_at).toLocaleDateString() : '',
        app.updated_at ? new Date(app.updated_at).toLocaleDateString() : ''
      ]
    })
  ]
  
  const appsSheet = XLSX.utils.aoa_to_sheet(appData)
  XLSX.utils.book_append_sheet(workbook, appsSheet, 'Applications (Enhanced)')

  // 5. TEAM PERFORMANCE SHEET
  const teamPerformanceData = [
    [
      'Team Member', 'Role', 'Department', 'Total Assigned', 'In Progress',
      'Completed', 'Overdue', 'Completion Rate %', 'Average Days per Task',
      'Current Workload', 'Performance Rating'
    ],
    ...workloadStats
      .filter(stats => stats.user.role === 'Head') // Focus on Heads for performance
      .sort((a, b) => b.totalRequests - a.totalRequests)
      .map(stats => {
        const avgDaysPerTask = stats.completed > 0 ? 
          Math.round(requests
            .filter(req => (req.tech_lead_id === stats.user.id || req.executor_id === stats.user.id) && req.status === 'Closed')
            .reduce((sum, req) => sum + (req.created_at ? calculateDaysBetween(req.created_at, req.updated_at || new Date().toISOString()) : 0), 0) / stats.completed) : 0
        
        const performanceRating = 
          stats.completionRate >= 80 && stats.overdue === 0 ? 'Excellent' :
          stats.completionRate >= 60 && stats.overdue <= 1 ? 'Good' :
          stats.completionRate >= 40 ? 'Average' : 'Needs Improvement'
        
        return [
          stats.user.full_name,
          stats.user.role,
          stats.user.department || 'N/A',
          stats.totalRequests,
          stats.inProgress,
          stats.completed,
          stats.overdue,
          stats.completionRate.toFixed(1),
          avgDaysPerTask,
          stats.inProgress > 5 ? 'High' : stats.inProgress > 2 ? 'Medium' : 'Low',
          performanceRating
        ]
      })
  ]
  
  const teamPerformanceSheet = XLSX.utils.aoa_to_sheet(teamPerformanceData)
  XLSX.utils.book_append_sheet(workbook, teamPerformanceSheet, 'Team Performance')

  // 6. WORKFLOW METRICS SHEET
  const workflowMetricsData = [
    ['WORKFLOW STAGE ANALYSIS', '', ''],
    ['Status', 'Count', 'Avg Days in Status', 'Overdue Count', 'Bottleneck Risk'],
    ...Array.from(statusMetrics.statusCounts.entries()).map(([status, count]) => {
      const avgDays = statusMetrics.statusAverages.get(status) || 0
      const overdueInStatus = requests.filter(req => req.status === status && getOverdueInfo(req).isOverdue).length
      const bottleneckRisk = avgDays > 7 ? 'High' : avgDays > 3 ? 'Medium' : 'Low'
      
      return [status, count, avgDays, overdueInStatus, bottleneckRisk]
    }),
    ['', '', '', '', ''],
    
    ['WORKFLOW EFFICIENCY METRICS', '', '', '', ''],
    ['Metric', 'Value', 'Target', 'Status', 'Notes'],
    ['Avg Request Lifecycle', 
      requests.length > 0 ? Math.round(requests.reduce((sum, req) => 
        sum + (req.created_at ? calculateDaysBetween(req.created_at, req.updated_at || new Date().toISOString()) : 0), 0) / requests.length) : 0,
      '< 30 days', '', 'Days from creation to completion'],
    ['Requests in Planning', statusMetrics.statusCounts.get('Initial Analysis') || 0, '< 20%', '', 'Should be processed quickly'],
    ['Requests in Development', 
      (statusMetrics.statusCounts.get('In Progress') || 0) + (statusMetrics.statusCounts.get('Code Review') || 0),
      '40-60%', '', 'Main development work'],
    ['Requests in Testing', statusMetrics.statusCounts.get('Pending UAT') || 0, '< 15%', '', 'User acceptance testing'],
    ['Completion Rate', 
      requests.length > 0 ? ((statusMetrics.statusCounts.get('Closed') || 0) / requests.length * 100).toFixed(1) : '0',
      '> 70%', '', 'Overall completion percentage']
  ]
  
  const workflowMetricsSheet = XLSX.utils.aoa_to_sheet(workflowMetricsData)
  XLSX.utils.book_append_sheet(workbook, workflowMetricsSheet, 'Workflow Metrics')

  // 7. OVERDUE ANALYSIS SHEET
  const overdueAnalysisData = [
    [
      'Request ID', 'Subject', 'Application', 'Status', 'Priority', 'Assigned To',
      'Days Overdue', 'Deadline Type', 'Original Deadline', 'Current PIC',
      'Escalation Level', 'Action Required'
    ],
    ...overdueRequests
      .sort((a, b) => getDaysOverdue(b) - getDaysOverdue(a))
      .map(request => {
        const overdueInfo = getOverdueInfo(request)
        const currentPic = getCurrentPicName(request)
        const escalationLevel = 
          overdueInfo.daysOverdue > 14 ? 'Critical' :
          overdueInfo.daysOverdue > 7 ? 'High' :
          overdueInfo.daysOverdue > 3 ? 'Medium' : 'Low'
        
        const actionRequired = 
          overdueInfo.daysOverdue > 14 ? 'Management Review Required' :
          overdueInfo.daysOverdue > 7 ? 'Immediate Action Needed' :
          overdueInfo.daysOverdue > 3 ? 'Follow-up Required' : 'Monitor Progress'
        
        return [
          request.id,
          request.subject,
          request.application?.name || 'New Application',
          request.status,
          request.priority,
          request.tech_lead?.full_name || request.executor?.full_name || 'Unassigned',
          overdueInfo.daysOverdue,
          overdueInfo.deadlineType,
          overdueInfo.deadline ? overdueInfo.deadline.toLocaleDateString() : '',
          currentPic,
          escalationLevel,
          actionRequired
        ]
      })
  ]
  
  const overdueAnalysisSheet = XLSX.utils.aoa_to_sheet(overdueAnalysisData)
  XLSX.utils.book_append_sheet(workbook, overdueAnalysisSheet, 'Overdue Analysis')

  // 8. SYSTEM HEALTH SHEET
  const systemHealthData = [
    ['SYSTEM HEALTH CHECKS', '', ''],
    ['Check', 'Status', 'Details'],
    
    // Data integrity checks
    ['Requests without Tech Lead', 
      requests.filter(req => !req.tech_lead_id && req.status !== 'New').length,
      requests.filter(req => !req.tech_lead_id && req.status !== 'New').length === 0 ? 'OK' : 'ATTENTION NEEDED'],
    
    ['Requests without Executor (In Progress)', 
      requests.filter(req => !req.executor_id && ['In Progress', 'Rework'].includes(req.status)).length,
      requests.filter(req => !req.executor_id && ['In Progress', 'Rework'].includes(req.status)).length === 0 ? 'OK' : 'ACTION REQUIRED'],
    
    ['Enhancement Requests without Application', 
      requests.filter(req => req.request_type === 'enhancement' && !req.application_id).length,
      requests.filter(req => req.request_type === 'enhancement' && !req.application_id).length === 0 ? 'OK' : 'DATA ERROR'],
    
    ['New App Requests without Proposed Name', 
      requests.filter(req => req.request_type === 'new_application' && !req.proposed_application_name?.trim()).length,
      requests.filter(req => req.request_type === 'new_application' && !req.proposed_application_name?.trim()).length === 0 ? 'OK' : 'DATA ERROR'],
    
    ['Hardware Requests without Item Name', 
      requests.filter(req => req.request_type === 'hardware' && !req.proposed_application_name?.trim()).length,
      requests.filter(req => req.request_type === 'hardware' && !req.proposed_application_name?.trim()).length === 0 ? 'OK' : 'DATA ERROR'],
    
    // Workflow consistency checks
    ['Stuck in New Status (>7 days)', 
      requests.filter(req => req.status === 'New' && req.created_at && 
        calculateDaysBetween(req.created_at, new Date().toISOString()) > 7).length,
      requests.filter(req => req.status === 'New' && req.created_at && 
        calculateDaysBetween(req.created_at, new Date().toISOString()) > 7).length === 0 ? 'OK' : 'REVIEW NEEDED'],
    
    ['Long-running Initial Analysis (>5 days)', 
      requests.filter(req => req.status === 'Initial Analysis' && 
        calculateDaysInStatus(req) > 5).length,
      requests.filter(req => req.status === 'Initial Analysis' && 
        calculateDaysInStatus(req) > 5).length === 0 ? 'OK' : 'FOLLOW UP'],
    
    ['Stalled Code Reviews (>3 days)', 
      requests.filter(req => req.status === 'Code Review' && 
        calculateDaysInStatus(req) > 3).length,
      requests.filter(req => req.status === 'Code Review' && 
        calculateDaysInStatus(req) > 3).length === 0 ? 'OK' : 'EXPEDITE'],
    
    ['Pending UAT (>7 days)', 
      requests.filter(req => req.status === 'Pending UAT' && 
        calculateDaysInStatus(req) > 7).length,
      requests.filter(req => req.status === 'Pending UAT' && 
        calculateDaysInStatus(req) > 7).length === 0 ? 'OK' : 'CUSTOMER FOLLOW UP'],
    
    ['', '', ''],
    ['WORKLOAD DISTRIBUTION', '', ''],
    ['PICs with No Active Requests', 
      users.filter(u => u.role === 'Head' && !requests.some(req => 
        req.tech_lead_id === u.id || req.executor_id === u.id)).length,
      'Available for assignment'],
    
    ['PICs with Heavy Workload (>10 requests)', 
      workloadStats.filter(w => w.user.role === 'Head' && w.totalRequests > 10).length,
      workloadStats.filter(w => w.user.role === 'Head' && w.totalRequests > 10).length === 0 ? 'BALANCED' : 'CONSIDER REDISTRIBUTION'],
    
    ['Applications without Tech Lead', 
      applications.filter(app => !app.tech_lead_id).length,
      applications.filter(app => !app.tech_lead_id).length === 0 ? 'OK' : 'ASSIGN TECH LEADS'],
    
    ['', '', ''],
    ['SYSTEM RECOMMENDATIONS', '', ''],
    ['Priority', 'Recommendation', 'Impact'],
    ...(() => {
      const recommendations = []
      
      if (overdueRequests.length > requests.length * 0.2) {
        recommendations.push(['HIGH', 'Review overdue requests - exceeds 20% threshold', 'CUSTOMER SATISFACTION'])
      }
      
      if (statusMetrics.statusCounts.get('New') || 0 > 5) {
        recommendations.push(['MEDIUM', 'Process New requests - backlog building up', 'WORKFLOW EFFICIENCY'])
      }
      
      const heavyWorkloadUsers = workloadStats.filter(w => w.user.role === 'Head' && w.totalRequests > 10).length
      if (heavyWorkloadUsers > 0) {
        recommendations.push(['MEDIUM', 'Balance workload - some PICs overloaded', 'TEAM EFFICIENCY'])
      }
      
      if (recommendations.length === 0) {
        recommendations.push(['LOW', 'System operating normally', 'MAINTENANCE'])
      }
      
      return recommendations
    })()
  ]
  
  const systemHealthSheet = XLSX.utils.aoa_to_sheet(systemHealthData)
  XLSX.utils.book_append_sheet(workbook, systemHealthSheet, 'System Health')

  // Auto-size columns for better readability
  const sheets = [
    { sheet: summarySheet, maxWidth: 30 },
    { sheet: requestsSheet, maxWidth: 50 },
    { sheet: usersSheet, maxWidth: 40 },
    { sheet: appsSheet, maxWidth: 40 },
    { sheet: teamPerformanceSheet, maxWidth: 35 },
    { sheet: workflowMetricsSheet, maxWidth: 35 },
    { sheet: overdueAnalysisSheet, maxWidth: 40 },
    { sheet: systemHealthSheet, maxWidth: 50 }
  ]

  sheets.forEach(({ sheet, maxWidth }) => {
    if (sheet && sheet['!ref']) {
      const range = XLSX.utils.decode_range(sheet['!ref'])
      const colWidths = []
      
      for (let col = range.s.c; col <= range.e.c; col++) {
        let maxLength = 10
        for (let row = range.s.r; row <= range.e.r; row++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
          const cell = sheet[cellAddress]
          if (cell && cell.v) {
            const length = String(cell.v).length
            maxLength = Math.max(maxLength, length)
          }
        }
        colWidths.push({ wch: Math.min(maxLength + 2, maxWidth) })
      }
      
      sheet['!cols'] = colWidths
    }
  })

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}
