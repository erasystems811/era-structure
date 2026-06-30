import { verifyOperatorSecret, operatorAdminClient, forbidden, corsHeaders } from '@/lib/operator-auth'
import { NextResponse } from 'next/server'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function GET(req: Request) {
  if (!verifyOperatorSecret(req)) return forbidden()
  const db = operatorAdminClient()
  const { data, error } = await db
    .from('businesses')
    .select('*, business_types(name), owner_profiles(user_id)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() })
  return NextResponse.json(data, { headers: corsHeaders() })
}

export async function PATCH(req: Request) {
  if (!verifyOperatorSecret(req)) return forbidden()
  const { id, name, owner_name, owner_phone, owner_email, business_type_id, stage, is_locked, new_password } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400, headers: corsHeaders() })
  const db = operatorAdminClient()

  const updates: Record<string, unknown> = {}
  if (name             !== undefined) updates.name              = name
  if (owner_name       !== undefined) updates.owner_name        = owner_name
  if (owner_phone      !== undefined) updates.owner_phone       = owner_phone
  if (owner_email      !== undefined) updates.owner_email       = owner_email
  if (business_type_id !== undefined) updates.business_type_id  = business_type_id
  if (stage            !== undefined) updates.stage             = stage
  if (is_locked        !== undefined) {
    updates.is_locked  = is_locked
    updates.locked_at  = is_locked ? new Date().toISOString() : null
  }

  const { data, error } = await db.from('businesses').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() })

  // Update email and/or password in Supabase Auth
  if (new_password || owner_email) {
    const { data: profile } = await db.from('owner_profiles').select('user_id').eq('business_id', id).single()
    if (profile) {
      const authUpdates: { password?: string; email?: string } = {}
      if (new_password) authUpdates.password = new_password
      if (owner_email)  authUpdates.email    = owner_email
      const { error: authErr } = await db.auth.admin.updateUserById(profile.user_id, authUpdates)
      if (authErr) return NextResponse.json({ error: `Auth update failed: ${authErr.message}` }, { status: 500, headers: corsHeaders() })
    }
  }

  return NextResponse.json({ success: true, business: data }, { headers: corsHeaders() })
}

export async function DELETE(req: Request) {
  if (!verifyOperatorSecret(req)) return forbidden()
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400, headers: corsHeaders() })
  const db = operatorAdminClient()

  const { data: profile } = await db.from('owner_profiles').select('user_id').eq('business_id', id).single()
  await db.from('businesses').delete().eq('id', id)
  if (profile?.user_id) await db.auth.admin.deleteUser(profile.user_id)

  return NextResponse.json({ success: true }, { headers: corsHeaders() })
}

export async function POST(req: Request) {
  if (!verifyOperatorSecret(req)) return forbidden()
  const { name, owner_name, owner_phone, owner_email, business_type_id, password } = await req.json()
  const db = operatorAdminClient()

  // Generate next sequential business number
  const { data: maxRow } = await db
    .from('businesses')
    .select('business_number')
    .not('business_number', 'is', null)
    .order('business_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  const lastNum = maxRow?.business_number ? parseInt(maxRow.business_number as string) : 0
  const businessNumber = String(lastNum + 1).padStart(4, '0')

  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email: owner_email,
    password,
    email_confirm: true,
  })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500, headers: corsHeaders() })

  const { data: business, error: bizError } = await db
    .from('businesses')
    .insert({ name, owner_name, owner_phone, owner_email, business_type_id, business_number: businessNumber })
    .select()
    .single()
  if (bizError) return NextResponse.json({ error: bizError.message }, { status: 500, headers: corsHeaders() })

  await db.from('owner_profiles').insert({ user_id: authData.user.id, business_id: business.id, role: 'client' })

  return NextResponse.json({ success: true, business }, { headers: corsHeaders() })
}
