import { verifyOperatorSecret, operatorAdminClient, forbidden, corsHeaders } from '@/lib/operator-auth'
import { NextResponse } from 'next/server'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function GET(req: Request) {
  if (!verifyOperatorSecret(req)) return forbidden()
  const db = operatorAdminClient()
  const url = new URL(req.url)
  const businessId = url.searchParams.get('business_id')
  if (!businessId) return NextResponse.json({ error: 'business_id required' }, { status: 400, headers: corsHeaders() })

  const { data: business } = await db.from('businesses').select('business_type_id').eq('id', businessId).single()
  const bizTypeId = (business as unknown as { business_type_id: string } | null)?.business_type_id ?? ''

  const [
    { data: layer1 },
    { data: layer2 },
    { data: questions },
    { data: staff },
  ] = await Promise.all([
    db.from('layer1_responses').select('answers').eq('business_id', businessId).maybeSingle(),
    db.from('layer2_responses').select('answers').eq('business_id', businessId).maybeSingle(),
    db.from('questions').select('id, block, question_text, layer').eq('business_type_id', bizTypeId).eq('is_active', true).order('order_index'),
    db.from('staff_members').select('name, role').eq('business_id', businessId).eq('is_active', true),
  ])

  return NextResponse.json({ layer1: layer1?.answers ?? {}, layer2: layer2?.answers ?? {}, questions: questions ?? [], staff: staff ?? [] }, { headers: corsHeaders() })
}
