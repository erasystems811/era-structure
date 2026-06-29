'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { getDaysUntilReview, getDocumentHealth } from '@/lib/utils'
import type { Document, DocumentCategory } from '@/types'
import { ExternalLink, CheckCircle, FolderOpen } from 'lucide-react'

const categories: { key: DocumentCategory; label: string; emoji: string }[] = [
  { key: 'operations', label: 'Operations', emoji: '⚙' },
  { key: 'people', label: 'People', emoji: '👥' },
  { key: 'finance', label: 'Finance', emoji: '₦' },
  { key: 'customer', label: 'Customer', emoji: '⭐' },
  { key: 'standards', label: 'Standards', emoji: '📋' },
]

interface Props {
  documents: (Document & { staff_members: { name: string } | null })[]
  business: { name: string; is_locked: boolean } | null
  businessId: string
}

export function WorkspaceView({ documents, business, businessId }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function markReviewed(docId: string) {
    setLoading(docId)
    const nextReviewDue = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    await supabase.from('documents').update({
      last_reviewed_at: new Date().toISOString(),
      next_review_due: nextReviewDue,
    }).eq('id', docId)
    await supabase.from('document_reviews').insert({ document_id: docId, reviewed_at: new Date().toISOString() })
    setLoading(null)
    router.refresh()
  }

  const byCategory = categories.map(cat => ({
    ...cat,
    docs: documents.filter(d => d.category === cat.key),
  }))

  const totalDocs = documents.length
  const overdueCount = documents.filter(d => getDocumentHealth(d.next_review_due, false) === 'red').length

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0D1B3E]">Workspace</h1>
          <p className="text-sm text-[#666] mt-0.5">{business?.name}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="navy">{totalDocs} documents</Badge>
          {overdueCount > 0 && <Badge variant="red">{overdueCount} overdue</Badge>}
        </div>
      </div>

      {totalDocs === 0 && (
        <Card>
          <CardBody className="text-center py-12">
            <FolderOpen size={32} className="text-[#C9952B]/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-[#0D1B3E] mb-1">No documents yet</p>
            <p className="text-sm text-[#666]">Your guide bot will build documents here as you work through your structure.</p>
            <Button className="mt-4" onClick={() => router.push('/app/guide')}>Go to Guide Bot</Button>
          </CardBody>
        </Card>
      )}

      {byCategory.map(({ key, label, emoji, docs }) => {
        if (docs.length === 0) return null
        return (
          <div key={key}>
            <h2 className="text-xs font-semibold text-[#0D1B3E]/50 uppercase tracking-widest mb-2.5">
              {emoji} {label}
            </h2>
            <div className="space-y-2">
              {docs.map(doc => {
                const health = getDocumentHealth(doc.next_review_due, false)
                const days = getDaysUntilReview(doc.next_review_due)
                return (
                  <Card key={doc.id}>
                    <div className="px-4 py-3.5 flex items-center gap-3">
                      {/* Health indicator */}
                      <div className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${
                        health === 'green' ? 'bg-green-500' :
                        health === 'amber' ? 'bg-amber-500' : 'bg-red-500'
                      }`} />

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0D1B3E] truncate">{doc.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {doc.assigned_role && (
                            <span className="text-xs text-[#C9952B]">{doc.assigned_role}</span>
                          )}
                          {health !== 'green' && (
                            <span className={`text-xs ${health === 'amber' ? 'text-amber-600' : 'text-red-600'}`}>
                              {days < 0 ? `${Math.abs(days)} days overdue` : `${days} days left`}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {doc.google_doc_url && (
                          <a
                            href={doc.google_doc_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-[#666] hover:text-[#0D1B3E] hover:bg-[#0D1B3E]/5 transition-colors"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <button
                          onClick={() => markReviewed(doc.id)}
                          disabled={loading === doc.id}
                          className="flex items-center gap-1 text-xs text-[#666] hover:text-green-600 transition-colors px-2 py-1 rounded-lg hover:bg-green-50"
                        >
                          <CheckCircle size={13} />
                          <span className="hidden sm:block">Reviewed</span>
                        </button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
