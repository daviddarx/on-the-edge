# Phase 2: Types, Constants & Utility Functions

## Overview

Create the shared data model, category configuration, and utility functions used throughout the application. These files have no external dependencies beyond TypeScript and are the foundation for all other phases.

## Dependencies

- Phase 1 complete (project scaffolded with TypeScript)

---

## Task 2.1: Core Data Types

**File: `src/lib/types.ts`**

```typescript
export const CATEGORIES = [
  { value: "invention", label: "Invention", color: "#3b82f6", dotClass: "bg-blue-500", textClass: "text-blue-500" },
  { value: "event", label: "Event", color: "#ef4444", dotClass: "bg-red-500", textClass: "text-red-500" },
  { value: "person", label: "Person", color: "#a855f7", dotClass: "bg-purple-500", textClass: "text-purple-500" },
  { value: "discovery", label: "Discovery", color: "#22c55e", dotClass: "bg-green-500", textClass: "text-green-500" },
  { value: "civilization", label: "Civilization", color: "#f59e0b", dotClass: "bg-amber-500", textClass: "text-amber-500" },
] as const;

export type Category = (typeof CATEGORIES)[number]["value"];
// Resolves to: "invention" | "event" | "person" | "discovery" | "civilization"

export interface TimelineEvent {
  id: string;            // UUID v4, generated via crypto.randomUUID()
  year: number;          // Negative for BC (e.g., -44 for 44 BC)
  name: string;          // Required display name
  category: Category;    // One of the 5 predefined categories
  endYear?: number | null;      // Optional end year for date ranges
  region?: string | null;       // Optional geographical region
  description?: string | null;  // Optional, shown as tooltip on hover
}

export interface EventsData {
  events: TimelineEvent[];
}
```

### Design Decisions

**Why `CATEGORIES` as a `const` array?**

Single source of truth: the `Category` union type is derived from it, so values, labels, and colors can never drift apart. The array can be iterated for rendering (legend bar, select options) while the type provides compile-time safety. `as const` ensures TypeScript narrows the `value` fields to literal types.

**Why `| null` on optional fields?**

JSON serialization: when the API reads `data/events.json`, absent optional fields may be `null` (explicit) or `undefined` (absent key). Supporting both with `?: T | null` handles either case. When creating events, the API route explicitly sets missing optional fields to `null` for consistent JSON output.

**Why `TimelineEvent` (not just `Event`)?**

Avoids collision with the global DOM `Event` type in TypeScript, which would cause confusion and potential type errors.

**Color assignments:**

| Category | Hex | Tailwind Class | Rationale |
|---|---|---|---|
| invention | `#3b82f6` | `bg-blue-500` | Blue = technology/creation |
| event | `#ef4444` | `bg-red-500` | Red = significant moments |
| person | `#a855f7` | `bg-purple-500` | Purple = individual distinction |
| discovery | `#22c55e` | `bg-green-500` | Green = growth/knowledge |
| civilization | `#f59e0b` | `bg-amber-500` | Amber = enduring/ancient |

**`dotClass` and `textClass` fields:**

Pre-computed Tailwind classes stored alongside each category avoid runtime string concatenation. `dotClass` is used for timeline dots and legend indicators. `textClass` is available if category text coloring is needed.

**Important**: These are static class strings so Tailwind's JIT compiler can detect them at build time. Dynamic class construction (e.g., `` `bg-${color}-500` ``) would NOT work with Tailwind.

---

## Task 2.2: Year Formatting Utilities

**File: `src/lib/format-year.ts`**

```typescript
/**
 * Formats a year number for display.
 * Positive years display as-is (AD).
 * Negative years display as absolute value + " BC".
 *
 * Examples:
 *   formatYear(2024)  → "2024"
 *   formatYear(-44)   → "44 BC"
 *   formatYear(0)     → "0"
 */
export function formatYear(year: number): string {
  if (year < 0) return `${Math.abs(year)} BC`;
  return `${year}`;
}

/**
 * Formats a year range for timeline display.
 * If endYear is provided, shows "start-end" format.
 * If endYear is null/undefined, shows just the start year.
 *
 * Examples:
 *   formatYearRange(1939, 1945)   → "1939-1945"
 *   formatYearRange(-27, 476)     → "27 BC-476"
 *   formatYearRange(1440)         → "1440"
 *   formatYearRange(-3000)        → "3000 BC"
 */
export function formatYearRange(year: number, endYear?: number | null): string {
  if (endYear != null) {
    return `${formatYear(year)}-${formatYear(endYear)}`;
  }
  return formatYear(year);
}
```

### Design Decisions

- Uses `!= null` (loose equality) to check for both `null` and `undefined` in a single check.
- No "AD" suffix for positive years — matches the spec examples (e.g., "1540: Pistolet", not "1540 AD: Pistolet").
- `Math.abs()` handles the negative-to-positive conversion for BC dates.

---

## Task 2.3: Verify Tailwind Configuration

The Tailwind classes used in `CATEGORIES` (`bg-blue-500`, `bg-red-500`, etc.) must be detectable by Tailwind's JIT scanner. Since they are string literals in `src/lib/types.ts`, Tailwind will find them as long as `src/lib/**/*.ts` is in the content paths.

Verify `tailwind.config.ts` has:
```typescript
content: [
  "./src/**/*.{js,ts,jsx,tsx,mdx}",
]
```

This should already be set by `create-next-app` with the `--tailwind` flag.

---

## Files Created

| File | Exports | Purpose |
|---|---|---|
| `src/lib/types.ts` | `CATEGORIES`, `Category`, `TimelineEvent`, `EventsData` | Core data model |
| `src/lib/format-year.ts` | `formatYear`, `formatYearRange` | Year display formatting |

## Verification Checklist

- [ ] `src/lib/types.ts` exports all 4 items
- [ ] `src/lib/format-year.ts` exports both functions
- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
- [ ] `Category` type correctly restricts to the 5 values
- [ ] `formatYear(-44)` returns `"44 BC"`
- [ ] `formatYearRange(1939, 1945)` returns `"1939-1945"`
- [ ] Tailwind config includes `src/lib/**/*.ts` in content paths
