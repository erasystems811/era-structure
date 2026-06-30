import { verifyOperatorSecret, operatorAdminClient, forbidden, corsHeaders } from '@/lib/operator-auth'
import { NextResponse } from 'next/server'
import { generateReport } from '@/lib/ai/openai'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function POST(req: Request) {
  if (!verifyOperatorSecret(req)) return forbidden()
  const db = operatorAdminClient()
  const { business_id } = await req.json()
  if (!business_id) return NextResponse.json({ error: 'business_id required' }, { status: 400, headers: corsHeaders() })

  const { data: business } = await db.from('businesses').select('*, business_types(name, id)').eq('id', business_id).single()
  const bizTypeId = (business as unknown as { business_type_id: string } | null)?.business_type_id ?? ''

  const [
    { data: layer1 },
    { data: layer2 },
    { data: staff },
    { data: questions },
  ] = await Promise.all([
    db.from('layer1_responses').select('answers').eq('business_id', business_id).maybeSingle(),
    db.from('layer2_responses').select('answers').eq('business_id', business_id).maybeSingle(),
    db.from('staff_members').select('name, role').eq('business_id', business_id).eq('is_active', true),
    db.from('questions').select('id, question_text, block').eq('business_type_id', bizTypeId).eq('layer', 1).eq('is_active', true).order('order_index'),
  ])

  if (!layer1?.answers) return NextResponse.json({ error: 'No assessment answers found' }, { status: 400, headers: corsHeaders() })

  // Map UUID answer keys to readable question text for the AI
  const questionMap = Object.fromEntries((questions ?? []).map(q => [q.id, q.question_text]))
  const readableLayer1: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(layer1.answers as Record<string, unknown>)) {
    const label = questionMap[key] ?? key
    readableLayer1[label] = val
  }

  const content = await generateReport(
    readableLayer1,
    (layer2?.answers ?? {}) as Record<string, unknown>,
    (business as unknown as { business_types: { name: string } | null })?.business_types?.name ?? 'Business',
    (business as unknown as { name: string })?.name ?? '',
    staff ?? []
  )

  const { data: report, error } = await db
    .from('reports')
    .update({ generated_content: content, generated_at: new Date().toISOString() })
    .eq('business_id', business_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() })

  return NextResponse.json({ report }, { headers: corsHeaders() })
}
