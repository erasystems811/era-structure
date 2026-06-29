import { createClient } from '@/lib/supabase/server'
import { MonitoringClient } from '@/components/admin/MonitoringClient'

export default async function MonitoringPage() {
  const supabase = await createClient()

  const { data: businesses } = await supabase
    .from('businesses')
    .select('*, business_types(name)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // Get document health per business
  const { data: documents } = await supabase
    .from('documents')
    .select('business_id, next_review_due, is_active')
    .eq('is_active', true)

  // Get guide sessions
  const { data: sessions } = await supabase
    .from('guide_sessions')
    .select('business_id, session_date')
    .order('session_date', { ascending: false })

  // Get checklist completions this week
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const { data: checklists } = await supabase
    .from('checklists')
    .select('business_id, id')
    .gte('date', weekStart.toISOString().split('T')[0])

  const { data: completions } = await supabase
    .from('checklist_completions')
    .select('checklist_id, completed')

  const { data: adminNotes } = await supabase
    .from('admin_notes')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <MonitoringClient
      businesses={businesses ?? []}
      documents={documents ?? []}
      sessions={sessions ?? []}
      checklists={checklists ?? []}
      completions={completions ?? []}
      adminNotes={adminNotes ?? []}
    />
  )
}
