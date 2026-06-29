import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('owner_profiles').select('role').eq('user_id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { name, owner_name, owner_phone, owner_email, business_type_id, password } = await req.json()

    const adminClient = await createAdminClient()

    // Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: owner_email,
      password,
      email_confirm: true,
    })
    if (authError) throw authError

    // Create business
    const { data: business, error: bizError } = await adminClient
      .from('businesses')
      .insert({ name, owner_name, owner_phone, owner_email, business_type_id })
      .select()
      .single()
    if (bizError) throw bizError

    // Create profile
    await adminClient.from('owner_profiles').insert({
      user_id: authData.user.id,
      business_id: business.id,
      role: 'client',
    })

    return NextResponse.json({ success: true, business })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
