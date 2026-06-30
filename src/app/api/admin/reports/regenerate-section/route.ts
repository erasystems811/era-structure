import { verifyOperatorSecret, operatorAdminClient, forbidden, corsHeaders } from '@/lib/operator-auth'
import { NextResponse } from 'next/server'
import { generateSection } from '@/lib/ai/openai'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function POST(req: Request) {
  if (!verifyOperatorSecret(req)) return forbidden()
  const db = operatorAdminClient()
  const { business_id, section, instruction } = await req.json()
  if (!business_id || !section)
    return NextResponse.json({ error: 'business_id and section required' }, { status: 400, headers: corsHeaders() })

  const { data: business } = await db
    .from('businesses')
    .select('*, business_types(name, id)')
    .eq('id', business_id)
    .single()

  const bizTypeId = (business as unknown as { business_type_id: string } | null)?.business_type_id ?? ''

  const [
    { data: layer1 },
    { data: layer2 },
    { data: staff },
    { data: questions },
    { data: report },
  ] = await Promise.all([
    db.from('layer1_responses').select('answers').eq('business_id', business_id).maybeSingle(),
    db.from('layer2_responses').select('answers').eq('business_id', business_id).maybeSingle(),
    db.from('staff_members').select('name, role').eq('business_id', business_id).eq('is_active', true),
    db.from('questions').select('id, question_text').eq('business_type_id', bizTypeId).eq('layer', 1).eq('is_active', true),
    db.from('reports').select('generated_content').eq('business_id', business_id).maybeSingle(),
  ])

  if (!layer1?.answers)
    return NextResponse.json({ error: 'No assessment answers found' }, { status: 400, headers: corsHeaders() })

  const questionMap = Object.fromEntries((questions ?? []).map(q => [q.id, q.question_text]))
  const readableLayer1: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(layer1.answers as Record<string, unknown>)) {
    readableLayer1[questionMap[key] ?? key] = val
  }

  const content = await generateSection(
    section,
    instruction ?? '',
    readableLayer1,
    (layer2?.answers ?? {}) as Record<string, unknown>,
    (business as unknown as { business_types: { name: string } | null })?.business_types?.name ?? 'Business',
    (business as unknown as { name: string })?.name ?? '',
    staff ?? [],
    (report?.generated_content ?? {}) as Record<string, unknown>
  )

  return NextResponse.json({ section, content }, { headers: corsHeaders() })
}
