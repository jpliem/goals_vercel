import crypto from 'crypto'
import type { RequestWithDetails } from './database'
import type { ExcelRequestRow } from './excel-utils'

export interface DuplicateMatch {
  importRow: ExcelRequestRow & { rowIndex: number }
  existingRequest: RequestWithDetails
  matchType: 'exact' | 'similar'
  similarity: number
  reason: string
}

export interface DuplicateDetectionResult {
  duplicates: DuplicateMatch[]
  uniqueRequests: (ExcelRequestRow & { rowIndex: number })[]
}

// Generate a hash for exact duplicate detection
function generateRequestHash(subject: string, application: string, requestorEmail: string): string {
  // Safely handle undefined/null values
  const normalizedSubject = (subject || '').trim().toLowerCase()
  const normalizedApplication = (application || '').trim().toLowerCase()
  const normalizedRequestorEmail = (requestorEmail || '').trim().toLowerCase()
  
  // Don't create hashes for rows with blank subjects - treat them as unique
  if (!normalizedSubject) {
    // Return a unique hash for each blank subject to prevent false duplicates
    return `blank_subject_${crypto.randomUUID()}`
  }
  
  const normalizedKey = [
    normalizedSubject,
    normalizedApplication, 
    normalizedRequestorEmail
  ].join('|')
  
  return crypto.createHash('md5').update(normalizedKey).digest('hex')
}

// Calculate similarity between two strings using Levenshtein distance
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()
  
  if (s1 === s2) return 1
  if (s1.length === 0 || s2.length === 0) return 0

  const matrix = []
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  const maxLength = Math.max(s1.length, s2.length)
  return (maxLength - matrix[s2.length][s1.length]) / maxLength
}

// Calculate overall similarity between two requests
function calculateRequestSimilarity(
  importRow: ExcelRequestRow,
  existingRequest: RequestWithDetails
): { similarity: number; reason: string } {
  const subjectSim = calculateSimilarity(importRow.Subject || '', existingRequest.subject || '')
  const descSim = calculateSimilarity(importRow.Description || '', existingRequest.description || '')
  const appMatch = (importRow.Application || '').toLowerCase().trim() === (existingRequest.application?.name || '').toLowerCase().trim()
  
  // Handle requestor email - this field may not exist in all Excel formats
  const importEmail = (importRow as any)['Requestor Email'] || ''
  const emailMatch = importEmail.toLowerCase().trim() === (existingRequest.requestor.email || '').toLowerCase().trim()

  // Weighted similarity calculation
  const weights = {
    subject: 0.3,
    description: 0.3,
    application: 0.2,
    email: 0.2
  }

  const similarity = 
    (subjectSim * weights.subject) +
    (descSim * weights.description) +
    (appMatch ? 1 : 0) * weights.application +
    (emailMatch ? 1 : 0) * weights.email

  // Generate reason for similarity
  let reasons = []
  if (subjectSim > 0.8) reasons.push(`similar subject (${Math.round(subjectSim * 100)}%)`)
  if (descSim > 0.7) reasons.push(`similar description (${Math.round(descSim * 100)}%)`)
  if (appMatch) reasons.push('same application')
  if (emailMatch) reasons.push('same requestor')

  const reason = reasons.length > 0 ? reasons.join(', ') : 'low similarity'

  return { similarity, reason }
}

export function detectDuplicates(
  importRequests: ExcelRequestRow[],
  existingRequests: RequestWithDetails[],
  exactThreshold: number = 1.0,
  similarityThreshold: number = 0.8
): DuplicateDetectionResult {
  const duplicates: DuplicateMatch[] = []
  const uniqueRequests: (ExcelRequestRow & { rowIndex: number })[] = []

  // Create hash map of existing requests for exact duplicate detection
  const existingHashes = new Map<string, RequestWithDetails>()
  existingRequests.forEach(request => {
    const hash = generateRequestHash(
      request.subject,
      request.application?.name || '',
      request.requestor.email
    )
    existingHashes.set(hash, request)
  })

  importRequests.forEach((importRow, index) => {
    const rowIndex = index + 2 // +2 for Excel row number (header + 0-based index)
    const importRowWithIndex = { ...importRow, rowIndex }

    // Check for exact duplicates first
    const importHash = generateRequestHash(
      importRow.Subject || '',
      importRow.Application || '',
      (importRow as any)['Requestor Email'] || ''
    )

    const exactMatch = existingHashes.get(importHash)
    if (exactMatch) {
      duplicates.push({
        importRow: importRowWithIndex,
        existingRequest: exactMatch,
        matchType: 'exact',
        similarity: 1.0,
        reason: 'exact match (same subject, application, and requestor)'
      })
      return
    }

    // Check for similar duplicates
    let bestMatch: { request: RequestWithDetails; similarity: number; reason: string } | null = null

    for (const existingRequest of existingRequests) {
      const { similarity, reason } = calculateRequestSimilarity(importRow, existingRequest)
      
      if (similarity >= similarityThreshold) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { request: existingRequest, similarity, reason }
        }
      }
    }

    if (bestMatch) {
      duplicates.push({
        importRow: importRowWithIndex,
        existingRequest: bestMatch.request,
        matchType: 'similar',
        similarity: bestMatch.similarity,
        reason: bestMatch.reason
      })
    } else {
      uniqueRequests.push(importRowWithIndex)
    }
  })

  return { duplicates, uniqueRequests }
}

// Check for duplicates within the import batch itself
export function detectInternalDuplicates(
  importRequests: ExcelRequestRow[]
): { duplicates: Array<{ rows: number[]; reason: string }>; unique: ExcelRequestRow[] } {
  const hashGroups = new Map<string, number[]>()
  const processed = new Set<number>()
  const duplicateGroups: Array<{ rows: number[]; reason: string }> = []

  // Group by hash
  importRequests.forEach((request, index) => {
    const hash = generateRequestHash(
      request.Subject || '',
      request.Application || '',
      (request as any)['Requestor Email'] || ''
    )
    
    if (!hashGroups.has(hash)) {
      hashGroups.set(hash, [])
    }
    hashGroups.get(hash)!.push(index + 2) // +2 for Excel row number
  })

  // Find duplicates
  hashGroups.forEach((rowIndexes, hash) => {
    if (rowIndexes.length > 1) {
      duplicateGroups.push({
        rows: rowIndexes,
        reason: 'identical subject, application, and requestor within import file'
      })
      rowIndexes.forEach(rowIndex => processed.add(rowIndex - 2))
    }
  })

  // Return unique requests (those not marked as duplicates)
  const unique = importRequests.filter((_, index) => !processed.has(index))

  return { duplicates: duplicateGroups, unique }
}
