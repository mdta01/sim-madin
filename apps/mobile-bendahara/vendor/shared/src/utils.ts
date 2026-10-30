/**
 * Shared utility functions — pure functions, framework-agnostic.
 * Bisa dipakai di Next.js, React Native, Node.js scripts.
 */

export function classNames(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ")
}

export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "..." : str
}

export function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase()
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isValidPhone(phone: string): boolean {
  return /^[0-9+\-\s()]{8,15}$/.test(phone)
}

/**
 * Generate invoice number format: INV-YYYY-000001
 */
export function generateInvoiceNo(seq: number, year: number = new Date().getFullYear()): string {
  return `INV-${year}-${String(seq).padStart(6, "0")}`
}

/**
 * Parse ISO date string to YYYY-MM-DD for <input type="date">
 */
export function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return ""
  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return ""
  return d.toISOString().split("T")[0]
}

/**
 * Convert File to base64 (for preview in mobile)
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Group array of objects by key
 */
export function groupBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const key = keyFn(item)
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

/**
 * Sleep helper
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
