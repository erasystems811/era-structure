import { verifyOperatorSecret, operatorAdminClient, forbidden, corsHeaders } from '@/lib/operator-auth'
import { NextResponse } from 'next/server'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function GET(req: Request) {
  if (!verifyOperatorSecret(req)) return forbidden()
  const db = operatorAdminClient()
  const url = new URL(req.url)
  const businessTypeId = url.searchParams.get('businessTypeId')
  const layer = url.searchParams.get('layer')
  let query = db.from('questions').select('*').eq('is_active', true).order('order_index')
  if (businessTypeId) query = query.eq('business_type_id', businessTypeId)
  if (layer) query = query.eq('layer', Number(layer))
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() })
  return NextResponse.json(data, { headers: corsHeaders() })
}

export async function POST(req: Request) {
  if (!verifyOperatorSecret(req)) return forbidden()
  const db = operatorAdminClient()
  const body = await req.json()
  const { error, data } = await db.from('questions').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() })
  return NextResponse.json(data, { headers: corsHeaders() })
}

export async function PATCH(req: Request) {
  if (!verifyOperatorSecret(req)) return forbidden()
  const db = operatorAdminClient()
  const { id, ...updates } = await req.json()
  const { error, data } = await db.from('questions').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() })
  return NextResponse.json(data, { headers: corsHeaders() })
}

export async function DELETE(req: Request) {
  if (!verifyOperatorSecret(req)) return forbidden()
  const db = operatorAdminClient()
  const { id } = await req.json()

  // Find the question so we can match it across all business types
  const { data: q } = await db.from('questions').select('question_text, layer, block').eq('id', id).single()

  if (q) {
    // Delete the same question from every business type
    await db.from('questions')
      .update({ is_active: false })
      .eq('question_text', q.question_text)
      .eq('layer', q.layer)
      .eq('block', q.block)
  } else {
    await db.from('questions').update({ is_active: false }).eq('id', id)
  }

  return NextResponse.json({ success: true }, { headers: corsHeaders() })
}
