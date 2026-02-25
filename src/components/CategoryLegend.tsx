"use client"

import { CATEGORIES } from "@/lib/types"
import { cn } from "@/lib/utils"

interface CategoryLegendProps {
  visible: boolean
}

export function CategoryLegend({ visible }: CategoryLegendProps) {
  if (!visible) return null

  return (
    <div className="bg-background sticky top-0 z-10 mt-4 flex flex-wrap gap-4 border-b py-3">
      {CATEGORIES.map((cat) => (
        <div key={cat.value} className="flex items-center gap-1.5 text-sm">
          <span className={cn("h-2.5 w-2.5 rounded-full", cat.dotClass)} />
          <span>{cat.label}</span>
        </div>
      ))}
    </div>
  )
}
