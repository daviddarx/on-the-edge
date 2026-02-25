"use client"

import { Category, CATEGORIES } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TimelineControlsProps {
  isOwner: boolean
  categoryFilter: Category | "all"
  onCategoryChange: (value: Category | "all") => void
  searchQuery: string
  onSearchChange: (value: string) => void
  onAddNew: () => void
}

export function TimelineControls({
  isOwner,
  categoryFilter,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  onAddNew,
}: TimelineControlsProps) {
  return (
    <div className="mt-6 space-y-3">
      {isOwner && (
        <Button onClick={onAddNew}>Add a new date</Button>
      )}
      <Select
        value={categoryFilter}
        onValueChange={(v) => onCategoryChange(v as Category | "all")}
      >
        <SelectTrigger>
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {CATEGORIES.map((cat) => (
            <SelectItem key={cat.value} value={cat.value}>
              <span className="flex items-center gap-2">
                <span className={cn("inline-block h-2.5 w-2.5 rounded-full", cat.dotClass)} />
                {cat.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        placeholder="Search by name or region..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  )
}
