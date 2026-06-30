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

type Step = 'intro' | 'layer1' | 'team-interview' | 'report'

export function AssessmentFlow({ business, layer1, observation, layer2, report, questions, staff, businessId }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const currentStep: Step = report
    ? 'report'
    : layer2
    ? 'report'
    : layer1
    ? 'team-interview'
    : 'intro'

  const [step, setStep] = useState<Step>(currentStep)
  const [answers, setAnswers] = useState<Record<string, unknown>>(layer1?.answers ?? {})
  const [staffList, setStaffList] = useState<{ name: string; role: string }[]>(
    staff.map(s => ({ name: s.name, role: s.role }))
  )
  const [interviewAnswers, setInterviewAnswers] = useState<Record<string, unknown>>(layer2?.answers ?? {})
  const [loading, setLoading] = useState(false)

  async function submitLayer1() {
    setLoading(true)
    const { error } = await supabase.from('layer1_responses').upsert({
      business_id: businessId,
      answers: { ...answers, staff: staffList },
    })

    if (!error) {
      for (const s of staffList) {
        if (s.name && s.role) {
          await supabase.from('staff_members').upsert({ business_id: businessId, name: s.name, role: s.role }, { onConflict: 'business_id,name' })
        }
      }
      setStep('team-interview')
    }
    setLoading(false)
    router.refresh()
  }

  async function submitTeamInterview() {
    setLoading(true)
    const { error } = await supabase.from('layer2_responses').upsert({ business_id: businessId, answers: interviewAnswers })
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
    { label: 'Assessment', done: !!layer1 },
    { label: 'Team Interview', done: !!layer2 },
    { label: 'Report', done: !!report },
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
          <CardBody className="py-6 space-y-3">
            <p className="text-sm text-[#1A1A2E] leading-relaxed">
              This process has two stages and should take about 30–45 minutes total.
            </p>
            <div className="space-y-2">
              <div className="flex gap-3">
                <span className="text-xs font-bold text-[#C9952B] mt-0.5 w-4 shrink-0">1</span>
                <p className="text-sm text-[#1A1A2E]"><span className="font-semibold">Business Assessment</span> — you answer questions about how your business runs today. Be honest, not how you wish it was.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-xs font-bold text-[#C9952B] mt-0.5 w-4 shrink-0">2</span>
                <p className="text-sm text-[#1A1A2E]"><span className="font-semibold">Owner Interview</span> — a deeper set of questions about how you actually operate day to day. If you have staff, they each get a short section too so we can see how the business really runs.</p>
              </div>
            </div>
            <p className="text-sm text-[#666] leading-relaxed">
              At the end you receive a full report — every gap identified, revenue leakage calculated in naira, and the exact order to fix things.
            </p>
            <Button className="mt-2" onClick={() => setStep('layer1')}>Start assessment</Button>
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

  if (step === 'team-interview') {
    const interviewSections = buildInterviewSections(staffList)
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-[#0D1B3E]">Owner Interview</h1>
          <p className="text-sm text-[#666] mt-0.5">
            {staffList.filter(s => s.name).length > 0
              ? 'Sit with each person separately and record their answers honestly'
              : 'Answer these questions about how you run the business day to day'}
          </p>
        </div>

        {/* Owner section */}
        <Card>
          <div className="px-5 py-3.5 border-b border-[#0D1B3E]/8">
            <h2 className="text-sm font-semibold text-[#0D1B3E]">Owner — Your Daily Reality</h2>
          </div>
          <CardBody className="space-y-4">
            {interviewSections.owner.map(q => (
              <InterviewField key={q.id} q={q} value={interviewAnswers[q.id]} onChange={v => setInterviewAnswers(a => ({ ...a, [q.id]: v }))} />
            ))}
          </CardBody>
        </Card>

        {/* Per-staff sections — only if they have staff */}
        {staffList.filter(s => s.name).length === 0 ? (
          <Card>
            <CardBody className="py-4">
              <p className="text-sm text-[#666]">No staff members added — only your section above applies.</p>
            </CardBody>
          </Card>
        ) : staffList.filter(s => s.name).map((s, i) => (
          <Card key={i}>
            <div className="px-5 py-3.5 border-b border-[#0D1B3E]/8">
              <h2 className="text-sm font-semibold text-[#0D1B3E]">{s.name} — {s.role}</h2>
              <p className="text-xs text-[#999] mt-0.5">Ask them these questions directly. Write exactly what they say.</p>
            </div>
            <CardBody className="space-y-4">
              {interviewSections.staff(s.name, s.role, i).map(q => (
                <InterviewField key={q.id} q={q} value={interviewAnswers[q.id]} onChange={v => setInterviewAnswers(a => ({ ...a, [q.id]: v }))} />
              ))}
            </CardBody>
          </Card>
        ))}

        {/* Summary section */}
        <Card>
          <div className="px-5 py-3.5 border-b border-[#0D1B3E]/8">
            <h2 className="text-sm font-semibold text-[#0D1B3E]">Overall Summary</h2>
          </div>
          <CardBody className="space-y-4">
            {interviewSections.summary.map(q => (
              <InterviewField key={q.id} q={q} value={interviewAnswers[q.id]} onChange={v => setInterviewAnswers(a => ({ ...a, [q.id]: v }))} />
            ))}
          </CardBody>
        </Card>

        <div className="flex gap-3">
          <button onClick={() => setStep('layer1')} className="flex items-center gap-1 text-sm text-[#666] hover:text-[#0D1B3E] transition">
            <ChevronLeft size={16} /> Edit assessment
          </button>
          <Button onClick={submitTeamInterview} loading={loading} size="lg" className="flex-1">
            Submit team interview
          </Button>
        </div>
      </div>
    )
  }

  return null
}

interface IQ { id: string; text: string; type: 'short-text' | 'number' | 'dropdown'; options?: string[] }

function buildInterviewSections(staffList: { name: string; role: string }[]) {
  const owner: IQ[] = [
    { id: 'owner_top_tasks', text: "Your 3 biggest time-consuming tasks every day (e.g. banking, customer calls, stock counting):", type: 'short-text' },
    { id: 'owner_only_tasks', text: "Tasks ONLY you can do right now — nobody else knows how:", type: 'short-text' },
    { id: 'owner_handoff', text: "Tasks you'd hand off today if someone was properly trained:", type: 'short-text' },
    { id: 'owner_hours', text: "How many hours per day do you spend doing tasks yourself (not managing or planning)?", type: 'number' },
    { id: 'owner_absent_gaps', text: "When you're absent, which tasks do NOT get done because nobody else knows how?", type: 'short-text' },
    { id: 'owner_stress', text: "What about running this business stresses you most?", type: 'short-text' },
    { id: 'owner_salary', text: "Do you pay yourself a fixed salary each month or take money from the business as you need it?", type: 'dropdown', options: ["Fixed salary every month", "Take money as I need it", "Mix of both", "I don't take money from the business yet"] },
    { id: 'owner_cash_shortfall', text: "Has there been a month in the last year where there wasn't enough cash to cover everything?", type: 'dropdown', options: ['Yes, more than once', 'Yes, once or twice', 'Close but managed', 'No, never'] },
    { id: 'owner_growth_ceiling', text: "What is the main thing stopping this business from growing right now?", type: 'short-text' },
    { id: 'owner_3yr_goal', text: "What do you want this business to look like in 3 years?", type: 'dropdown', options: ['Much bigger with more staff and locations', 'Running without me day-to-day', 'Sold or handed over', 'Same size but more profitable', 'Just stable and consistent'] },
    { id: 'owner_broken_process', text: "A process in your business that 'works' but you know isn't the right way to do it:", type: 'short-text' },
    { id: 'owner_not_my_job', text: "One thing you did yesterday that you honestly feel is NOT your job:", type: 'short-text' },
  ]

  const staff = (name: string, role: string, i: number): IQ[] => {
    const p = `staff_${i}`
    return [
      { id: `${p}_tasks`, text: `Walk me through everything you do in a typical day — what do you do and in what order?`, type: 'short-text' },
      { id: `${p}_stress`, text: `What is the most stressful part of your job?`, type: 'short-text' },
      { id: `${p}_untrained`, text: `Is there something you do regularly that you were never properly shown how to do?`, type: 'short-text' },
      { id: `${p}_absent`, text: `If you didn't come in tomorrow, what would NOT get done — and would anyone else know it needed doing?`, type: 'short-text' },
      { id: `${p}_decisions`, text: `When something unexpected happens, do you handle it yourself or call the owner?`, type: 'dropdown', options: ['Always call the owner', 'Usually call the owner', 'Depends on the situation', 'Usually handle it myself', 'Always handle it myself'] },
      { id: `${p}_no_permission`, text: `Is there something you are not allowed to decide yourself that slows down your work?`, type: 'short-text' },
      { id: `${p}_hidden`, text: `Is there something you do regularly that you were never officially asked to do — you just started doing it because it needed to be done?`, type: 'short-text' },
      { id: `${p}_complaints`, text: `What do customers complain about most in this business?`, type: 'short-text' },
      { id: `${p}_daily_volume`, text: `On a busy day, roughly how many customers or sales happen?`, type: 'number' },
      { id: `${p}_unrecorded`, text: `Do you ever see a payment or sale that doesn't get recorded anywhere?`, type: 'dropdown', options: ['Yes, it happens often', 'Yes, occasionally', 'Rarely', 'Never'] },
      { id: `${p}_owner_doesnt_know`, text: `Is there anything about how this business really runs that you think the owner doesn't fully know or understand?`, type: 'short-text' },
    ]
  }

  const summary: IQ[] = [
    { id: 'knowledge_single_point', text: "Which tasks exist only in ONE person's head — if they left, the knowledge goes with them?", type: 'short-text' },
    { id: 'owner_week_absent', text: "Owner: if you were away for one full week, what would break first?", type: 'short-text' },
    { id: 'decision_structure', text: "Overall, how would you describe decision-making in this business?", type: 'dropdown', options: ['Everything goes back to the owner', 'Most things go back to the owner', 'Staff handle routine, owner handles unusual', 'Staff make most decisions independently', 'Staff are fully empowered in their roles'] },
    { id: 'wrong_person', text: "Is anyone doing tasks clearly above or below their actual role? Name them and describe:", type: 'short-text' },
    { id: 'surprise', text: "The most honest thing said today that the owner probably did not expect to hear:", type: 'short-text' },
  ]

  return { owner, staff, summary }
}

function InterviewField({ q, value, onChange }: { q: IQ; value: unknown; onChange: (v: unknown) => void }) {
  return (
    <div>
      <label className="text-sm font-medium text-[#1A1A2E] block mb-1.5">{q.text}</label>
      {q.type === 'short-text' && (
        <input
          className="w-full rounded-lg border border-[#0D1B3E]/15 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#C9952B]"
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
        />
      )}
      {q.type === 'number' && (
        <input
          type="number"
          className="w-32 rounded-lg border border-[#0D1B3E]/15 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#C9952B]"
          value={(value as number) ?? ''}
          onChange={e => onChange(parseFloat(e.target.value))}
        />
      )}
      {q.type === 'dropdown' && q.options && (
        <select
          className="w-full rounded-lg border border-[#0D1B3E]/15 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#C9952B]"
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">Select</option>
          {q.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )}
    </div>
  )
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
