import { verifyOperatorSecret, operatorAdminClient, forbidden, corsHeaders } from '@/lib/operator-auth'
import { NextResponse } from 'next/server'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

// POST /api/admin/questions/copy
// Copies all active questions from source_business_type_id to every other business type
export async function POST(req: Request) {
  if (!verifyOperatorSecret(req)) return forbidden()
  const db = operatorAdminClient()
  const { source_business_type_id } = await req.json()

  // Get source questions
  const { data: sourceQs, error: fetchErr } = await db
    .from('questions')
    .select('layer, block, question_text, input_type, options, order_index')
    .eq('business_type_id', source_business_type_id)
    .eq('is_active', true)
    .order('order_index')

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500, headers: corsHeaders() })
  if (!sourceQs?.length) return NextResponse.json({ error: 'No questions found in source type' }, { status: 400, headers: corsHeaders() })

  // Get all other business types
  const { data: types, error: typesErr } = await db
    .from('business_types')
    .select('id')
    .neq('id', source_business_type_id)

  if (typesErr) return NextResponse.json({ error: typesErr.message }, { status: 500, headers: corsHeaders() })

  let copied = 0
  for (const type of types ?? []) {
    // Soft-delete existing questions for this type
    await db.from('questions').update({ is_active: false }).eq('business_type_id', type.id)

    // Insert copy of source questions
    const rows = sourceQs.map(q => ({ ...q, business_type_id: type.id }))
    const { error: insertErr } = await db.from('questions').insert(rows)
    if (!insertErr) copied += rows.length
  }

  return NextResponse.json({ success: true, copied }, { headers: corsHeaders() })
}
