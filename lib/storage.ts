// Import the whole module to get fresh supabaseAdmin reference
import * as database from './database'

export interface UploadResult {
  success: boolean
  url?: string
  filename?: string
  error?: string
}

// Validate file type and size for images
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  const maxSize = 2 * 1024 * 1024 // 2MB per file (to stay well under server action limit)

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload JPEG, PNG, GIF, or WebP images only.'
    }
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Please upload images smaller than 2MB.'
    }
  }

  return { valid: true }
}

// Validate file type and size for general files (images and documents)
export function validateFile(file: File, imageOnly: boolean = false): { valid: boolean; error?: string } {
  // If imageOnly, use the existing image validation
  if (imageOnly) {
    return validateImageFile(file)
  }

  // Allowed file types for general uploads
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  const allowedDocumentTypes = [
    'application/pdf',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'text/plain', // .txt
    'text/csv', // .csv
    'application/csv', // .csv (alternative mime type)
  ]
  
  const allowedTypes = [...allowedImageTypes, ...allowedDocumentTypes]
  
  // Different size limits for different file types
  const isImage = allowedImageTypes.includes(file.type)
  const maxSize = isImage ? 2 * 1024 * 1024 : 10 * 1024 * 1024 // 2MB for images, 10MB for documents

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload images (JPEG, PNG, GIF, WebP) or documents (PDF, Word, Excel, TXT, CSV) only.'
    }
  }

  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024)
    return {
      valid: false,
      error: `File too large. Please upload ${isImage ? 'images' : 'documents'} smaller than ${maxSizeMB}MB.`
    }
  }

  return { valid: true }
}

// Generate unique filename with timestamp
export function generateUniqueFilename(originalFilename: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2)
  const extension = originalFilename.split('.').pop()
  const nameWithoutExt = originalFilename.replace(/\.[^/.]+$/, '')
  
  return `${nameWithoutExt}_${timestamp}_${random}.${extension}`
}

// Upload file to Supabase storage
export async function uploadToSupabaseStorage(
  file: File,
  bucket: string = 'request-attachments',
  folder?: string,
  imageOnly: boolean = false
): Promise<UploadResult> {
  try {
    // Get fresh reference to supabaseAdmin
    const supabaseAdmin = database.supabaseAdmin
    if (!supabaseAdmin) {
      return {
        success: false,
        error: 'Storage service not available. Please configure Supabase connection.'
      }
    }

    // Validate the file
    const validation = validateFile(file, imageOnly)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      }
    }

    // Generate unique filename
    const uniqueFilename = generateUniqueFilename(file.name)
    const filePath = folder ? `${folder}/${uniqueFilename}` : uniqueFilename

    // Upload file to Supabase storage
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Supabase storage upload error:', error)
      return {
        success: false,
        error: 'Failed to upload file to storage'
      }
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return {
      success: true,
      url: publicUrl,
      filename: uniqueFilename
    }
  } catch (error) {
    console.error('Upload error:', error)
    return {
      success: false,
      error: 'Unexpected error during file upload'
    }
  }
}

// Get signed URL for private files (if needed)
export async function getSignedUrl(
  filePath: string,
  bucket: string = 'request-attachments',
  expiresIn: number = 3600
): Promise<{ url?: string; error?: string }> {
  try {
    const supabaseAdmin = database.supabaseAdmin
    if (!supabaseAdmin) {
      return { error: 'Storage service not available' }
    }

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn)

    if (error) {
      console.error('Error creating signed URL:', error)
      return { error: 'Failed to create signed URL' }
    }

    return { url: data.signedUrl }
  } catch (error) {
    console.error('Signed URL error:', error)
    return { error: 'Unexpected error creating signed URL' }
  }
}

// Delete file from storage
export async function deleteFromStorage(
  filePath: string,
  bucket: string = 'request-attachments'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseAdmin = database.supabaseAdmin
    if (!supabaseAdmin) {
      return {
        success: false,
        error: 'Storage service not available'
      }
    }

    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([filePath])

    if (error) {
      console.error('Storage delete error:', error)
      return {
        success: false,
        error: 'Failed to delete file from storage'
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Delete error:', error)
    return {
      success: false,
      error: 'Unexpected error during file deletion'
    }
  }
}
