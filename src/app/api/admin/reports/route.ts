import { verifyOperatorSecret, operatorAdminClient, forbidden, corsHeaders } from '@/lib/operator-auth'
import { NextResponse } from 'next/server'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function GET(req: Request) {
  if (!verifyOperatorSecret(req)) return forbidden()
  const db = await operatorAdminClient()
  const url = new URL(req.url)
  const status = url.searchParams.get('status') ?? 'pending'
  const { data, error } = await db
    .from('reports')
    .select('*, businesses(name, owner_name, business_types(name))')
    .eq('status', status)
    .order('generated_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() })
  return NextResponse.json(data, { headers: corsHeaders() })
}

export async function POST(req: Request) {
  if (!verifyOperatorSecret(req)) return forbidden()
  const db = await operatorAdminClient()
  const { report_id, admin_notes } = await req.json()

  const { error } = await db.from('reports').update({
    status: 'released',
    released_at: new Date().toISOString(),
    admin_notes,
  }).eq('id', report_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() })

  const { data: report } = await db.from('reports').select('business_id').eq('id', report_id).single()
  if (report) await db.from('businesses').update({ stage: 'guide' }).eq('id', report.business_id)

  return NextResponse.json({ success: true }, { headers: corsHeaders() })
}
