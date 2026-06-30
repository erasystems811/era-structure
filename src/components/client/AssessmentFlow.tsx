'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatNaira } from '@/lib/utils'
import type { Question, StaffMember, Report, Layer1Response, ObservationSchedule, Layer2Response } from '@/types'
import { CheckCircle, Circle, Clock, ChevronLeft } from 'lucide-react'

interface Props {
  business: { name: string; business_types: { name: string; id: string } | null } | null
  layer1: Layer1Response | null
  observation: ObservationSchedule | null
  layer2: Layer2Response | null
  report: Report | null
  questions: Question[]
  staff: StaffMember[]
  businessId: string
}

type Step = 'intro' | 'layer1' | 'observation-schedule' | 'observation-form' | 'report'

export function AssessmentFlow({ business, layer1, observation, layer2, report, questions, staff, businessId }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const currentStep: Step = report
    ? 'report'
    : layer2
    ? 'report'
    : observation
    ? 'observation-form'
    : layer1
    ? 'observation-schedule'
    : 'intro'

  const [step, setStep] = useState<Step>(currentStep)
  const [answers, setAnswers] = useState<Record<string, unknown>>(layer1?.answers ?? {})
  const [staffList, setStaffList] = useState<{ name: string; role: string }[]>(
    staff.map(s => ({ name: s.name, role: s.role }))
  )
  const [obsNotes, setObsNotes] = useState('')
  const [obsDay1, setObsDay1] = useState('')
  const [obsDay2, setObsDay2] = useState('')
  const [obsAnswers, setObsAnswers] = useState<Record<string, unknown>>(layer2?.answers ?? {})
  const [loading, setLoading] = useState(false)

  const obsQuestions = (observation?.generated_questions as Question[] | null) ?? []

  async function submitLayer1() {
    setLoading(true)
    const { error } = await supabase.from('layer1_responses').upsert({
      business_id: businessId,
      answers: { ...answers, staff: staffList },
    })

    if (!error) {
      // Save staff members
      for (const s of staffList) {
        if (s.name && s.role) {
          await supabase.from('staff_members').upsert({ business_id: businessId, name: s.name, role: s.role }, { onConflict: 'business_id,name' })
        }
      }
      setStep('observation-schedule')
    }
    setLoading(false)
    router.refresh()
  }

  async function submitObsSchedule() {
    setLoading(true)
    const res = await fetch('/api/ai/generate-layer2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id: businessId, day1_date: obsDay1, day2_date: obsDay2, notes: obsNotes }),
    })
    if (res.ok) {
      setStep('observation-form')
      router.refresh()
    }
    setLoading(false)
  }

  async function submitLayer2() {
    setLoading(true)
    const { error } = await supabase.from('layer2_responses').upsert({ business_id: businessId, answers: obsAnswers })
    if (!error) {
      setStep('report')
      router.refresh()
    }
    setLoading(false)
  }

  if (step === 'report' && report) {
    const content = report.generated_content
    const totalLeak = (content.revenue_leaks ?? []).reduce((sum: number, l: { monthly_naira: number }) => sum + l.monthly_naira, 0)
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#0D1B3E]">Business Assessment Report</h1>
            <p className="text-sm text-[#666] mt-0.5">{business?.name} · {business?.business_types?.name}</p>
          </div>
          <Badge variant="green">Released</Badge>
        </div>

        {totalLeak > 0 && (
          <Card gold>
            <CardBody className="text-center py-6">
              <p className="text-xs text-[#C9952B] uppercase tracking-wide font-medium mb-1">Estimated monthly revenue leakage</p>
              <p className="text-4xl font-bold text-[#0D1B3E]">{formatNaira(totalLeak)}</p>
              <p className="text-xs text-[#666] mt-1">Based on your actual data across {content.revenue_leaks?.length ?? 0} identified gaps</p>
            </CardBody>
          </Card>
        )}

        {[
          { key: 'business_snapshot', title: 'Business Snapshot' },
          { key: 'contradiction', title: 'What We Found vs What You Said' },
          { key: 'gap_analysis', title: 'Structural Gap Analysis' },
          { key: 'delegation_readiness', title: 'Delegation Readiness' },
          { key: 'priority_sequence', title: 'Priority Fix Sequence' },
          { key: 'structured_vision', title: 'What Structured Looks Like' },
        ].map(({ key, title }) => (
          content[key as keyof typeof content] && (
            <Card key={key}>
              <div className="px-5 py-3.5 border-b border-[#0D1B3E]/8">
                <h2 className="text-sm font-semibold text-[#0D1B3E]">{title}</h2>
              </div>
              <CardBody>
                <p className="text-sm text-[#1A1A2E] leading-relaxed whitespace-pre-line">{content[key as keyof typeof content] as string}</p>
              </CardBody>
            </Card>
          )
        ))}

        {(content.revenue_leaks?.length ?? 0) > 0 && (
          <Card>
            <div className="px-5 py-3.5 border-b border-[#0D1B3E]/8">
              <h2 className="text-sm font-semibold text-[#0D1B3E]">Revenue Leak Breakdown</h2>
            </div>
            <div className="divide-y divide-[#0D1B3E]/6">
              {content.revenue_leaks?.map((leak: { title: string; description: string; calculation: string; monthly_naira: number }, i: number) => (
                <div key={i} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-[#0D1B3E]">{leak.title}</p>
                      <p className="text-sm text-[#666] mt-0.5">{leak.description}</p>
                      <p className="text-xs text-[#999] mt-1">{leak.calculation}</p>
                    </div>
                    <span className="text-sm font-bold text-red-600 whitespace-nowrap">{formatNaira(leak.monthly_naira)}/mo</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card>
          <CardBody className="text-center py-6">
            <p className="text-sm text-[#0D1B3E] font-medium mb-3">Ready to fix this?</p>
            <Button onClick={() => router.push('/app/guide')}>Start with the Guide Bot</Button>
          </CardBody>
        </Card>
      </div>
    )
  }

  if (step === 'report' && !report) {
    return (
      <Card>
        <CardBody className="text-center py-12">
          <Clock size={32} className="text-[#C9952B] mx-auto mb-3" />
          <h2 className="text-base font-semibold text-[#0D1B3E] mb-1">Assessment submitted</h2>
          <p className="text-sm text-[#666]">Your report is being reviewed. You will receive a WhatsApp message when it is ready.</p>
        </CardBody>
      </Card>
    )
  }

  // Progress steps
  const steps = [
    { label: 'Business Assessment', done: !!layer1 },
    { label: 'Observation Schedule', done: !!observation },
    { label: 'Observation Day', done: !!layer2 },
    { label: 'Your Report', done: !!report },
  ]

  if (step === 'intro') {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-[#0D1B3E]">Business Assessment</h1>
          <p className="text-sm text-[#666] mt-0.5">Welcome, {business?.name}</p>
        </div>

        {/* Progress */}
        <div className="flex gap-3">
          {steps.map(({ label, done }, i) => (
            <div key={i} className="flex-1 text-center">
              <div className={`h-1.5 rounded-full mb-1.5 ${done ? 'bg-[#C9952B]' : 'bg-[#0D1B3E]/10'}`} />
              <p className="text-xs text-[#666] hidden sm:block">{label}</p>
            </div>
          ))}
        </div>

        <Card>
          <CardBody className="py-6">
            <p className="text-sm text-[#1A1A2E] leading-relaxed">
              This assessment has two stages. First, you answer specific questions about your business — how it runs, who does what, how money moves. Then you schedule an observation day where we capture what is actually happening while the business is running.
            </p>
            <p className="text-sm text-[#1A1A2E] leading-relaxed mt-3">
              At the end you receive a full diagnostic report — including every structural gap, every revenue leak calculated in naira, and the exact sequence in which to fix them.
            </p>
            <Button className="mt-5" onClick={() => setStep('layer1')}>Start assessment</Button>
          </CardBody>
        </Card>
      </div>
    )
  }

  if (step === 'layer1') {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-[#0D1B3E]">Business Assessment</h1>
          <p className="text-sm text-[#666] mt-0.5">Answer from what is actually true — not what you think should be</p>
        </div>

        {/* Staff section */}
        <Card>
          <div className="px-5 py-3.5 border-b border-[#0D1B3E]/8">
            <h2 className="text-sm font-semibold text-[#0D1B3E]">Staff</h2>
          </div>
          <CardBody className="space-y-3">
            <div>
              <label className="text-sm font-medium text-[#1A1A2E] block mb-1.5">How many staff do you have including yourself?</label>
              <input
                type="number"
                min={1}
                className="w-32 rounded-lg border border-[#0D1B3E]/15 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#C9952B]"
                value={(answers.staff_count as number) ?? ''}
                onChange={e => setAnswers(a => ({ ...a, staff_count: parseInt(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#1A1A2E] block mb-2">Staff members — name and role</label>
              {staffList.map((s, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    placeholder="Name"
                    className="flex-1 rounded-lg border border-[#0D1B3E]/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#C9952B]"
                    value={s.name}
                    onChange={e => setStaffList(l => l.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                  />
                  <input
                    placeholder="Role (e.g. Front desk)"
                    className="flex-1 rounded-lg border border-[#0D1B3E]/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#C9952B]"
                    value={s.role}
                    onChange={e => setStaffList(l => l.map((x, j) => j === i ? { ...x, role: e.target.value } : x))}
                  />
                </div>
              ))}
              <button onClick={() => setStaffList(l => [...l, { name: '', role: '' }])} className="text-xs text-[#C9952B] hover:underline">+ Add staff member</button>
            </div>
          </CardBody>
        </Card>

        {/* Dynamic questions by block */}
        {['A', 'B', 'C', 'D', 'E', 'F'].map(block => {
          const blockQs = questions.filter(q => q.block === block)
          if (blockQs.length === 0) return null
          const blockNames: Record<string, string> = {
            A: 'Business Fundamentals', B: 'Owner Load', C: 'Operations',
            D: 'People & Staff', E: 'Financial Visibility', F: 'Customer Management'
          }
          return (
            <Card key={block}>
              <div className="px-5 py-3.5 border-b border-[#0D1B3E]/8">
                <h2 className="text-sm font-semibold text-[#0D1B3E]">{blockNames[block]}</h2>
              </div>
              <CardBody className="space-y-4">
                {blockQs.map(q => (
                  <QuestionField key={q.id} question={q} value={answers[q.id]} onChange={v => setAnswers(a => ({ ...a, [q.id]: v }))} />
                ))}
              </CardBody>
            </Card>
          )
        })}

        <div className="flex gap-3">
          <button onClick={() => setStep('intro')} className="flex items-center gap-1 text-sm text-[#666] hover:text-[#0D1B3E] transition">
            <ChevronLeft size={16} /> Back
          </button>
          <Button onClick={submitLayer1} loading={loading} size="lg" className="flex-1">
            Submit assessment
          </Button>
        </div>
      </div>
    )
  }

  if (step === 'observation-schedule') {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-bold text-[#0D1B3E]">Observation Day</h1>
        <Card>
          <CardBody className="space-y-4">
            <p className="text-sm text-[#1A1A2E] leading-relaxed">
              The next step is your Business Observation Day. This is not another questionnaire — it is a real-time snapshot of your business while it is running. You will receive specific questions throughout the day built from what you told us in your assessment. Answer them from exactly what you are seeing around you — not from memory.
            </p>
            <p className="text-sm text-[#1A1A2E] leading-relaxed">
              You need 2 consecutive working days. The more accurate your answers, the more accurate your diagnosis will be.
            </p>

            <div>
              <label className="text-sm font-medium text-[#1A1A2E] block mb-1.5">Is there anything happening on those days that could affect how the business runs?</label>
              <input
                placeholder="E.g. key staff absent, unusually quiet day..."
                className="w-full rounded-lg border border-[#0D1B3E]/15 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#C9952B]"
                value={obsNotes}
                onChange={e => setObsNotes(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-[#1A1A2E] block mb-1.5">Day 1</label>
                <input type="date" className="w-full rounded-lg border border-[#0D1B3E]/15 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#C9952B]" value={obsDay1} onChange={e => setObsDay1(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-[#1A1A2E] block mb-1.5">Day 2</label>
                <input type="date" className="w-full rounded-lg border border-[#0D1B3E]/15 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#C9952B]" value={obsDay2} onChange={e => setObsDay2(e.target.value)} />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('layer1')} className="flex items-center gap-1 text-sm text-[#666] hover:text-[#0D1B3E] transition">
                <ChevronLeft size={16} /> Edit answers
              </button>
              <Button onClick={submitObsSchedule} loading={loading} disabled={!obsDay1 || !obsDay2} className="flex-1">
                Confirm observation days
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  if (step === 'observation-form') {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-[#0D1B3E]">Observation Day</h1>
          <p className="text-sm text-[#666] mt-0.5">Answer from what is happening around you right now</p>
        </div>

        {obsQuestions.length === 0 ? (
          <Card><CardBody className="text-center py-8 text-sm text-[#666]">Questions are being prepared. Check back shortly.</CardBody></Card>
        ) : (
          <Card>
            <CardBody className="space-y-5">
              {obsQuestions.map((q: Question, i: number) => (
                <QuestionField key={i} question={q} value={obsAnswers[String(i)]} onChange={v => setObsAnswers(a => ({ ...a, [String(i)]: v }))} />
              ))}
            </CardBody>
          </Card>
        )}

        {obsQuestions.length > 0 && (
          <div className="flex gap-3">
            <button onClick={() => setStep('observation-schedule')} className="flex items-center gap-1 text-sm text-[#666] hover:text-[#0D1B3E] transition">
              <ChevronLeft size={16} /> Back
            </button>
            <Button onClick={submitLayer2} loading={loading} size="lg" className="flex-1">
              Submit observation
            </Button>
          </div>
        )}
      </div>
    )
  }

  return null
}

function QuestionField({ question, value, onChange }: { question: Question; value: unknown; onChange: (v: unknown) => void }) {
  const { input_type, question_text, options } = question

  return (
    <div>
      <label className="text-sm font-medium text-[#1A1A2E] block mb-1.5">{question_text}</label>

      {input_type === 'short-text' && (
        <input
          className="w-full rounded-lg border border-[#0D1B3E]/15 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#C9952B]"
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
        />
      )}

      {input_type === 'number' && (
        <input
          type="number"
          className="w-full rounded-lg border border-[#0D1B3E]/15 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#C9952B]"
          value={(value as number) ?? ''}
          onChange={e => onChange(parseFloat(e.target.value))}
        />
      )}

      {input_type === 'dropdown' && options && (
        <select
          className="w-full rounded-lg border border-[#0D1B3E]/15 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#C9952B]"
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">Select</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )}

      {input_type === 'yes-no' && (
        <div className="flex gap-3">
          {['Yes', 'No'].map(opt => (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`px-5 py-2 rounded-lg text-sm font-medium border transition-colors ${
                value === opt
                  ? 'bg-[#0D1B3E] text-white border-[#0D1B3E]'
                  : 'bg-white text-[#666] border-[#0D1B3E]/15 hover:border-[#C9952B]'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {input_type === 'multi-select' && options && (
        <div className="flex flex-wrap gap-2">
          {options.map(o => {
            const selected = ((value as string[]) ?? []).includes(o)
            return (
              <button
                key={o}
                onClick={() => {
                  const curr = (value as string[]) ?? []
                  onChange(selected ? curr.filter(x => x !== o) : [...curr, o])
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  selected
                    ? 'bg-[#0D1B3E] text-white border-[#0D1B3E]'
                    : 'bg-white text-[#666] border-[#0D1B3E]/15 hover:border-[#C9952B]'
                }`}
              >
                {o}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
