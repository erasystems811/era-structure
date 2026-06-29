import { cn } from '@/lib/utils'

interface CardProps {
  className?: string
  children: React.ReactNode
  gold?: boolean
}

export function Card({ className, children, gold }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl bg-white border shadow-sm',
        gold ? 'border-[#C9952B]/30' : 'border-[#0D1B3E]/8',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('px-5 py-4 border-b border-[#0D1B3E]/8', className)}>
      {children}
    </div>
  )
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('px-5 py-4', className)}>
      {children}
    </div>
  )
}
