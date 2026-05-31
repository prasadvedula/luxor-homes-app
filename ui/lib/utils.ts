import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function flatLabel(floor: number, number: number): string {
  return String(floor * 100 + number)
}

// Generate all 70 flats: 5 floors × 14 per floor
export function generateFlats() {
  const flats = []
  for (let floor = 1; floor <= 5; floor++) {
    for (let num = 1; num <= 14; num++) {
      flats.push({ floor, number: num, label: flatLabel(floor, num) })
    }
  }
  return flats
}

export function statusColor(status: string) {
  const map: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    OPEN: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-purple-100 text-purple-800',
    RESOLVED: 'bg-green-100 text-green-800',
    CLOSED: 'bg-gray-100 text-gray-800',
    DRAFT: 'bg-gray-100 text-gray-800',
    NOMINATIONS_OPEN: 'bg-blue-100 text-blue-800',
    VOTING_OPEN: 'bg-gold-100 text-gold-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    CHECKED_OUT: 'bg-gray-100 text-gray-800',
    OCCUPIED: 'bg-green-100 text-green-800',
    VACANT: 'bg-blue-100 text-blue-800',
    UNDER_RENOVATION: 'bg-orange-100 text-orange-800',
  }
  return map[status] ?? 'bg-gray-100 text-gray-800'
}

export function priorityColor(priority: string) {
  const map: Record<string, string> = {
    LOW: 'bg-gray-100 text-gray-700',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-orange-100 text-orange-800',
    CRITICAL: 'bg-red-100 text-red-800',
  }
  return map[priority] ?? 'bg-gray-100 text-gray-700'
}
