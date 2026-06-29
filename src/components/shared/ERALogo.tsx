import { cn } from '@/lib/utils'

interface ERALogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'icon' | 'full'
}

export function ERALogo({ className, size = 'md', variant = 'icon' }: ERALogoProps) {
  const iconSizes = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-14 w-14' }
  const fullSizes = { sm: 'h-10', md: 'h-14', lg: 'h-20' }

  if (variant === 'full') {
    return (
      <img
        src="/era-logo.png"
        alt="ERA Systems"
        className={cn(fullSizes[size], 'object-contain', className)}
      />
    )
  }

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <img
        src="/era-icon.png"
        alt="ERA Systems"
        className={cn(iconSizes[size], 'object-contain rounded-xl flex-shrink-0')}
      />
      <div className="flex flex-col leading-tight">
        <span className="font-bold text-foreground tracking-wide" style={{ fontSize: size === 'sm' ? 11 : size === 'md' ? 13 : 15 }}>
          ERA SYSTEMS
        </span>
        <span className="text-muted-foreground tracking-widest uppercase" style={{ fontSize: size === 'sm' ? 8 : 9 }}>
          Structure
        </span>
      </div>
    </div>
  )
}
