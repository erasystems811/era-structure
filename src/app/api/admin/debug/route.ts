import { verifyOperatorSecret, operatorAdminClient, forbidden, corsHeaders } from '@/lib/operator-auth'
import { NextResponse } from 'next/server'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function GET(req: Request) {
  if (!verifyOperatorSecret(req)) return forbidden()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
  const hasOperatorSecret = !!process.env.STRUCTURE_OPERATOR_SECRET

  const db = operatorAdminClient()

  // Try the simplest possible query — no joins, no filters
  const { data: bizData, error: bizError } = await db
    .from('businesses')
    .select('id')
    .limit(1)

  // Try businesses with a join
  const { data: payData, error: payError } = await db
    .from('payments')
    .select('id, businesses(id)')
    .limit(1)

  return NextResponse.json({
    env: {
      supabaseUrl,
      hasAnonKey,
      hasServiceKey,
      hasOperatorSecret,
    },
    simpleQuery: bizError ? { error: bizError.message, code: bizError.code } : { ok: true, rows: bizData?.length },
    joinQuery: payError ? { error: payError.message, code: payError.code } : { ok: true, rows: payData?.length },
  }, { headers: corsHeaders() })
}
