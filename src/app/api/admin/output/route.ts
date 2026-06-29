import { verifyOperatorSecret, operatorAdminClient, forbidden, corsHeaders } from '@/lib/operator-auth'
import { NextResponse } from 'next/server'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function GET(req: Request) {
  if (!verifyOperatorSecret(req)) return forbidden()
  const db = operatorAdminClient()
  const url = new URL(req.url)
  const businessId = url.searchParams.get('businessId')
  let query = db
    .from('documents')
    .select('*, businesses(name)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  if (businessId) query = query.eq('business_id', businessId)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() })
  return NextResponse.json(data, { headers: corsHeaders() })
}
