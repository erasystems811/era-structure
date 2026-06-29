import { createClient } from '@/lib/supabase/server'
import { openai, MASTER_PROMPT } from '@/lib/ai/openai'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('owner_profiles').select('business_id').eq('user_id', user.id).single()
    const businessId = profile?.business_id
    if (!businessId) return NextResponse.json({ error: 'No business found' }, { status: 400 })

    const { message, session_id } = await req.json()

    const [
      { data: business },
      { data: report },
      { data: session },
      { data: documents },
      { data: staff },
    ] = await Promise.all([
      supabase.from('businesses').select('name, stage, business_types(name)').eq('id', businessId).single(),
      supabase.from('reports').select('generated_content').eq('business_id', businessId).eq('status', 'released').single(),
      session_id
        ? supabase.from('guide_sessions').select('messages, completed_tasks').eq('id', session_id).single()
        : Promise.resolve({ data: null }),
      supabase.from('documents').select('title, category, assigned_role').eq('business_id', businessId).eq('is_active', true),
      supabase.from('staff_members').select('name, role').eq('business_id', businessId).eq('is_active', true),
    ])

    const messages = (session?.messages as { role: string; content: string }[]) ?? []
    const completedTasks = session?.completed_tasks ?? []

    const bizData = business as unknown as { name: string; stage: string; business_types: { name: string } | null }
    const contextPrompt = `
BUSINESS: ${bizData?.name} (${bizData?.business_types?.name})
STAGE: ${bizData?.stage}

STAFF:
${(staff ?? []).map((s: { name: string; role: string }) => `- ${s.name}: ${s.role}`).join('\n')}

REPORT FINDINGS:
${JSON.stringify((report as { generated_content: unknown })?.generated_content ?? {}, null, 2)}

WORKSPACE DOCUMENTS BUILT SO FAR:
${(documents ?? []).map((d: { title: string; category: string; assigned_role: string | null }) => `- ${d.title} (${d.category}) — assigned to ${d.assigned_role ?? 'unassigned'}`).join('\n') || 'None yet'}

COMPLETED TASKS THIS PROGRAMME:
${completedTasks.length > 0 ? completedTasks.join(', ') : 'None yet'}

MODE DETECTION — determine which mode applies to the owner's message and respond accordingly:
- ACTIVATE TASK: Owner is ready to work. Ask minimum questions. Produce a deliverable.
- MAKE OUTPUT: Generate the actual document (SOP, role card, process map). Ask for voice note if SOP needed.
- CHALLENGE AVOIDANCE: Owner is making excuses. Ask specifically what prevented it. Do not validate avoidance. Warm but not soft.
- TRACK PROGRESS: Owner is checking in. Summarise what is done and what is next. Be specific.

Never ask for more information than necessary. Never be generic.`

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      stream: true,
      temperature: 0.3,
      messages: [
        { role: 'system', content: MASTER_PROMPT + '\n\n' + contextPrompt },
        ...messages.slice(-10).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: message },
      ],
    })

    const encoder = new TextEncoder()
    let fullContent = ''

    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) {
            fullContent += text
            controller.enqueue(encoder.encode(text))
          }
        }

        // Save messages to session
        const updatedMessages = [
          ...messages,
          { role: 'user', content: message, timestamp: new Date().toISOString() },
          { role: 'assistant', content: fullContent, timestamp: new Date().toISOString() },
        ]

        if (session_id) {
          await supabase.from('guide_sessions').update({ messages: updatedMessages }).eq('id', session_id)
        } else {
          await supabase.from('guide_sessions').insert({ business_id: businessId, messages: updatedMessages })
        }

        controller.close()
      },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
