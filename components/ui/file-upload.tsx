"use client"

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { X, Upload, Image as ImageIcon, FileImage, FileText, FileSpreadsheet, File } from 'lucide-react'
import { validateImageFile, validateFile } from '@/lib/storage'

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void
  maxFiles?: number
  disabled?: boolean
  existingFiles?: File[]
  showPreview?: boolean
  className?: string
  imageOnly?: boolean // New prop to restrict to images only
}

export function FileUpload({
  onFilesSelected,
  maxFiles = 5,
  disabled = false,
  existingFiles = [],
  showPreview = true,
  className = '',
  imageOnly = false
}: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>(existingFiles)
  const [dragActive, setDragActive] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateAndAddFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const newErrors: string[] = []
    const validFiles: File[] = []

    // Check total file count
    if (selectedFiles.length + fileArray.length > maxFiles) {
      newErrors.push(`Cannot upload more than ${maxFiles} files`)
      setErrors(newErrors)
      return
    }

    // Validate each file
    fileArray.forEach((file, index) => {
      const validation = imageOnly ? validateImageFile(file) : validateFile(file, false)
      if (validation.valid) {
        validFiles.push(file)
      } else {
        newErrors.push(`File ${file.name}: ${validation.error}`)
      }
    })

    if (newErrors.length > 0) {
      setErrors(newErrors)
      return
    }

    // Update selected files
    const updatedFiles = [...selectedFiles, ...validFiles]
    setSelectedFiles(updatedFiles)
    setErrors([])
    onFilesSelected(updatedFiles)
  }, [selectedFiles, maxFiles, onFilesSelected])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (disabled) return

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const removeFile = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index)
    setSelectedFiles(updatedFiles)
    setErrors([])
    onFilesSelected(updatedFiles)
  }

  const clearAllFiles = () => {
    setSelectedFiles([])
    setErrors([])
    onFilesSelected([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const getFileIcon = (file: File) => {
    const type = file.type.toLowerCase()
    if (type.startsWith('image/')) return '🖼️'
    if (type.includes('pdf')) return '📄'
    if (type.includes('word') || type.includes('document')) return '📝'
    if (type.includes('sheet') || type.includes('excel')) return '📊'
    if (type.includes('text') || type.includes('plain')) return '📋'
    if (type.includes('csv')) return '📊'
    return '📎'
  }

  const getFileIconComponent = (file: File) => {
    const type = file.type.toLowerCase()
    if (type.includes('pdf')) return FileText
    if (type.includes('word') || type.includes('document')) return FileText
    if (type.includes('sheet') || type.includes('excel')) return FileSpreadsheet
    if (type.includes('text') || type.includes('plain')) return FileText
    if (type.includes('csv')) return FileSpreadsheet
    return File
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <Card
        className={`
          border-2 border-dashed transition-colors cursor-pointer
          ${dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : disabled 
              ? 'border-gray-200 bg-gray-50' 
              : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={!disabled ? openFileDialog : undefined}
      >
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className={`p-4 rounded-full ${dragActive ? 'bg-blue-100' : 'bg-gray-100'}`}>
              <Upload className={`h-8 w-8 ${dragActive ? 'text-blue-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">
                {dragActive ? 'Drop files here' : imageOnly ? 'Upload Images' : 'Upload Files'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Drag and drop {imageOnly ? 'images' : 'files'} here, or click to select
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {imageOnly 
                  ? 'JPEG, PNG, GIF, WebP • Max 2MB per file'
                  : 'Images (2MB) • Documents: PDF, Word, Excel, TXT, CSV (10MB)'} • Up to {maxFiles} files
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation()
                openFileDialog()
              }}
            >
              {imageOnly ? <ImageIcon className="h-4 w-4 mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Choose {imageOnly ? 'Images' : 'Files'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={imageOnly 
          ? "image/jpeg,image/jpg,image/png,image/gif,image/webp"
          : "image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv,application/csv"
        }
        multiple
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />

      {/* Error Messages */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* File Preview */}
      {showPreview && selectedFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm">Selected Files ({selectedFiles.length})</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAllFiles}
                disabled={disabled}
              >
                Clear All
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {selectedFiles.map((file, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                    {file.type.startsWith('image/') ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-full object-cover"
                        onLoad={() => URL.revokeObjectURL(URL.createObjectURL(file))}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {(() => {
                          const IconComponent = getFileIconComponent(file)
                          return <IconComponent className="h-8 w-8 text-gray-400" />
                        })()}
                      </div>
                    )}
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1 truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
