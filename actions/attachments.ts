"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth"
import { uploadToSupabaseStorage, deleteFromStorage } from "@/lib/storage"
import { uploadRequestAttachment as saveAttachmentToDatabase, deleteAttachment, getRequestAttachments } from "@/lib/database"

export async function uploadRequestAttachment(formData: FormData) {
  try {
    const user = await requireAuth()
    
    const requestId = formData.get("requestId") as string
    const file = formData.get("file") as File

    if (!requestId || !file) {
      return { error: "Request ID and file are required" }
    }

    // Upload file to storage
    const uploadResult = await uploadToSupabaseStorage(file, 'request-attachments', requestId)
    
    if (!uploadResult.success) {
      return { error: uploadResult.error }
    }

    // Save attachment record to database
    const attachmentData = {
      request_id: requestId,
      filename: file.name,
      file_path: uploadResult.url!,
      file_size: file.size,
      content_type: file.type,
      uploaded_by: user.id
    }

    const { data, error } = await saveAttachmentToDatabase(attachmentData)
    
    if (error) {
      // If database save fails, try to clean up storage
      try {
        await deleteFromStorage(uploadResult.filename!, 'request-attachments')
      } catch (cleanupError) {
        console.error('Failed to cleanup storage after database error:', cleanupError)
      }
      return { error: "Failed to save attachment record" }
    }

    // Revalidate the request page to show new attachment
    revalidatePath(`/requests/${requestId}`)
    revalidatePath("/dashboard")

    return { 
      success: true, 
      data: data,
      message: "File uploaded successfully" 
    }
  } catch (error) {
    console.error("Upload attachment error:", error)
    return { error: "Failed to upload attachment" }
  }
}

export async function deleteRequestAttachment(attachmentId: string) {
  try {
    const user = await requireAuth()
    
    // Get attachment details to check permissions and get file path
    const attachments = await getRequestAttachments(attachmentId)
    const attachment = attachments.find(a => a.id === attachmentId)
    
    if (!attachment) {
      return { error: "Attachment not found" }
    }

    // Check permissions - only uploader, admin, or request stakeholders can delete
    if (attachment.uploaded_by !== user.id && user.role !== "Admin") {
      return { error: "You don't have permission to delete this attachment" }
    }

    // Delete from database first
    const { error: dbError } = await deleteAttachment(attachmentId)
    
    if (dbError) {
      return { error: "Failed to delete attachment record" }
    }

    // Try to delete from storage (don't fail if this fails)
    try {
      // Extract the file path properly - files are stored as requestId/filename
      const pathParts = (attachment.file_path as string).split('/')
      const filename = pathParts.pop() // Get filename
      const folder = attachment.request_id // Use request_id as folder
      const fullPath = `${folder}/${filename}`
      
      if (filename && folder) {
        await deleteFromStorage(fullPath, 'request-attachments')
      }
    } catch (storageError) {
      console.error('Failed to delete from storage:', storageError)
      // Don't return error here - database deletion succeeded
    }

    // Revalidate pages
    revalidatePath(`/requests/${attachment.request_id}`)
    revalidatePath("/dashboard")

    return { 
      success: true,
      message: "Attachment deleted successfully" 
    }
  } catch (error) {
    console.error("Delete attachment error:", error)
    return { error: "Failed to delete attachment" }
  }
}

export async function getAttachmentsForRequest(requestId: string) {
  try {
    const user = await requireAuth()
    
    const attachments = await getRequestAttachments(requestId)
    
    return { 
      success: true, 
      data: attachments 
    }
  } catch (error) {
    console.error("Get attachments error:", error)
    return { 
      error: "Failed to load attachments",
      data: []
    }
  }
}

// Upload multiple files at once
export async function uploadMultipleAttachments(formData: FormData) {
  try {
    const user = await requireAuth()
    
    const requestId = formData.get("requestId") as string
    
    if (!requestId) {
      return { error: "Request ID is required" }
    }

    const results = []
    const errors = []

    // Get all files from form data
    const files = formData.getAll("files") as File[]
    
    if (files.length === 0) {
      return { error: "No files provided" }
    }

    // Upload each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      try {
        // Upload file to storage
        const uploadResult = await uploadToSupabaseStorage(file, 'request-attachments', requestId)
        
        if (!uploadResult.success) {
          errors.push(`${file.name}: ${uploadResult.error}`)
          continue
        }

        // Save attachment record to database
        const attachmentData = {
          request_id: requestId,
          filename: file.name,
          file_path: uploadResult.url!,
          file_size: file.size,
          content_type: file.type,
          uploaded_by: user.id
        }

        const { data, error } = await saveAttachmentToDatabase(attachmentData)
        
        if (error) {
          errors.push(`${file.name}: Failed to save attachment record`)
          // Try to cleanup storage
          try {
            await deleteFromStorage(uploadResult.filename!, 'request-attachments')
          } catch (cleanupError) {
            console.error('Failed to cleanup storage:', cleanupError)
          }
          continue
        }

        results.push(data)
      } catch (error) {
        errors.push(`${file.name}: Unexpected error during upload`)
      }
    }

    // Revalidate pages
    revalidatePath(`/requests/${requestId}`)
    revalidatePath("/dashboard")

    return {
      success: true,
      data: results,
      uploadedCount: results.length,
      totalCount: files.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully uploaded ${results.length} of ${files.length} files`
    }
  } catch (error) {
    console.error("Multiple upload error:", error)
    return { error: "Failed to upload files" }
  }
}
