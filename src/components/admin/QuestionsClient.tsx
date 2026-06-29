'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { BusinessType, Question, InputType } from '@/types'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'

interface Props {
  businessTypes: BusinessType[]
  allQuestions: Question[]
}

const inputTypes: InputType[] = ['dropdown', 'multi-select', 'yes-no', 'short-text', 'number', 'voice-note']
const blocks = ['A', 'B', 'C', 'D', 'E', 'F']

export function QuestionsClient({ businessTypes, allQuestions }: Props) {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState(businessTypes[0]?.id ?? '')
  const [layer, setLayer] = useState<1 | 2>(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editInputType, setEditInputType] = useState<InputType>('short-text')
  const [editOptions, setEditOptions] = useState('')
  const [saving, setSaving] = useState(false)
  const [addingBlock, setAddingBlock] = useState<string | null>(null)
  const [newQ, setNewQ] = useState({ text: '', input_type: 'short-text' as InputType, options: '' })

  const questions = allQuestions.filter(q => q.business_type_id === selectedType && q.layer === layer)

  async function saveEdit(id: string) {
    setSaving(true)
    await fetch('/api/admin/questions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id, question_text: editText, input_type: editInputType,
        options: editOptions ? editOptions.split('\n').filter(Boolean) : null,
      }),
    })
    setSaving(false)
    setEditingId(null)
    router.refresh()
  }

  async function deleteQuestion(id: string) {
    await fetch('/api/admin/questions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    router.refresh()
  }

  async function addQuestion(block: string) {
    setSaving(true)
    await fetch('/api/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_type_id: selectedType, layer, block,
        question_text: newQ.text, input_type: newQ.input_type,
        options: newQ.options ? newQ.options.split('\n').filter(Boolean) : null,
      }),
    })
    setSaving(false)
    setAddingBlock(null)
    setNewQ({ text: '', input_type: 'short-text', options: '' })
    router.refresh()
  }

  async function addBusinessType() {
    const name = prompt('New business type name:')
    if (!name?.trim()) return
    await fetch('/api/admin/business-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    router.refresh()
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-7">
        <h1 className="text-xl font-bold text-[#0D1B3E]">Questions</h1>
        <Button size="sm" variant="ghost" onClick={addBusinessType}>
          <Plus size={14} className="mr-1" /> Add business type
        </Button>
      </div>

      {/* Type selector */}
      <div className="flex gap-2 flex-wrap mb-4">
        {businessTypes.map(t => (
          <button
            key={t.id}
            onClick={() => setSelectedType(t.id)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              selectedType === t.id
                ? 'bg-[#0D1B3E] text-white border-[#0D1B3E]'
                : 'bg-white text-[#666] border-[#0D1B3E]/15 hover:border-[#C9952B]'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* Layer toggle */}
      <div className="flex gap-2 mb-6">
        {([1, 2] as const).map(l => (
          <button
            key={l}
            onClick={() => setLayer(l)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              layer === l
                ? 'bg-[#C9952B] text-white border-[#C9952B]'
                : 'bg-white text-[#666] border-[#0D1B3E]/15 hover:border-[#C9952B]'
            }`}
          >
            Layer {l} {l === 1 ? '— Feeling Audit' : '— Observation'}
          </button>
        ))}
      </div>

      {/* Questions by block */}
      {blocks.map(block => {
        const blockQs = questions.filter(q => q.block === block)
        return (
          <div key={block} className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold text-[#0D1B3E]/50 uppercase tracking-widest">Block {block}</h2>
              <button onClick={() => setAddingBlock(block)} className="text-xs text-[#C9952B] hover:underline flex items-center gap-1">
                <Plus size={12} /> Add question
              </button>
            </div>

            <Card>
              <div className="divide-y divide-[#0D1B3E]/6">
                {blockQs.length === 0 && (
                  <div className="px-4 py-3 text-xs text-[#999]">No questions in this block</div>
                )}

                {blockQs.map(q => (
                  <div key={q.id} className="px-4 py-3">
                    {editingId === q.id ? (
                      <div className="space-y-2">
                        <textarea
                          className="w-full rounded-lg border border-[#C9952B] bg-white px-3 py-2 text-sm focus:outline-none"
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <select
                            value={editInputType}
                            onChange={e => setEditInputType(e.target.value as InputType)}
                            className="rounded-lg border border-[#0D1B3E]/15 bg-white px-2 py-1.5 text-xs focus:outline-none"
                          >
                            {inputTypes.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          {(editInputType === 'dropdown' || editInputType === 'multi-select') && (
                            <textarea
                              className="flex-1 rounded-lg border border-[#0D1B3E]/15 bg-white px-2 py-1.5 text-xs focus:outline-none"
                              placeholder="Options (one per line)"
                              value={editOptions}
                              onChange={e => setEditOptions(e.target.value)}
                              rows={2}
                            />
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(q.id)} className="flex items-center gap-1 text-xs text-green-600 hover:underline">
                            <Check size={12} /> Save
                          </button>
                          <button onClick={() => setEditingId(null)} className="flex items-center gap-1 text-xs text-[#999] hover:underline">
                            <X size={12} /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm text-[#1A1A2E]">{q.question_text}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="grey">{q.input_type}</Badge>
                            {q.options && <span className="text-xs text-[#999]">{(q.options as string[]).length} options</span>}
                          </div>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => {
                              setEditingId(q.id)
                              setEditText(q.question_text)
                              setEditInputType(q.input_type)
                              setEditOptions((q.options as string[] | null)?.join('\n') ?? '')
                            }}
                            className="p-1 text-[#999] hover:text-[#0D1B3E]"
                          >
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => deleteQuestion(q.id)} className="p-1 text-[#999] hover:text-red-500">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {addingBlock === block && (
                  <div className="px-4 py-3 space-y-2 bg-[#F4F2EE]/40">
                    <textarea
                      autoFocus
                      className="w-full rounded-lg border border-[#C9952B] bg-white px-3 py-2 text-sm focus:outline-none"
                      placeholder="Question text..."
                      value={newQ.text}
                      onChange={e => setNewQ(n => ({ ...n, text: e.target.value }))}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <select
                        value={newQ.input_type}
                        onChange={e => setNewQ(n => ({ ...n, input_type: e.target.value as InputType }))}
                        className="rounded-lg border border-[#0D1B3E]/15 bg-white px-2 py-1.5 text-xs"
                      >
                        {inputTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      {(newQ.input_type === 'dropdown' || newQ.input_type === 'multi-select') && (
                        <textarea
                          className="flex-1 rounded-lg border border-[#0D1B3E]/15 bg-white px-2 py-1.5 text-xs"
                          placeholder="Options (one per line)"
                          value={newQ.options}
                          onChange={e => setNewQ(n => ({ ...n, options: e.target.value }))}
                          rows={2}
                        />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" loading={saving} onClick={() => addQuestion(block)} disabled={!newQ.text.trim()}>Add</Button>
                      <Button size="sm" variant="ghost" onClick={() => setAddingBlock(null)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )
      })}
    </div>
  )
}
