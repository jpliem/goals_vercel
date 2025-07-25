"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ChevronDown, Check } from "lucide-react"

export interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectFilterProps {
  options: MultiSelectOption[]
  selected: string[]
  onSelectionChange: (selected: string[]) => void
  placeholder: string
  allLabel: string
  className?: string
  width?: string
}

export function MultiSelectFilter({
  options,
  selected,
  onSelectionChange,
  placeholder,
  allLabel,
  className = "",
  width = "w-[130px]"
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false)

  const isAllSelected = selected.includes("all")
  const selectedCount = isAllSelected ? 0 : selected.length

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(["all"])
    } else {
      onSelectionChange([])
    }
  }

  const handleToggleOption = (value: string, checked: boolean) => {
    if (value === "all") {
      handleToggleAll(checked)
      return
    }

    let newSelected: string[]
    
    if (isAllSelected) {
      // If "all" is selected, start fresh with just this option
      newSelected = checked ? [value] : []
    } else {
      // Normal multi-select behavior
      if (checked) {
        newSelected = [...selected, value]
      } else {
        newSelected = selected.filter(s => s !== value)
      }
    }

    // If no options selected, default to "all"
    if (newSelected.length === 0) {
      newSelected = ["all"]
    }

    onSelectionChange(newSelected)
  }

  const getDisplayText = () => {
    if (isAllSelected) {
      return allLabel
    }
    if (selectedCount === 0) {
      return placeholder
    }
    if (selectedCount === 1) {
      const singleOption = options.find(opt => selected.includes(opt.value))
      return singleOption?.label || `${selectedCount} selected`
    }
    return `${selectedCount} selected`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`${width} h-9 justify-between font-normal ${className}`}
        >
          <span className="truncate">{getDisplayText()}</span>
          <div className="flex items-center gap-1">
            {!isAllSelected && selectedCount > 0 && (
              <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                {selectedCount}
              </Badge>
            )}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className={`${width} p-0`} align="start">
        <div className="max-h-64 overflow-y-auto">
          {/* All option */}
          <div className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={handleToggleAll}
              id="all-option"
            />
            <label
              htmlFor="all-option"
              className="text-sm font-medium cursor-pointer flex-1"
            >
              {allLabel}
            </label>
            {isAllSelected && <Check className="h-3 w-3 text-green-600" />}
          </div>

          {/* Individual options */}
          {options.map((option) => {
            const isChecked = !isAllSelected && selected.includes(option.value)
            return (
              <div
                key={option.value}
                className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(checked) => handleToggleOption(option.value, checked as boolean)}
                  id={`option-${option.value}`}
                />
                <label
                  htmlFor={`option-${option.value}`}
                  className="text-sm cursor-pointer flex-1"
                >
                  {option.label}
                </label>
                {isChecked && <Check className="h-3 w-3 text-green-600" />}
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}