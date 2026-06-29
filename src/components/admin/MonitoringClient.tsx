'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import { ChevronDown, ChevronUp, StickyNote } from 'lucide-react'
import type { Business, AdminNote } from '@/types'

interface Props {
  businesses: (Business & { business_types: { name: string } | null })[]
  documents: { business_id: string; next_review_due: string | null; is_active: boolean }[]
  sessions: { business_id: string; session_date: string }[]
  checklists: { business_id: string; id: string }[]
  completions: { checklist_id: string; completed: boolean }[]
  adminNotes: AdminNote[]
}

function getHealthVariant(score: number): 'green' | 'amber' | 'red' {
  if (score >= 80) return 'green'
  if (score >= 50) return 'amber'
  return 'red'
}

export function MonitoringClient({ businesses, documents, sessions, checklists, completions, adminNotes }: Props) {
  const router = useRouter()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [note, setNote] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  const rows = businesses.map(b => {
    const bizDocs = documents.filter(d => d.business_id === b.id)
    const overdueCount = bizDocs.filter(d => {
      if (!d.next_review_due) return false
      return new Date(d.next_review_due) < new Date()
    }).length
    const docHealth = bizDocs.length > 0 ? Math.round(((bizDocs.length - overdueCount) / bizDocs.length) * 100) : 100

    const lastSession = sessions.filter(s => s.business_id === b.id)[0]
    const bizChecklists = checklists.filter(c => c.business_id === b.id)
    const totalTasks = bizChecklists.reduce((sum, c) => {
      const comps = completions.filter(x => x.checklist_id === c.id)
      return sum + comps.length
    }, 0)
    const doneTasks = bizChecklists.reduce((sum, c) => {
      const comps = completions.filter(x => x.checklist_id === c.id && x.completed)
      return sum + comps.length
    }, 0)
    const checklistPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : null
    const bizNotes = adminNotes.filter(n => n.business_id === b.id)

    return { ...b, docHealth, overdueCount, lastSession, checklistPct, bizNotes }
  })

  // Sort: locked first, then red, amber, green
  const sorted = [...rows].sort((a, b) => {
    if (a.is_locked && !b.is_locked) return -1
    if (!a.is_locked && b.is_locked) return 1
    return a.docHealth - b.docHealth
  })

  async function saveNote(businessId: string) {
    setSaving(businessId)
    await fetch('/api/admin/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id: businessId, note: note[businessId] }),
    })
    setNote(n => ({ ...n, [businessId]: '' }))
    setSaving(null)
    router.refresh()
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-xl font-bold text-[#0D1B3E] mb-7">Monitoring</h1>

      <Card>
        <div className="divide-y divide-[#0D1B3E]/6">
          {sorted.map(row => {
            const isOpen = expanded === row.id
            return (
              <div key={row.id}>
                <div
                  className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-[#F4F2EE]/50"
                  onClick={() => setExpanded(isOpen ? null : row.id)}
                >
                  {/* Status dot */}
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    row.is_locked ? 'bg-red-500' :
                    row.docHealth < 50 ? 'bg-red-400' :
                    row.docHealth < 80 ? 'bg-amber-400' : 'bg-green-500'
                  }`} />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0D1B3E]">{row.name}</p>
                    <p className="text-xs text-[#666]">{row.owner_name} · {row.business_types?.name}</p>
                  </div>

                  <div className="hidden md:flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-[#999]">Doc health</p>
                      <Badge variant={getHealthVariant(row.docHealth)}>{row.docHealth}%</Badge>
                    </div>
                    {row.checklistPct !== null && (
                      <div className="text-right">
                        <p className="text-xs text-[#999]">Checklist</p>
                        <Badge variant={getHealthVariant(row.checklistPct)}>{row.checklistPct}%</Badge>
                      </div>
                    )}
                    <Badge variant={row.stage === 'assessment' ? 'grey' : row.stage === 'guide' ? 'gold' : 'navy'}>
                      {row.stage}
                    </Badge>
                    {row.is_locked && <Badge variant="red">Locked</Badge>}
                    {row.lastSession && (
                      <span className="text-xs text-[#999]">Last active {formatDate(row.lastSession.session_date)}</span>
                    )}
                  </div>

                  {isOpen ? <ChevronUp size={14} className="text-[#999] flex-shrink-0" /> : <ChevronDown size={14} className="text-[#999] flex-shrink-0" />}
                </div>

                {isOpen && (
                  <div className="px-5 pb-5 bg-[#F4F2EE]/30 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-white rounded-lg p-3 border border-[#0D1B3E]/8">
                        <p className="text-xs text-[#999]">Document health</p>
                        <p className="text-xl font-bold text-[#0D1B3E]">{row.docHealth}%</p>
                        {row.overdueCount > 0 && <p className="text-xs text-red-500">{row.overdueCount} overdue</p>}
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-[#0D1B3E]/8">
                        <p className="text-xs text-[#999]">Checklist completion</p>
                        <p className="text-xl font-bold text-[#0D1B3E]">{row.checklistPct !== null ? `${row.checklistPct}%` : '—'}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-[#0D1B3E]/8">
                        <p className="text-xs text-[#999]">Stage</p>
                        <p className="text-sm font-semibold text-[#0D1B3E] mt-0.5 capitalize">{row.stage}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-[#0D1B3E]/8">
                        <p className="text-xs text-[#999]">Status</p>
                        <p className="text-sm font-semibold mt-0.5">{row.is_locked ? '🔒 Locked' : '✓ Active'}</p>
                      </div>
                    </div>

                    {/* Call notes */}
                    <div>
                      <p className="text-xs font-semibold text-[#0D1B3E]/50 uppercase tracking-wide mb-2">Call notes</p>
                      {row.bizNotes.map(n => (
                        <div key={n.id} className="bg-white rounded-lg px-3 py-2.5 border border-[#0D1B3E]/8 mb-2">
                          <p className="text-xs text-[#999] mb-0.5">{formatDate(n.created_at)}</p>
                          <p className="text-sm text-[#1A1A2E]">{n.note}</p>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-2">
                        <input
                          placeholder="Add call note..."
                          className="flex-1 rounded-lg border border-[#0D1B3E]/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#C9952B]"
                          value={note[row.id] ?? ''}
                          onChange={e => setNote(n => ({ ...n, [row.id]: e.target.value }))}
                        />
                        <Button size="sm" loading={saving === row.id} onClick={() => saveNote(row.id)}>
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
