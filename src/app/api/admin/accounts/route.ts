import { verifyOperatorSecret, operatorAdminClient, forbidden, corsHeaders } from '@/lib/operator-auth'
import { NextResponse } from 'next/server'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function GET(req: Request) {
  if (!verifyOperatorSecret(req)) return forbidden()
  const db = await operatorAdminClient()
  const { data, error } = await db
    .from('businesses')
    .select('*, business_types(name), owner_profiles(user_id)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() })
  return NextResponse.json(data, { headers: corsHeaders() })
}

export async function POST(req: Request) {
  if (!verifyOperatorSecret(req)) return forbidden()
  const { name, owner_name, owner_phone, owner_email, business_type_id, password } = await req.json()
  const db = await operatorAdminClient()

  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email: owner_email,
    password,
    email_confirm: true,
  })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500, headers: corsHeaders() })

  const { data: business, error: bizError } = await db
    .from('businesses')
    .insert({ name, owner_name, owner_phone, owner_email, business_type_id })
    .select()
    .single()
  if (bizError) return NextResponse.json({ error: bizError.message }, { status: 500, headers: corsHeaders() })

  await db.from('owner_profiles').insert({ user_id: authData.user.id, business_id: business.id, role: 'client' })

  return NextResponse.json({ success: true, business }, { headers: corsHeaders() })
}
