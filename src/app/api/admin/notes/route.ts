import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { business_id, note } = await req.json()
  await supabase.from('admin_notes').insert({ business_id, note, created_by: user.email })
  return NextResponse.json({ success: true })
}
