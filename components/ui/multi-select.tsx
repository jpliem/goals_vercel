"use client"

import { useState, useRef, useEffect } from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onSelectedChange: (selected: string[]) => void
  placeholder?: string
  className?: string
}

export function MultiSelect({ 
  options, 
  selected, 
  onSelectedChange, 
  placeholder = "Select items...",
  className = ""
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(search.toLowerCase())
  )

  const handleToggleOption = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter(item => item !== value)
      : [...selected, value]
    onSelectedChange(newSelected)
  }

  const handleRemoveSelected = (value: string) => {
    onSelectedChange(selected.filter(item => item !== value))
  }

  const selectedLabels = options.filter(option => selected.includes(option.value))

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between min-h-[36px] h-auto"
      >
        <div className="flex flex-wrap gap-1">
          {selectedLabels.length === 0 ? (
            <span className="text-gray-500">{placeholder}</span>
          ) : selectedLabels.length <= 2 ? (
            selectedLabels.map(option => (
              <Badge key={option.value} variant="secondary" className="text-xs">
                {option.label}
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer hover:text-red-500"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveSelected(option.value)
                  }}
                />
              </Badge>
            ))
          ) : (
            <Badge variant="secondary" className="text-xs">
              {selectedLabels.length} selected
            </Badge>
          )}
        </div>
        <ChevronDown className="h-4 w-4 shrink-0" />
      </Button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="p-1">
            {filteredOptions.length === 0 ? (
              <div className="p-2 text-sm text-gray-500">No options found</div>
            ) : (
              filteredOptions.map(option => (
                <div
                  key={option.value}
                  className="flex items-center px-2 py-1.5 hover:bg-gray-100 cursor-pointer rounded"
                  onClick={() => handleToggleOption(option.value)}
                >
                  <div className="flex items-center justify-center w-4 h-4 mr-2 border border-gray-300 rounded">
                    {selected.includes(option.value) && (
                      <Check className="h-3 w-3 text-blue-600" />
                    )}
                  </div>
                  <span className="text-sm">{option.label}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
