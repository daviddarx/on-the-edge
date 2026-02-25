"use client"

import { TimelineEvent } from "@/lib/types"
import { TimelineEntry } from "@/components/TimelineEntry"

interface TimelineProps {
  events: TimelineEvent[]
  isOwner: boolean
  onEdit: (event: TimelineEvent) => void
  onDelete: (event: TimelineEvent) => void
}

export function Timeline({ events, isOwner, onEdit, onDelete }: TimelineProps) {
  if (events.length === 0) {
    return (
      <p className="mt-8 text-center text-muted-foreground">
        No events found.
      </p>
    )
  }

  return (
    <div className="relative mt-4 ml-3 border-l-2 border-muted">
      {events.map((event) => (
        <TimelineEntry
          key={event.id}
          event={event}
          isOwner={isOwner}
          onEdit={() => onEdit(event)}
          onDelete={() => onDelete(event)}
        />
      ))}
    </div>
  )
}
