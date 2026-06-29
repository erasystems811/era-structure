import { cn } from '@/lib/utils'

interface ERALogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function ERALogo({ className, size = 'md' }: ERALogoProps) {
  const sizes = { sm: 'h-7 w-7', md: 'h-9 w-9', lg: 'h-12 w-12' }
  const textSizes = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' }

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className={cn('rounded-lg bg-[#0D1B3E] flex items-center justify-center flex-shrink-0', sizes[size])}>
        <span className={cn('font-bold text-[#C9952B]', textSizes[size])}>ES</span>
      </div>
      <div className="flex flex-col leading-tight">
        <span className="font-bold text-[#0D1B3E] tracking-wide" style={{ fontSize: size === 'sm' ? 11 : size === 'md' ? 13 : 15 }}>
          ERA SYSTEMS
        </span>
        <span className="text-[#666] tracking-widest uppercase" style={{ fontSize: size === 'sm' ? 8 : 9 }}>
          Structure
        </span>
      </div>
    </div>
  )
}
