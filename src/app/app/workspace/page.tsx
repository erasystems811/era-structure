import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WorkspaceView } from '@/components/client/WorkspaceView'

export default async function WorkspacePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('owner_profiles').select('business_id').eq('user_id', user.id).single()
  const businessId = profile?.business_id

  const { data: documents } = await supabase
    .from('documents')
    .select('*, staff_members(name)')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('category')
    .order('created_at')

  const { data: business } = await supabase
    .from('businesses')
    .select('name, is_locked')
    .eq('id', businessId)
    .single()

  return <WorkspaceView documents={documents ?? []} business={business} businessId={businessId ?? ''} />
}
