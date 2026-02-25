"use client"

import { TimelineEvent, CATEGORIES } from "@/lib/types"
import { formatYearRange } from "@/lib/format-year"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Pencil, Trash2 } from "lucide-react"

interface TimelineEntryProps {
  event: TimelineEvent
  isOwner: boolean
  onEdit: () => void
  onDelete: () => void
}

export function TimelineEntry({ event, isOwner, onEdit, onDelete }: TimelineEntryProps) {
  const category = CATEGORIES.find(c => c.value === event.category)

  const content = (
    <span className="text-sm">
      <span className="font-medium">
        {formatYearRange(event.year, event.endYear)}
      </span>
      {": "}
      {event.name}
      {event.region && (
        <span className="text-muted-foreground"> ({event.region})</span>
      )}
    </span>
  )

  return (
    <div className="group relative py-2 pl-6">
      {/* Colored dot */}
      <span
        className={cn(
          "absolute left-[-5px] top-[14px] h-2.5 w-2.5 rounded-full",
          category?.dotClass
        )}
      />

      {/* Content with optional tooltip */}
      <div className="flex items-baseline gap-2">
        {event.description ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help">{content}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{event.description}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          content
        )}

        {/* Edit/Delete icons — visible on hover when owner */}
        {isOwner && (
          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
