import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const UNLOCK_AMOUNT = 5000 // ₦5,000

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { business_id } = await req.json()

  const { data: business } = await supabase
    .from('businesses')
    .select('name, owner_email, owner_name')
    .eq('id', business_id)
    .single()

  const ref = `era-unlock-${business_id}-${Date.now()}`

  await supabase.from('payments').insert({
    business_id,
    amount: UNLOCK_AMOUNT,
    currency: 'NGN',
    flutterwave_ref: ref,
    status: 'pending',
  })

  const payload = {
    tx_ref: ref,
    amount: UNLOCK_AMOUNT,
    currency: 'NGN',
    redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/assessment`,
    customer: {
      email: business?.owner_email,
      name: business?.owner_name,
    },
    customizations: {
      title: 'ERA Structure',
      description: 'Account unlock payment',
      logo: `${process.env.NEXT_PUBLIC_APP_URL}/logo.png`,
    },
  }

  const res = await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await res.json()
  return NextResponse.json({ payment_link: data.data?.link })
}
