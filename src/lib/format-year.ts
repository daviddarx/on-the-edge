/**
 * Formats a year number for display.
 * Positive years display as-is (AD).
 * Negative years display as absolute value + " BC".
 */
export function formatYear(year: number): string {
  if (year < 0) return `${Math.abs(year)} BC`
  return `${year}`
}

/**
 * Formats a year range for timeline display.
 * If endYear is provided, shows "start-end" format.
 * If endYear is null/undefined, shows just the start year.
 */
export function formatYearRange(year: number, endYear?: number | null): string {
  if (endYear != null) {
    return `${formatYear(year)}-${formatYear(endYear)}`
  }
  return formatYear(year)
}
