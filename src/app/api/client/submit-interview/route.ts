import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { answers } = await req.json()

  const { data: profile } = await supabase
    .from('owner_profiles')
    .select('business_id')
    .eq('user_id', user.id)
    .single()

  if (!profile?.business_id) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  const admin = createAdminClient()

  const { error: l2Err } = await admin
    .from('layer2_responses')
    .upsert({ business_id: profile.business_id, answers })

  if (l2Err) return NextResponse.json({ error: l2Err.message }, { status: 500 })

  // Create a pending report if one doesn't already exist
  const { data: existing } = await admin
    .from('reports')
    .select('id')
    .eq('business_id', profile.business_id)
    .eq('status', 'pending')
    .maybeSingle()

  if (!existing) {
    const { error: rErr } = await admin
      .from('reports')
      .insert({ business_id: profile.business_id, status: 'pending', generated_at: new Date().toISOString(), generated_content: {} })
    if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
