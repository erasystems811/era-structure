import { verifyOperatorSecret, operatorAdminClient, forbidden, corsHeaders } from '@/lib/operator-auth'
import { NextResponse } from 'next/server'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function GET(req: Request) {
  if (!verifyOperatorSecret(req)) return forbidden()
  const db = await operatorAdminClient()
  const { data, error } = await db
    .from('payments')
    .select('*, businesses(name, owner_name)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() })
  return NextResponse.json(data, { headers: corsHeaders() })
}
