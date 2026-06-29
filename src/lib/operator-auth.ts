import { createAdminClient } from './supabase/server'
import { NextResponse } from 'next/server'

export function verifyOperatorSecret(req: Request): boolean {
  const secret = req.headers.get('x-operator-secret')
  return !!secret && secret === process.env.STRUCTURE_OPERATOR_SECRET
}

export async function operatorAdminClient() {
  return createAdminClient()
}

export function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders() })
}

export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Operator-Secret',
  }
}
