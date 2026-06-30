import { verifyOperatorSecret, operatorAdminClient, forbidden, corsHeaders } from '@/lib/operator-auth'
import { NextResponse } from 'next/server'
import { notify, reportReadyNotification } from '@/lib/comms'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function GET(req: Request) {
  if (!verifyOperatorSecret(req)) return forbidden()
  const db = operatorAdminClient()
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

export async function PATCH(req: Request) {
  if (!verifyOperatorSecret(req)) return forbidden()
  const db = operatorAdminClient()
  const { business_id, generated_content } = await req.json()
  if (!business_id || generated_content === undefined)
    return NextResponse.json({ error: 'business_id and generated_content required' }, { status: 400, headers: corsHeaders() })

  const { error } = await db
    .from('reports')
    .update({ generated_content })
    .eq('business_id', business_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() })
  return NextResponse.json({ success: true }, { headers: corsHeaders() })
}

export async function POST(req: Request) {
  if (!verifyOperatorSecret(req)) return forbidden()
  const db = operatorAdminClient()
  const { report_id, admin_notes } = await req.json()

  const { error } = await db.from('reports').update({
    status: 'released',
    released_at: new Date().toISOString(),
    admin_notes,
  }).eq('id', report_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() })

  const { data: report } = await db.from('reports').select('business_id').eq('id', report_id).single()
  if (report) {
    await db.from('businesses').update({ stage: 'guide' }).eq('id', report.business_id)

    // Notify owner via ERA Comms (fire-and-forget — never blocks release)
    const { data: biz } = await db
      .from('businesses')
      .select('name, owner_name, owner_phone, owner_email')
      .eq('id', report.business_id)
      .single()

    if (biz) {
      const portalUrl = process.env.ERA_STRUCTURE_CLIENT_URL ?? 'https://era-structure-client.railway.app'
      notify(reportReadyNotification({
        ownerName:   biz.owner_name,
        businessName: biz.name,
        ownerPhone:  biz.owner_phone,
        ownerEmail:  biz.owner_email,
        portalUrl,
      }))
    }
  }

  return NextResponse.json({ success: true }, { headers: corsHeaders() })
}
