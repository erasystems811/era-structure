'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ERALogo } from '@/components/shared/ERALogo'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Activity, HelpCircle, Users,
  FileText, FolderOpen, CreditCard, LogOut
} from 'lucide-react'

const nav = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/monitoring', label: 'Monitoring', icon: Activity },
  { href: '/admin/questions', label: 'Questions', icon: HelpCircle },
  { href: '/admin/accounts', label: 'Accounts', icon: Users },
  { href: '/admin/reports', label: 'Reports', icon: FileText },
  { href: '/admin/output', label: 'Output', icon: FolderOpen },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-56 flex-shrink-0 bg-[#0D1B3E] min-h-screen flex flex-col">
      <div className="px-5 py-5 border-b border-white/10">
        <ERALogo size="sm" className="[&_span]:text-white [&_.text-\[\#0D1B3E\]]:text-white [&_.text-\[\#666\]]:text-white/50" />
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-[#C9952B] text-white'
                : 'text-white/60 hover:text-white hover:bg-white/8'
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-3 pb-4">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/40 hover:text-white hover:bg-white/8 transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
