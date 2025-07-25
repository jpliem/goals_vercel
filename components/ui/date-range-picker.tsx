"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, X } from "lucide-react"

interface DateRange {
  from: string
  to: string
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  placeholder?: string
  className?: string
}

export function DateRangePicker({ 
  value, 
  onChange, 
  placeholder = "Select date range...",
  className = ""
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleFromChange = (date: string) => {
    onChange({ ...value, from: date })
  }

  const handleToChange = (date: string) => {
    onChange({ ...value, to: date })
  }

  const handleClear = () => {
    onChange({ from: "", to: "" })
  }

  const formatDateRange = () => {
    if (!value.from && !value.to) return placeholder
    if (value.from && !value.to) return `From ${new Date(value.from).toLocaleDateString()}`
    if (!value.from && value.to) return `To ${new Date(value.to).toLocaleDateString()}`
    return `${new Date(value.from).toLocaleDateString()} - ${new Date(value.to).toLocaleDateString()}`
  }

  const hasValue = value.from || value.to

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between h-9"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span className={hasValue ? "text-gray-900" : "text-gray-500"}>
            {formatDateRange()}
          </span>
        </div>
        {hasValue && (
          <X 
            className="h-4 w-4 cursor-pointer hover:text-red-500"
            onClick={(e) => {
              e.stopPropagation()
              handleClear()
            }}
          />
        )}
      </Button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="from-date" className="text-sm font-medium">From</Label>
                <Input
                  id="from-date"
                  type="date"
                  value={value.from}
                  onChange={(e) => handleFromChange(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="to-date" className="text-sm font-medium">To</Label>
                <Input
                  id="to-date"
                  type="date"
                  value={value.to}
                  onChange={(e) => handleToChange(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
