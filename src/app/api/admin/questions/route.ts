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

  // Soft-delete the question
  const { error } = await db.from('questions').update({ is_active: false }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() })

  // Strip this question's answer from every layer1 and layer2 response
  for (const table of ['layer1_responses', 'layer2_responses'] as const) {
    const { data: rows } = await db.from(table).select('id, answers')
    for (const row of rows ?? []) {
      if (row.answers && id in row.answers) {
        const { [id]: _removed, ...rest } = row.answers as Record<string, unknown>
        await db.from(table).update({ answers: rest }).eq('id', row.id)
      }
    }
  }

  return NextResponse.json({ success: true }, { headers: corsHeaders() })
}
