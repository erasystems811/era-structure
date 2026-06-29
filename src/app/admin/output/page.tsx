import { createClient } from '@/lib/supabase/server'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { ExternalLink } from 'lucide-react'

export default async function OutputPage() {
  const supabase = await createClient()

  const { data: businesses } = await supabase.from('businesses').select('id, name').eq('is_active', true).order('name')
  const { data: documents } = await supabase.from('documents').select('*, businesses(name)').eq('is_active', true).order('created_at', { ascending: false })
  const { data: sessions } = await supabase.from('guide_sessions').select('*, businesses(name)').order('session_date', { ascending: false }).limit(50)
  const { data: reports } = await supabase.from('reports').select('*, businesses(name)').order('generated_at', { ascending: false })
  const { data: feedback } = await supabase.from('section_feedback').select('*, businesses(name)').order('submitted_at', { ascending: false }).limit(50)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-[#0D1B3E]">Output</h1>

      {/* Documents */}
      <Card>
        <div className="px-5 py-3.5 border-b border-[#0D1B3E]/8 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#0D1B3E]">Workspace documents</h2>
          <Badge variant="navy">{documents?.length ?? 0}</Badge>
        </div>
        <div className="divide-y divide-[#0D1B3E]/6 max-h-80 overflow-y-auto">
          {(documents ?? []).length === 0 && <div className="px-5 py-4 text-sm text-[#999]">None yet</div>}
          {(documents ?? []).map((d: { id: string; title: string; category: string; google_doc_url: string | null; created_at: string; businesses: { name: string } | null }) => (
            <div key={d.id} className="px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-[#1A1A2E]">{d.title}</p>
                <p className="text-xs text-[#666]">{d.businesses?.name} · {d.category} · {formatDate(d.created_at)}</p>
              </div>
              {d.google_doc_url && (
                <a href={d.google_doc_url} target="_blank" rel="noopener noreferrer" className="text-[#C9952B] hover:underline">
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Guide sessions */}
      <Card>
        <div className="px-5 py-3.5 border-b border-[#0D1B3E]/8 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#0D1B3E]">Guide bot sessions</h2>
          <Badge variant="navy">{sessions?.length ?? 0}</Badge>
        </div>
        <div className="divide-y divide-[#0D1B3E]/6 max-h-80 overflow-y-auto">
          {(sessions ?? []).map((s: { id: string; session_date: string; messages: unknown[]; completed_tasks: string[]; businesses: { name: string } | null }) => (
            <div key={s.id} className="px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-[#1A1A2E]">{s.businesses?.name}</p>
                <p className="text-xs text-[#666]">{formatDate(s.session_date)} · {(s.messages as unknown[]).length} messages</p>
              </div>
              {(s.completed_tasks ?? []).length > 0 && (
                <Badge variant="green">{s.completed_tasks.length} tasks done</Badge>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Section feedback */}
      {(feedback ?? []).length > 0 && (
        <Card>
          <div className="px-5 py-3.5 border-b border-[#0D1B3E]/8">
            <h2 className="text-sm font-semibold text-[#0D1B3E]">Section feedback</h2>
          </div>
          <div className="divide-y divide-[#0D1B3E]/6 max-h-80 overflow-y-auto">
            {(feedback ?? []).map((f: { id: string; section_name: string; question: string; response: string | null; submitted_at: string; businesses: { name: string } | null }) => (
              <div key={f.id} className="px-5 py-3">
                <p className="text-xs text-[#C9952B] font-medium">{f.section_name} · {f.businesses?.name}</p>
                <p className="text-xs text-[#666] mt-0.5">{f.question}</p>
                {f.response && <p className="text-sm text-[#1A1A2E] mt-1">"{f.response}"</p>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
