import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LockedScreen } from '@/components/client/LockedScreen'

export default async function LockedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('owner_profiles').select('business_id').eq('user_id', user.id).single()

  const { data: business } = await supabase
    .from('businesses')
    .select('name, locked_at, is_locked')
    .eq('id', profile?.business_id)
    .single()

  if (!business?.is_locked) redirect('/app/assessment')

  return <LockedScreen business={business} />
}
