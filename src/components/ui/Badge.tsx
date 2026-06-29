import { cn } from '@/lib/utils'

type BadgeVariant = 'green' | 'amber' | 'red' | 'navy' | 'gold' | 'grey'

interface BadgeProps {
  variant: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  green: 'bg-green-50 text-green-700 border-green-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  navy: 'bg-[#0D1B3E]/8 text-[#0D1B3E] border-[#0D1B3E]/15',
  gold: 'bg-[#C9952B]/10 text-[#C9952B] border-[#C9952B]/20',
  grey: 'bg-gray-50 text-gray-600 border-gray-200',
}

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border', variants[variant], className)}>
      {children}
    </span>
  )
}
