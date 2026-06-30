export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AssessmentFlow } from '@/components/client/AssessmentFlow'

export default async function AssessmentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('owner_profiles').select('business_id').eq('user_id', user.id).single()
  const businessId = profile?.business_id

  // Fetch business first to get business_type_id
  const { data: business } = await supabase
    .from('businesses')
    .select('*, business_types(name, id)')
    .eq('id', businessId)
    .single()

  const bizTypeId = (business as unknown as { business_types: { id: string } | null })?.business_types?.id ?? ''

  const [
    { data: layer1 },
    { data: observation },
    { data: layer2 },
    { data: report },
    { data: questions },
    { data: staff },
  ] = await Promise.all([
    supabase.from('layer1_responses').select('*').eq('business_id', businessId).maybeSingle(),
    supabase.from('observation_schedule').select('*').eq('business_id', businessId).maybeSingle(),
    supabase.from('layer2_responses').select('*').eq('business_id', businessId).maybeSingle(),
    supabase.from('reports').select('*').eq('business_id', businessId).eq('status', 'released').maybeSingle(),
    supabase.from('questions').select('*').eq('business_type_id', bizTypeId).eq('layer', 1).eq('is_active', true).order('order_index'),
    supabase.from('staff_members').select('*').eq('business_id', businessId).eq('is_active', true),
  ])

  return (
    <AssessmentFlow
      business={business as unknown as { name: string; business_types: { name: string; id: string } | null }}
      layer1={layer1}
      observation={observation}
      layer2={layer2}
      report={report}
      questions={questions ?? []}
      staff={staff ?? []}
      businessId={businessId ?? ''}
    />
  )
}
