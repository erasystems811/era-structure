import { createClient } from '@/lib/supabase/server'
import { ReportsClient } from '@/components/admin/ReportsClient'

export default async function ReportsPage() {
  const supabase = await createClient()

  const { data: pending } = await supabase
    .from('reports')
    .select('*, businesses(name, owner_name, business_types(name))')
    .eq('status', 'pending')
    .order('generated_at', { ascending: false })

  const { data: released } = await supabase
    .from('reports')
    .select('*, businesses(name, owner_name, business_types(name))')
    .eq('status', 'released')
    .order('released_at', { ascending: false })
    .limit(20)

  const { data: assessments } = await supabase
    .from('layer2_responses')
    .select('business_id')

  const assessedIds = new Set(assessments?.map(a => a.business_id) ?? [])

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, business_types(name)')
    .eq('is_active', true)

  const needsGeneration = ((businesses ?? []) as unknown as { id: string; name: string; business_types: { name: string } | null }[]).filter(b =>
    assessedIds.has(b.id) &&
    !pending?.find(r => r.business_id === b.id) &&
    !released?.find(r => r.business_id === b.id)
  )

  return <ReportsClient pending={pending ?? []} released={released ?? []} needsGeneration={needsGeneration} />
}
