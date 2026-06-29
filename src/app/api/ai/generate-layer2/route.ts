import { createClient } from '@/lib/supabase/server'
import { generateLayer2Questions } from '@/lib/ai/openai'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { business_id, day1_date, day2_date, notes } = await req.json()

    const [{ data: business }, { data: layer1 }, { data: staff }] = await Promise.all([
      supabase.from('businesses').select('*, business_types(name)').eq('id', business_id).single(),
      supabase.from('layer1_responses').select('answers').eq('business_id', business_id).single(),
      supabase.from('staff_members').select('name, role').eq('business_id', business_id).eq('is_active', true),
    ])

    const questions = await generateLayer2Questions(
      layer1?.answers ?? {},
      (business as { business_types: { name: string } | null })?.business_types?.name ?? 'Business',
      staff ?? []
    )

    await supabase.from('observation_schedule').upsert({
      business_id,
      day1_date,
      day2_date,
      notes,
      generated_questions: questions,
    })

    return NextResponse.json({ success: true, question_count: questions.length })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
