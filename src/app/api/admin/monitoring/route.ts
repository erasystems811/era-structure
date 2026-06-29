import { verifyOperatorSecret, operatorAdminClient, forbidden, corsHeaders } from '@/lib/operator-auth'
import { NextResponse } from 'next/server'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function GET(req: Request) {
  if (!verifyOperatorSecret(req)) return forbidden()
  const db = operatorAdminClient()

  const { data: businesses, error: e1 } = await db
    .from('businesses')
    .select('id, name, owner_name, owner_phone, stage, is_locked, locked_at, last_active_at, created_at')
    .eq('is_active', true)
  if (e1) return NextResponse.json({ error: `businesses: ${e1.message}` }, { status: 500, headers: corsHeaders() })

  const { data: documents, error: e2 } = await db
    .from('documents')
    .select('business_id, next_review_due, last_reviewed_at')
    .eq('is_active', true)
  if (e2) return NextResponse.json({ error: `documents: ${e2.message}` }, { status: 500, headers: corsHeaders() })

  const { data: checklists, error: e3 } = await db
    .from('checklists')
    .select('business_id, id, date')
    .gte('date', new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10))
  if (e3) return NextResponse.json({ error: `checklists: ${e3.message}` }, { status: 500, headers: corsHeaders() })

  const { data: completions, error: e4 } = await db
    .from('checklist_completions')
    .select('checklist_id, completed')
    .gte('completed_at', new Date(Date.now() - 7 * 86400000).toISOString())
  if (e4) return NextResponse.json({ error: `checklist_completions: ${e4.message}` }, { status: 500, headers: corsHeaders() })

  const now = new Date()
  const enriched = (businesses ?? []).map(b => {
    const bDocs = (documents ?? []).filter(d => d.business_id === b.id)

    // Compute doc health: overdue = red, due within 3 days = amber, else green
    const redDocs = bDocs.filter(d => d.next_review_due && new Date(d.next_review_due) < now).length
    const totalDocs = bDocs.length
    const docHealth = totalDocs === 0 ? 100 : Math.round(((totalDocs - redDocs) / totalDocs) * 100)

    const bChecklists = (checklists ?? []).filter(c => c.business_id === b.id)
    const bCompletions = (completions ?? []).filter(c => bChecklists.some(ch => ch.id === c.checklist_id))
    const totalTasks = bCompletions.length
    const doneTasks = bCompletions.filter(c => c.completed).length
    const checklistRate = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100)

    return { ...b, docHealth, checklistRate, overdueDocs: redDocs }
  })

  return NextResponse.json(enriched, { headers: corsHeaders() })
}
