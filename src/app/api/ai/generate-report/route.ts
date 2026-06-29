import { createClient } from '@/lib/supabase/server'
import { generateReport } from '@/lib/ai/openai'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('owner_profiles').select('role').eq('user_id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { business_id } = await req.json()

    const [
      { data: business },
      { data: layer1 },
      { data: layer2 },
      { data: staff },
    ] = await Promise.all([
      supabase.from('businesses').select('*, business_types(name)').eq('id', business_id).single(),
      supabase.from('layer1_responses').select('answers').eq('business_id', business_id).single(),
      supabase.from('layer2_responses').select('answers').eq('business_id', business_id).single(),
      supabase.from('staff_members').select('name, role').eq('business_id', business_id).eq('is_active', true),
    ])

    if (!layer1 || !layer2) {
      return NextResponse.json({ error: 'Assessment data incomplete' }, { status: 400 })
    }

    const content = await generateReport(
      layer1.answers,
      layer2.answers,
      (business as { business_types: { name: string } | null })?.business_types?.name ?? 'Business',
      (business as { name: string })?.name ?? '',
      staff ?? []
    )

    const { data: report, error } = await supabase
      .from('reports')
      .upsert({ business_id, generated_content: content, status: 'pending' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ report })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
