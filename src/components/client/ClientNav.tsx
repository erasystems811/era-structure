'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ERALogo } from '@/components/shared/ERALogo'
import { createClient } from '@/lib/supabase/client'
import type { Business } from '@/types'
import { ClipboardList, FolderOpen, MessageSquare, LogOut } from 'lucide-react'

const nav = [
  { href: '/app/assessment', label: 'Assessment', icon: ClipboardList },
  { href: '/app/workspace', label: 'Workspace', icon: FolderOpen },
  { href: '/app/guide', label: 'Guide', icon: MessageSquare },
]

interface Props {
  business: (Business & { business_types: { name: string } | null }) | null
}

export function ClientNav({ business }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="bg-[#0D1B3E] text-white">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <ERALogo size="sm" />
          {business && (
            <span className="text-xs text-white/40 hidden sm:block">
              {business.name} · {business.business_types?.name}
            </span>
          )}
        </div>

        <nav className="flex items-center gap-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                pathname.startsWith(href)
                  ? 'bg-[#C9952B] text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/8'
              )}
            >
              <Icon size={13} />
              <span className="hidden sm:block">{label}</span>
            </Link>
          ))}
          <button
            onClick={handleSignOut}
            className="ml-2 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-colors"
          >
            <LogOut size={14} />
          </button>
        </nav>
      </div>
    </header>
  )
}
