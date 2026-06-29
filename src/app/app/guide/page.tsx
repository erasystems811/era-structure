import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GuideBot } from '@/components/client/GuideBot'

export default async function GuidePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('owner_profiles').select('business_id').eq('user_id', user.id).single()
  const businessId = profile?.business_id

  const { data: report } = await supabase
    .from('reports')
    .select('*')
    .eq('business_id', businessId)
    .eq('status', 'released')
    .maybeSingle()

  const { data: lastSession } = await supabase
    .from('guide_sessions')
    .select('*')
    .eq('business_id', businessId)
    .order('session_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!report) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-[#666]">The guide bot becomes available after your assessment report is released.</p>
      </div>
    )
  }

  return <GuideBot lastSession={lastSession} businessId={businessId ?? ''} />
}
