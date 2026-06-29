import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(req: Request) {
  const body = await req.text()
  const hash = req.headers.get('verif-hash')

  if (hash !== process.env.FLUTTERWAVE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(body)

  if (event.event === 'charge.completed' && event.data.status === 'successful') {
    const supabase = await createClient()
    const ref = event.data.tx_ref as string

    const { data: payment } = await supabase
      .from('payments')
      .select('business_id')
      .eq('flutterwave_ref', ref)
      .single()

    if (payment) {
      await Promise.all([
        supabase.from('payments').update({ status: 'successful', paid_at: new Date().toISOString(), unlock_triggered: true }).eq('flutterwave_ref', ref),
        supabase.from('businesses').update({ is_locked: false, locked_at: null }).eq('id', payment.business_id),
      ])
    }
  }

  return NextResponse.json({ received: true })
}
