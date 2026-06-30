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

  const [
    { data: business },
    { data: layer1 },
    { data: layer2 },
    { data: staff },
  ] = await Promise.all([
    db.from('businesses').select('*, business_types(name)').eq('id', business_id).single(),
    db.from('layer1_responses').select('answers').eq('business_id', business_id).maybeSingle(),
    db.from('layer2_responses').select('answers').eq('business_id', business_id).maybeSingle(),
    db.from('staff_members').select('name, role').eq('business_id', business_id).eq('is_active', true),
  ])

  if (!layer1?.answers) return NextResponse.json({ error: 'No assessment answers found' }, { status: 400, headers: corsHeaders() })

  const content = await generateReport(
    layer1.answers as Record<string, unknown>,
    (layer2?.answers ?? {}) as Record<string, unknown>,
    (business as unknown as { business_types: { name: string } | null })?.business_types?.name ?? 'Business',
    (business as unknown as { name: string })?.name ?? '',
    staff ?? []
  )

  const { data: report, error } = await db
    .from('reports')
    .update({ generated_content: content, generated_at: new Date().toISOString() })
    .eq('business_id', business_id)
    .eq('status', 'pending')
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() })

  return NextResponse.json({ report }, { headers: corsHeaders() })
}
