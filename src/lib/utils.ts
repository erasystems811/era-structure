import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { differenceInDays, format, parseISO } from 'date-fns'
import type { DocumentHealth } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'dd MMM yyyy')
}

export function getDocumentHealth(nextReviewDue: string | null, isLocked: boolean): DocumentHealth {
  if (isLocked) return 'locked'
  if (!nextReviewDue) return 'green'
  const days = differenceInDays(parseISO(nextReviewDue), new Date())
  if (days > 5) return 'green'
  if (days > 0) return 'amber'
  return 'red'
}

export function getDaysUntilReview(nextReviewDue: string | null): number {
  if (!nextReviewDue) return 14
  return differenceInDays(parseISO(nextReviewDue), new Date())
}
