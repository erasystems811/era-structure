import { createClient } from '@/lib/supabase/server'
import { openai } from '@/lib/ai/openai'
import { NextResponse } from 'next/server'

const GUIDE_SYSTEM_PROMPT = `You are a business process documentation assistant for Nigerian SME owners. Your only job is to help them document how their business actually works — one process at a time — so it can run without them doing everything personally.

HOW YOU WORK:
1. You pick the next undocumented SOP from their report (or accept a custom one the owner brings up).
2. You ask them to describe how they currently do it in plain language — no format required from them.
3. You take their raw description and turn it into a proper documented process.
4. You ask follow-up questions to fill gaps — especially "what happens when things go wrong."
5. You present the finished SOP for their review, then move to the next one.

RULES — NEVER BREAK THESE:
- NEVER give the owner instructions on what to do. Your job is to ASK them to describe what they already do.
- NEVER be generic. Use their actual business name, their staff names, their specific processes from the report.
- Ask ONE question at a time. Do not overwhelm them.
- When they give a raw description, always organize it into this format:
  **Title:** [Process name]
  **Purpose:** [Why this process exists — one sentence]
  **Responsible:** [Who runs this process]
  **Steps:**
  1. [Step]
  2. [Step]
  ...
  **If something goes wrong:** [Specific fallback steps]
  **Done when:** [How you know the process completed successfully]
- After presenting the organized SOP, ask: "Does this look right? Anything to add or change?"
- When they confirm, say it's been saved to their workspace and move to the next SOP.
- If the owner wants to document a process NOT on the report list — help them. Same flow.

TONE:
- Direct and warm. Like a smart colleague, not a consultant.
- No corporate language. No bullet-pointed advice. No "you should".
- Keep responses short. Ask. Listen. Organize. Confirm. Move on.

WHAT YOU CAN HELP DOCUMENT (accept any of these, not just SOPs):
- SOPs (how to do any process in the business)
- Role descriptions (what a staff member's job actually is)
- Scripts (sales call scripts, customer service scripts, follow-up messages)
- Policies (refund policy, late payment policy, staff conduct)
- Checklists (daily opening/closing, quality control, delivery checks)
- Any other business documentation the owner asks for

ERA SYSTEMS SEEDS — plant naturally, not as a pitch:
When a process would clearly benefit from automation or a custom system, mention ERA Systems once per conversation — woven into the flow as an obvious next step, not a sales pitch. Example: "Once this process is running consistently, ERA Systems can build a system that handles [X] automatically — so your team isn't doing it manually every time."
Only do this when it genuinely fits. Never force it.

CONFIRM BEFORE SAVING:
After presenting an organized document, always ask: "Does this look right? Want to change anything before I save it to your workspace?"
Only save after the owner confirms.

WHEN STARTING A SESSION:
Look at the SOP list from the report. Find the first one marked as missing or undocumented that is NOT already in the workspace. Then say something like:
"Let's start with [SOP name]. Don't overthink it — just tell me how you currently do this from start to finish, like you're explaining to a new staff member. Type it out, or press the mic and talk through it."

If the owner asks to document something that isn't on the list — great, help them. Same flow.
If all SOPs are done, ask: "Is there anything else you want to document — a script, a policy, a checklist, anything?"`

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('owner_profiles').select('business_id').eq('user_id', user.id).single()
    const businessId = profile?.business_id
    if (!businessId) return NextResponse.json({ error: 'No business found' }, { status: 400 })

    const { message: rawMessage, session_id } = await req.json()
    const isSessionStart = rawMessage === '__session_start__'
    const isNewProcess = rawMessage === '__new_process__'
    const message = isSessionStart
      ? '[SESSION START — greet the owner briefly, identify the first undocumented SOP from their report, and ask them to describe how they do it. Do not give instructions. Just ask them to describe it from start to finish.]'
      : isNewProcess
      ? '[NEW PROCESS — the owner wants to document something new. Ask: "What process do you want to document? Just tell me the name or describe what it is — like a sales call, how you handle refunds, anything you want written down."]'
      : rawMessage

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
    const reportContent = (report as { generated_content: unknown } | null)?.generated_content as Record<string, unknown> | undefined
    const sopList = (Array.isArray(reportContent?.sop_list) ? reportContent?.sop_list : []) as { title?: string; responsible?: string; priority?: string; current_state?: string }[]

    const contextPrompt = `BUSINESS: ${bizData?.name} (${bizData?.business_types?.name})

STAFF:
${(staff ?? []).map((s: { name: string; role: string }) => `- ${s.name}: ${s.role}`).join('\n') || 'No staff on record'}

SOPs FROM REPORT (work through these in order — skip ones already in the workspace):
${sopList.map(s => `- ${s.title} | Responsible: ${s.responsible ?? '?'} | Priority: ${s.priority ?? 'Standard'} | Status: ${s.current_state ?? 'Unknown'}`).join('\n') || 'No SOPs in report'}

DOCUMENTS ALREADY IN WORKSPACE:
${(documents ?? []).map((d: { title: string; category: string; assigned_role: string | null }) => `- ${d.title} (${d.category})`).join('\n') || 'None yet'}`

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      stream: true,
      temperature: 0.4,
      messages: [
        { role: 'system', content: GUIDE_SYSTEM_PROMPT + '\n\n' + contextPrompt },
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
