import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatNaira } from '@/lib/utils'

export default async function PaymentsPage() {
  const supabase = await createClient()

  const { data: payments } = await supabase
    .from('payments')
    .select('*, businesses(name, owner_name)')
    .order('created_at', { ascending: false })

  const { data: locked } = await supabase
    .from('businesses')
    .select('id, name, owner_name, locked_at')
    .eq('is_locked', true)

  const totalRevenue = (payments ?? [])
    .filter(p => p.status === 'successful')
    .reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <h1 className="text-xl font-bold text-[#0D1B3E]">Payments</h1>
        <div className="text-right">
          <p className="text-xs text-[#666]">Total unlock revenue</p>
          <p className="text-2xl font-bold text-[#0D1B3E]">{formatNaira(totalRevenue)}</p>
        </div>
      </div>

      {(locked ?? []).length > 0 && (
        <Card>
          <div className="px-5 py-3.5 border-b border-red-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#0D1B3E]">Currently locked</h2>
            <Badge variant="red">{locked?.length}</Badge>
          </div>
          <div className="divide-y divide-[#0D1B3E]/6">
            {(locked ?? []).map(b => (
              <div key={b.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#0D1B3E]">{b.name}</p>
                  <p className="text-xs text-[#666]">{b.owner_name}</p>
                </div>
                {b.locked_at && <span className="text-xs text-red-500">Since {formatDate(b.locked_at)}</span>}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="px-5 py-3.5 border-b border-[#0D1B3E]/8">
          <h2 className="text-sm font-semibold text-[#0D1B3E]">Payment history</h2>
        </div>
        <div className="divide-y divide-[#0D1B3E]/6">
          {(payments ?? []).length === 0 && (
            <div className="px-5 py-4 text-sm text-[#999]">No payments yet</div>
          )}
          {(payments ?? []).map(p => (
            <div key={p.id} className="px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#0D1B3E]">{p.businesses?.name}</p>
                <p className="text-xs text-[#666]">{formatDate(p.created_at)} · {p.flutterwave_ref}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[#0D1B3E]">{formatNaira(p.amount)}</span>
                <Badge variant={p.status === 'successful' ? 'green' : p.status === 'pending' ? 'amber' : 'red'}>
                  {p.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
