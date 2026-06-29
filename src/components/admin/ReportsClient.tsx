'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatNaira } from '@/lib/utils'
import type { Report, ReportContent } from '@/types'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface ReportRow {
  id: string
  generated_at: string
  released_at: string | null
  status: string
  generated_content: ReportContent
  admin_notes: string | null
  businesses: { name: string; owner_name: string; business_types: { name: string } | null } | null
}

interface Props {
  pending: ReportRow[]
  released: ReportRow[]
  needsGeneration: { id: string; name: string; business_types: { name: string } | null }[]
}

export function ReportsClient({ pending, released, needsGeneration }: Props) {
  const router = useRouter()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)
  const [releasing, setReleasing] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  async function generateReport(businessId: string) {
    setGenerating(businessId)
    await fetch('/api/ai/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id: businessId }),
    })
    setGenerating(null)
    router.refresh()
  }

  async function releaseReport(reportId: string, businessId: string) {
    setReleasing(reportId)
    await fetch('/api/admin/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_id: reportId, admin_notes: notes[reportId] ?? '' }),
    })
    setReleasing(null)
    router.refresh()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-[#0D1B3E]">Reports</h1>

      {needsGeneration.length > 0 && (
        <Card gold>
          <div className="px-5 py-3.5 border-b border-[#C9952B]/20">
            <h2 className="text-sm font-semibold text-[#0D1B3E]">Assessment complete — generate report</h2>
          </div>
          <div className="divide-y divide-[#0D1B3E]/6">
            {needsGeneration.map(b => (
              <div key={b.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#0D1B3E]">{b.name}</p>
                  <p className="text-xs text-[#666]">{b.business_types?.name}</p>
                </div>
                <Button size="sm" loading={generating === b.id} onClick={() => generateReport(b.id)}>
                  Generate report
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {pending.length > 0 && (
        <Card>
          <div className="px-5 py-3.5 border-b border-[#0D1B3E]/8 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#0D1B3E]">Pending review</h2>
            <Badge variant="amber">{pending.length}</Badge>
          </div>
          <div className="divide-y divide-[#0D1B3E]/6">
            {pending.map(r => {
              const isOpen = expanded === r.id
              const totalLeak = (r.generated_content?.revenue_leaks ?? []).reduce((s, l) => s + l.monthly_naira, 0)
              return (
                <div key={r.id}>
                  <div
                    className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-[#F4F2EE]/50"
                    onClick={() => setExpanded(isOpen ? null : r.id)}
                  >
                    <div>
                      <p className="text-sm font-medium text-[#0D1B3E]">{r.businesses?.name}</p>
                      <p className="text-xs text-[#666] mt-0.5">{r.businesses?.business_types?.name} · Generated {formatDate(r.generated_at)}</p>
                      {totalLeak > 0 && <p className="text-xs text-red-600 mt-0.5">Revenue leak: {formatNaira(totalLeak)}/mo</p>}
                    </div>
                    {isOpen ? <ChevronUp size={16} className="text-[#666]" /> : <ChevronDown size={16} className="text-[#666]" />}
                  </div>

                  {isOpen && (
                    <div className="px-5 pb-5 space-y-4 bg-[#F4F2EE]/30">
                      {[
                        { key: 'business_snapshot', label: 'Business Snapshot' },
                        { key: 'contradiction', label: 'Contradiction' },
                        { key: 'gap_analysis', label: 'Gap Analysis' },
                        { key: 'delegation_readiness', label: 'Delegation Readiness' },
                        { key: 'priority_sequence', label: 'Priority Sequence' },
                        { key: 'structured_vision', label: 'Structured Vision' },
                      ].map(({ key, label }) => (
                        r.generated_content?.[key as keyof ReportContent] && (
                          <div key={key}>
                            <p className="text-xs font-semibold text-[#0D1B3E]/50 uppercase tracking-wide mb-1">{label}</p>
                            <p className="text-sm text-[#1A1A2E] leading-relaxed whitespace-pre-line">{r.generated_content[key as keyof ReportContent] as string}</p>
                          </div>
                        )
                      ))}

                      <div>
                        <label className="text-xs font-semibold text-[#0D1B3E]/50 uppercase tracking-wide block mb-1">Admin notes (internal)</label>
                        <textarea
                          className="w-full rounded-lg border border-[#0D1B3E]/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#C9952B] min-h-[80px]"
                          placeholder="Notes for your own reference..."
                          value={notes[r.id] ?? r.admin_notes ?? ''}
                          onChange={e => setNotes(n => ({ ...n, [r.id]: e.target.value }))}
                        />
                      </div>

                      <Button
                        loading={releasing === r.id}
                        onClick={() => releaseReport(r.id, r.businesses?.name ?? '')}
                        variant="secondary"
                      >
                        Release to client
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {released.length > 0 && (
        <Card>
          <div className="px-5 py-3.5 border-b border-[#0D1B3E]/8">
            <h2 className="text-sm font-semibold text-[#0D1B3E]">Released</h2>
          </div>
          <div className="divide-y divide-[#0D1B3E]/6">
            {released.map(r => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#0D1B3E]">{r.businesses?.name}</p>
                  <p className="text-xs text-[#666]">Released {r.released_at ? formatDate(r.released_at) : '—'}</p>
                </div>
                <Badge variant="green">Released</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
