import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const MASTER_PROMPT = `You are a senior business structure consultant. You produce diagnostic reports that are specific, evidence-based, and actionable — the standard of McKinsey, Deloitte, or any top-tier African management consultancy.

RULES YOU NEVER BREAK:
- Every finding must cite specific evidence from the data provided. Never generalise.
- Reference staff members by their actual names throughout. Never say "a staff member."
- Quote or paraphrase the owner's actual answers when making findings about their perception.
- Quantify every impact in naira. If exact figures are unavailable, calculate a range with a methodology note.
- Recommendations are verbs. "Create," "Assign," "Stop," "Document." Never "Consider improving."
- No filler. No encouragement. No pleasantries. No generic statements. If data is insufficient to support a finding, say exactly what is missing and why it matters.
- Short declarative sentences. State the conclusion first. Prove it second.
- Write as if you have spent time inside this business — because the data comes from inside this business.`

export async function generateLayer2Questions(
  layer1Answers: Record<string, unknown>,
  businessType: string,
  staffMembers: { name: string; role: string }[]
): Promise<{ question: string; input_type: string; probing_for: string }[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.3,
    messages: [
      { role: 'system', content: MASTER_PROMPT },
      {
        role: 'user',
        content: `Generate a live observation day form for this specific ${businessType} business.

STAFF MEMBERS:
${staffMembers.map(s => `- ${s.name}: ${s.role}`).join('\n')}

LAYER 1 ASSESSMENT ANSWERS:
${JSON.stringify(layer1Answers, null, 2)}

INSTRUCTIONS:
- Generate 15-20 observation questions for a real working day
- Use staff names directly in questions (e.g. "What is ${staffMembers[0]?.name ?? 'the front desk'} doing right now?")
- Target the specific gaps already visible in the Layer 1 data above
- Questions must be answerable by looking up from a phone for 10 seconds
- No SOP-related questions
- No time groupings
- Mix input types: short-text, number, dropdown, yes-no
- For dropdown questions, provide 3-5 specific options relevant to this business type

Return JSON array only:
[{"question": "...", "input_type": "short-text|number|dropdown|yes-no", "options": ["..."] or null, "probing_for": "..."}]`,
      },
    ],
    response_format: { type: 'json_object' },
  })

  const result = JSON.parse(response.choices[0].message.content ?? '{"questions":[]}')
  return result.questions ?? result
}

export async function generateReport(
  layer1: Record<string, unknown>,
  layer2: Record<string, unknown>,
  businessType: string,
  businessName: string,
  staffMembers: { name: string; role: string }[]
) {
  const staffBlock = staffMembers.length > 0
    ? staffMembers.map(s => `- ${s.name}: ${s.role}`).join('\n')
    : 'Solo operator — no staff'

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.2,
    messages: [
      { role: 'system', content: MASTER_PROMPT },
      {
        role: 'user',
        content: `Generate a full professional business diagnostic report for ${businessName} — a ${businessType} business.

STAFF:
${staffBlock}

---

UNDERSTAND THIS BUSINESS FIRST — READ EVERYTHING BEFORE WRITING ANYTHING:

Before generating a single finding, build a complete mental picture of this business as if you have visited it in person. Understand who runs it, how many people are involved, what stage it is at, and how it actually operates day to day. Only then begin your analysis.

WHAT THE DATA SOURCES MEAN:

LAYER 1 is a self-assessment the owner completed about their business. It covers business registration, finances, operations, staff structure, marketing, and technology. These are the owner's own perceptions — not necessarily what is true on the ground. Look for over-confidence, blind spots, or missing structure.

LAYER 2 is a direct interview with the owner (and staff if any). It captures daily tasks, decision-making, stress points, undocumented work, cash handling, customer complaints, and future goals. This is where reality lives. Cross-reference it against Layer 1 to find the gaps between perception and reality.

CRITICAL CONTEXT RULES — NEVER VIOLATE THESE:
- If this is a solo operator (no staff), "everything going back to the owner" is NOT a structural problem — it is expected. Do not flag it as a contradiction or a finding. The solo operator's structural problems are different: single point of failure risk, capacity ceiling, burnout, and inability to scale without first documenting their own processes.
- A contradiction is only valid if what the owner believes is measurably different from what the data shows. Do not manufacture contradictions by comparing an aspirational goal to a current reality — that is called "a gap to close," not a contradiction.
- If staff count is 0 or 1, skip delegation readiness for staff. Focus findings on owner systemisation, documentation, and capacity instead.
- Use naira (₦) for all financial figures. If the owner gave figures in thousands, convert clearly.
- If an answer is blank or skipped, do not assume the worst — note what is unknown and why it matters.

LAYER 1 — SELF-ASSESSMENT (owner's own answers about their business):
${JSON.stringify(layer1, null, 2)}

LAYER 2 — OWNER & TEAM INTERVIEW (reality check — how the business actually runs):
${JSON.stringify(layer2, null, 2)}

---

INSTRUCTIONS:

You are generating a structured JSON report. Every section must be specific to this business. No generic text. Use staff names. Use the owner's actual words. Quantify in naira. Picture this as a real operating business and write as if you have been inside it.

Return this exact JSON structure:

{
  "executive_summary": {
    "situation": "1-2 sentences. What this business is and what was assessed. Factual.",
    "complication": "1-3 sentences. The specific structural problem the data reveals. Name the exact issue. Use numbers.",
    "resolution": ["Top 3-5 priority findings as bold declarative sentences. What is broken and what to do. No vague language."]
  },

  "business_snapshot": {
    "type": "${businessType}",
    "staff_count": 0,
    "owner_stated_problem": "Direct quote or close paraphrase of what the owner said their main problem is.",
    "current_stage": "Survival / Stabilisation / Growth — choose one and justify briefly",
    "one_line_diagnosis": "The single most important structural problem in one sentence."
  },

  "key_findings": [
    {
      "headline": "One declarative sentence stating the finding. Not a question. Not vague.",
      "evidence": "Specific data point, answer, or staff statement that proves this finding. Quote the source.",
      "root_cause": "Why this is happening — the structural reason, not the symptom.",
      "impact": "What this costs the business in naira, time, or operational risk. Be specific.",
      "category": "owner_dependency | process_gap | financial_visibility | staff_clarity | customer_experience | revenue_leakage | decision_bottleneck | growth_ceiling"
    }
  ],

  "contradiction_analysis": [
    {
      "owner_stated": "What the owner said or believes.",
      "reality": "What the data, staff answers, or observable facts actually show."
    }
  ],

  "revenue_leakage": [
    {
      "title": "Short name for this leak",
      "description": "Exactly what is happening and why money is leaving.",
      "frequency": "Daily / Weekly / Per transaction / Monthly",
      "monthly_min": 0,
      "monthly_max": 0,
      "calculation_note": "How you arrived at this figure. Show the logic."
    }
  ],

  "structural_gaps": [
    {
      "gap": "Specific gap — name the missing process, system, or clarity.",
      "severity": "Critical | High | Medium",
      "impact": "What breaks or leaks because this gap exists."
    }
  ],

  "priority_actions": {
    "immediate": [
      {
        "action": "Specific verb-led instruction. What exactly to do.",
        "owner": "Who does this — by name if a staff member, or 'Business Owner'",
        "success_looks_like": "How you know this is done.",
        "time_estimate": "e.g. 2 hours / 1 day"
      }
    ],
    "short_term": [
      {
        "action": "...",
        "owner": "...",
        "success_looks_like": "...",
        "time_estimate": "..."
      }
    ],
    "medium_term": [
      {
        "action": "...",
        "owner": "...",
        "success_looks_like": "...",
        "time_estimate": "..."
      }
    ]
  },

  "sop_list": [
    {
      "title": "Specific SOP name — e.g. 'Daily Cash Reconciliation Procedure'",
      "responsible": "Name or role who owns and executes this SOP",
      "priority": "Urgent | Important | Standard"
    }
  ],

  "delegation_readiness": [
    {
      "person": "Name",
      "role": "Role",
      "tasks_to_absorb": "Specific tasks they could take from the owner now.",
      "what_they_need_first": "Training / Documentation / Authority / Nothing — specify.",
      "risk_note": "What could go wrong if delegated now and how to mitigate."
    }
  ],

  "vision_90_days": [
    "Specific measurable outcome — e.g. 'Owner spends less than 2 hours/day on operational tasks'",
    "Another specific outcome",
    "Another specific outcome"
  ],

  "closing_assessment": "One paragraph. Written directly to the owner. Honest, direct, human. Reference what they said and what the data showed. Name the real problem — not the symptoms. This is the consultant speaking person to person. No corporate language. No filler."
}`,
      },
    ],
    response_format: { type: 'json_object' },
  })

  return JSON.parse(response.choices[0].message.content ?? '{}')
}

export async function buildSopFromTranscription(
  transcription: string,
  businessType: string,
  businessName: string,
  role: string
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.2,
    messages: [
      { role: 'system', content: MASTER_PROMPT },
      {
        role: 'user',
        content: `Structure this voice note transcription into a professional ERA Systems SOP document for ${businessName} (${businessType} business).

TRANSCRIPTION:
"${transcription}"

ROLE RESPONSIBLE: ${role}

Instructions:
- Title the SOP based on the exact process described
- Format: Purpose | Scope | Steps (numbered, specific) | Owner (role) | Review frequency
- Do not add steps not described in the transcription
- Use the owner's words where they are clear
- Keep it concise and practical — something staff can read in 2 minutes

Return plain text formatted as a professional document.`,
      },
    ],
  })

  return response.choices[0].message.content ?? ''
}
