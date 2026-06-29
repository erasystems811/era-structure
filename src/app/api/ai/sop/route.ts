import { createClient } from '@/lib/supabase/server'
import { openai, buildSopFromTranscription } from '@/lib/ai/openai'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const audio = formData.get('audio') as File
    const businessId = formData.get('business_id') as string

    const { data: business } = await supabase
      .from('businesses')
      .select('name, business_types(name)')
      .eq('id', businessId)
      .single()

    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audio,
      model: 'whisper-1',
    })

    return NextResponse.json({ text: transcription.text })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
