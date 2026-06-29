import { createClient } from '@/lib/supabase/server'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { Building2, Clock, AlertTriangle, Lock, FileText, TrendingUp } from 'lucide-react'

async function getStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [
    { count: total },
    { data: stages },
    { data: pending },
    { data: locked },
    { data: overdue },
  ] = await Promise.all([
    supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('businesses').select('stage').eq('is_active', true),
    supabase.from('reports').select('id, businesses(name)').eq('status', 'pending'),
    supabase.from('businesses').select('id, name, locked_at').eq('is_locked', true),
    supabase.from('documents').select('id, title, businesses(name), next_review_due')
      .lt('next_review_due', new Date().toISOString())
      .eq('is_active', true),
  ])

  const byCounts = (stages || []).reduce((acc: Record<string, number>, b) => {
    acc[b.stage] = (acc[b.stage] || 0) + 1
    return acc
  }, {})

  return { total, byCounts, pending, locked, overdue }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { total, byCounts, pending, locked, overdue } = await getStats(supabase)

  const stats = [
    { label: 'Active Businesses', value: total ?? 0, icon: Building2, color: 'text-[#0D1B3E]' },
    { label: 'Pending Reports', value: pending?.length ?? 0, icon: FileText, color: 'text-[#C9952B]' },
    { label: 'Overdue Reviews', value: overdue?.length ?? 0, icon: AlertTriangle, color: 'text-amber-600' },
    { label: 'Locked Accounts', value: locked?.length ?? 0, icon: Lock, color: 'text-red-600' },
  ]

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-7">
        <h1 className="text-xl font-bold text-[#0D1B3E]">Dashboard</h1>
        <p className="text-sm text-[#666] mt-0.5">{new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardBody className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg bg-current/8', color)}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#0D1B3E]">{value}</p>
                <p className="text-xs text-[#666]">{label}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Stage breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {(['assessment', 'guide', 'maintenance'] as const).map(stage => (
          <Card key={stage}>
            <CardBody className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#666] uppercase tracking-wide">{stage}</p>
                <p className="text-3xl font-bold text-[#0D1B3E] mt-0.5">{byCounts[stage] ?? 0}</p>
              </div>
              <TrendingUp size={20} className="text-[#C9952B]/40" />
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Pending reports */}
      {(pending?.length ?? 0) > 0 && (
        <Card className="mb-4">
          <div className="px-5 py-3.5 border-b border-[#0D1B3E]/8 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#0D1B3E]">Reports awaiting review</h2>
            <Badge variant="gold">{pending?.length}</Badge>
          </div>
          <div className="divide-y divide-[#0D1B3E]/6">
            {pending?.map((r: { id: string; businesses: { name: string } | null | { name: string }[] }) => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                <span className="text-sm text-[#1A1A2E]">{Array.isArray(r.businesses) ? r.businesses[0]?.name : (r.businesses as { name: string } | null)?.name}</span>
                <a href={`/admin/reports`} className="text-xs text-[#C9952B] hover:underline">Review</a>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Locked accounts */}
      {(locked?.length ?? 0) > 0 && (
        <Card>
          <div className="px-5 py-3.5 border-b border-[#0D1B3E]/8 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#0D1B3E]">Locked accounts</h2>
            <Badge variant="red">{locked?.length}</Badge>
          </div>
          <div className="divide-y divide-[#0D1B3E]/6">
            {locked?.map((b: { id: string; name: string; locked_at: string | null; [key: string]: unknown }) => (
              <div key={b.id} className="px-5 py-3 flex items-center justify-between">
                <span className="text-sm text-[#1A1A2E]">{b.name}</span>
                {b.locked_at && <span className="text-xs text-[#999]">Locked {formatDate(b.locked_at)}</span>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function cn(...args: (string | undefined | false)[]) {
  return args.filter(Boolean).join(' ')
}
