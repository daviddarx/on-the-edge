"use client"

import { Category, CATEGORIES } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TimelineControlsProps {
  categoryFilter: Category | "all"
  onCategoryChange: (value: Category | "all") => void
  searchQuery: string
  onSearchChange: (value: string) => void
}

export function TimelineControls({
  categoryFilter,
  onCategoryChange,
  searchQuery,
  onSearchChange,
}: TimelineControlsProps) {
  return (
    <div className="mt-6 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Select
          value={categoryFilter}
          onValueChange={(v) => onCategoryChange(v as Category | "all")}
        >
          <SelectTrigger className="w-full">
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
    </div>
  )
}
