import { verifyOperatorSecret, operatorAdminClient, forbidden, corsHeaders } from '@/lib/operator-auth'
import { NextResponse } from 'next/server'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function GET(req: Request) {
  if (!verifyOperatorSecret(req)) return forbidden()
  const db = await operatorAdminClient()

  const [
    { data: businesses },
    { data: documents },
    { data: checklists },
    { data: completions },
  ] = await Promise.all([
    db.from('businesses').select('id, name, owner_name, owner_phone, stage, is_locked, locked_at, last_active_at, created_at').eq('is_active', true),
    db.from('documents').select('business_id, health_status, next_review_due').eq('is_active', true),
    db.from('checklists').select('business_id, id, date').gte('date', new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)),
    db.from('checklist_completions').select('checklist_id, completed_count, total_count').gte('completed_at', new Date(Date.now() - 7 * 86400000).toISOString()),
  ])

  const now = new Date()
  const enriched = (businesses ?? []).map(b => {
    const bDocs = (documents ?? []).filter(d => d.business_id === b.id)
    const redDocs = bDocs.filter(d => d.health_status === 'red').length
    const totalDocs = bDocs.length
    const docHealth = totalDocs === 0 ? 100 : Math.round(((totalDocs - redDocs) / totalDocs) * 100)

    const bChecklists = (checklists ?? []).filter(c => c.business_id === b.id)
    const bCompletions = (completions ?? []).filter(c => bChecklists.some(ch => ch.id === c.checklist_id))
    const totalTasks = bCompletions.reduce((s, c) => s + (c.total_count ?? 0), 0)
    const doneTasks = bCompletions.reduce((s, c) => s + (c.completed_count ?? 0), 0)
    const checklistRate = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100)

    const overdueDocs = bDocs.filter(d => d.next_review_due && new Date(d.next_review_due) < now).length

    return { ...b, docHealth, checklistRate, overdueDocs }
  })

  return NextResponse.json(enriched, { headers: corsHeaders() })
}
