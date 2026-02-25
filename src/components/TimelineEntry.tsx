"use client"

import { useState } from "react"
import { TimelineEvent, CATEGORIES } from "@/lib/types"
import { formatYearRange } from "@/lib/format-year"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Info, Pencil, Trash2 } from "lucide-react"

interface TimelineEntryProps {
  event: TimelineEvent
  isOwner: boolean
  onEdit: () => void
  onDelete: () => void
}

export function TimelineEntry({ event, isOwner, onEdit, onDelete }: TimelineEntryProps) {
  const category = CATEGORIES.find((c) => c.value === event.category)
  const [descOpen, setDescOpen] = useState(false)

  const content = (
    <span className="text-sm">
      <span className="font-medium">{formatYearRange(event.year, event.endYear)}</span>
      {": "}
      {event.name}
      {event.region && <span className="text-muted-foreground"> ({event.region})</span>}
    </span>
  )

  return (
    <div className="group relative py-2 pl-6">
      {/* Colored dot */}
      <span
        className={cn(
          "absolute top-[16px] left-[-6px] h-[10px] w-[10px] rounded-full",
          category?.dotClass
        )}
      />

      {/* Content with optional tooltip */}
      <div className="flex items-baseline gap-2">
        <span className="flex-1">
          {content}
          {event.description && (
            <Tooltip open={descOpen} onOpenChange={setDescOpen}>
              <TooltipTrigger asChild>
                <span
                  className="text-muted-foreground hover:text-foreground ml-1.5 inline-flex cursor-pointer"
                  onClick={() => setDescOpen((v) => !v)}
                >
                  <Info className="relative top-0.5 h-3.5 w-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="max-w-xs">{event.description}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </span>

        {/* Edit/Delete icons — visible on hover when owner */}
        {isOwner && (
          <div className="relative top-0.5 flex gap-2 has-hover:opacity-0 has-hover:group-hover:opacity-100">
            <button
              onClick={onEdit}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
