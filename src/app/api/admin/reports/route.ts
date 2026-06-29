import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { report_id, admin_notes } = await req.json()

  const { error } = await supabase.from('reports').update({
    status: 'released',
    released_at: new Date().toISOString(),
    admin_notes,
  }).eq('id', report_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update business stage to guide
  const { data: report } = await supabase.from('reports').select('business_id').eq('id', report_id).single()
  if (report) {
    await supabase.from('businesses').update({ stage: 'guide' }).eq('id', report.business_id)
  }

  return NextResponse.json({ success: true })
}
