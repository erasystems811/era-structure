export const dynamic = 'force-dynamic'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AssessmentFlow } from '@/components/client/AssessmentFlow'

export default async function AssessmentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: profile } = await admin.from('owner_profiles').select('business_id').eq('user_id', user.id).maybeSingle()
  const businessId = profile?.business_id

  if (!businessId) redirect('/login')

  const { data: business } = await admin
    .from('businesses')
    .select('*, business_types(name, id)')
    .eq('id', businessId)
    .maybeSingle()

  const bizTypeId = (business as unknown as { business_type_id: string })?.business_type_id ?? ''

  const [
    { data: layer1 },
    { data: layer2 },
    { data: report },
    { data: questions },
    { data: staff },
  ] = await Promise.all([
    admin.from('layer1_responses').select('*').eq('business_id', businessId).maybeSingle(),
    admin.from('layer2_responses').select('*').eq('business_id', businessId).maybeSingle(),
    admin.from('reports').select('*').eq('business_id', businessId).eq('status', 'released').maybeSingle(),
    admin.from('questions').select('*').eq('business_type_id', bizTypeId).eq('layer', 1).eq('is_active', true).order('order_index'),
    admin.from('staff_members').select('*').eq('business_id', businessId).eq('is_active', true),
  ])

  return (
    <AssessmentFlow
      business={business as unknown as { name: string; business_types: { name: string; id: string } | null }}
      layer1={layer1}
      observation={null}
      layer2={layer2}
      report={report}
      questions={questions ?? []}
      staff={staff ?? []}
      businessId={businessId ?? ''}
    />
  )
}
