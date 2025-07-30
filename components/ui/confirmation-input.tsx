"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface ConfirmationInputProps {
  label: string
  confirmText: string
  placeholder?: string
  onConfirmationChange: (isConfirmed: boolean) => void
  className?: string
}

export function ConfirmationInput({ 
  label, 
  confirmText, 
  placeholder, 
  onConfirmationChange,
  className 
}: ConfirmationInputProps) {
  const [inputValue, setInputValue] = useState("")
  const isConfirmed = inputValue === confirmText

  const handleInputChange = (value: string) => {
    setInputValue(value)
    onConfirmationChange(value === confirmText)
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium text-gray-900">
        {label}
      </Label>
      <div className="space-y-2">
        <div className="p-3 bg-gray-50 rounded-md border">
          <code className="text-sm font-mono text-gray-800">{confirmText}</code>
        </div>
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder || `Type "${confirmText}" to confirm`}
          className={cn(
            "transition-colors",
            isConfirmed 
              ? "border-green-500 focus:border-green-500 focus:ring-green-500" 
              : inputValue.length > 0 
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : ""
          )}
        />
        {inputValue.length > 0 && !isConfirmed && (
          <p className="text-xs text-red-600">
            Text doesn't match. Please type exactly: "{confirmText}"
          </p>
        )}
        {isConfirmed && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            ✓ Confirmation verified
          </p>
        )}
      </div>
    </div>
  )
}