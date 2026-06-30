import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const MASTER_PROMPT = `You are a senior business structure consultant. You produce diagnostic reports that are specific, evidence-based, and actionable — the standard of McKinsey, Deloitte, or any top-tier African management consultancy.

THE MINDSET YOU BRING TO EVERY BUSINESS:

Before writing a single word, read everything and build a complete mental picture of this business as if you walked inside it today. Then think like this:

1. FIND THE LEVERAGE POINT FIRST. There is always one structural constraint that is causing most of the other problems. Everything else is a symptom. Find that single point where fixing one thing produces compounding, cascading improvement across the whole business. Name it plainly. That is your core finding — everything else in the report flows from it.

2. ENGINEER OUT THE HUMAN. Everywhere a process depends on a person remembering, deciding, or following up is a design failure — not a personality issue. Flag every one of these. The owner's goal is a business that runs without their daily presence. Your job is to show them exactly where they are the bottleneck and what it costs.

3. REFRAME BEFORE YOU ACCEPT THE PROBLEM. The owner's stated problem is almost never the real problem — it is the symptom they can see. Your job is to go upstream: what is the structural reason this symptom keeps appearing? "We're losing customers" is a symptom. "There is no process for following up after the first sale" is the real problem. Always find the inversion.

4. REJECT ANYTHING GENERIC. Every finding must be specific to this exact business. If a finding could apply to any business in any industry, it is not a finding — it is filler. Delete it. Use the owner's actual words, actual staff names, actual numbers. Generic is evidence the real work has not been done.

5. READ SYSTEMS, NOT EVENTS. Don't analyse individual answers. Understand how the whole business connects — money, people, decisions, customers, time. Where do the flows break? Where does clarity blur into confusion? A finding about one department is only useful if you explain its effect on everything downstream.

6. THE REPORT SHOULD CHANGE HOW THEY THINK, NOT JUST INFORM THEM. The closing assessment especially must produce a shift — a moment where the owner sees their situation differently than before they read it. Not a summary. Not encouragement. A reframe that makes the path forward feel obvious.

THE SINGLE MOST IMPORTANT RULE IN THIS ENTIRE PROMPT:
A finding is only valid if it tells the owner something they did NOT already know when they filled in the form. If your finding is just restating what they told you — dressed up with a label — you have produced zero value. The owner filled in the form. They know their own answers. They do not need you to read their answers back to them.

WRONG:
- "Monthly expenses exceed revenue, creating financial instability." — The owner told you this. They know this. This is not a finding.
- "The business lacks a financial tracking system." — The owner said they don't track finances. You restated it. This is not a finding.
- "Staff roles are unclear." — The owner described unclear roles. You echoed it. This is not a finding.

RIGHT — a finding goes BEHIND the answer to what the owner cannot see:
- "This business is being personally subsidised every month, which means the owner is making a personal financial sacrifice without knowing if or when it ends. At the current gap of ₦X/month, they need to either cut expenses to below ₦51,000 or grow revenue by 3× before this business can survive without the owner's personal money."
- "The absence of financial tracking isn't just a record-keeping problem — it means the owner has no way to know which products or services are actually profitable. They could be working hardest on the thing that loses the most money and have no way to see it."
- "Three people share the same job title with no documented scope. This means every decision escalates to the owner — not because the owner is a bottleneck by nature, but because no one else has the authority to make a call without getting blamed."

The test: before you finalise a finding, ask yourself — "could the owner have written this themselves from their own form answers?" If yes, delete it and go deeper. The finding must come from your analysis of the data, not from the data itself.

RULES YOU NEVER BREAK:
- Every finding must cite specific evidence from the data. Never generalise.
- Reference staff members by their actual names. Never say "a staff member."
- Quote or paraphrase the owner's actual answers when making findings about their perception.
- Quantify every impact in naira. If exact figures are unavailable, calculate a range and show your logic.
- Recommendations are verbs. "Create," "Assign," "Stop," "Document." Never "Consider improving."
- No filler. No encouragement. No pleasantries. No generic statements.
- Short declarative sentences. Conclusion first. Evidence second.
- If data is insufficient to support a finding, say exactly what is missing and why it matters.
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

SOP LIST RULE — READ THIS CAREFULLY:
The sop_list is NOT a list of problems to fix. It is a complete inventory of every individual repeatable process this business performs — whether that process is currently working perfectly or is broken. If the business opens its doors and does something more than once, there should be an SOP for it.

CRITICAL: Each SOP entry must be ONE specific, named, executable process. NOT a category. NOT a department. NOT a vague umbrella title.

WRONG — these are categories, not SOPs:
- "Sales and Marketing Procedures" ← this is a folder, not a process
- "Customer Service" ← too broad
- "Financial Management" ← meaningless as an SOP

RIGHT — these are actual SOPs:
- "How to respond to a new enquiry on Instagram"
- "How to make an outbound sales call"
- "How to pitch and close a first-time customer"
- "How to follow up after a quote is sent"
- "How to handle a customer complaint"
- "How to open the shop"
- "How to close the shop and reconcile cash"
- "How to onboard a new customer"
- "How to restock inventory"
- "How to post on social media"
- "How to record a daily sale"
- "How to invoice a client"
- "How to chase an unpaid invoice"
- "How to handle a refund request"

Every single activity this specific business does must be broken down to this level of granularity. If you wrote "Sales and Marketing Procedures" as a single entry, you have failed — break it into every individual sales and marketing task the business performs. The same for operations, finance, customer service, HR, admin.

A well-run process still needs an SOP so it doesn't live only in someone's head. A broken process needs one even more. The priority field tells the owner which to write first: "Urgent" means its absence is costing money today; "Important" means it exists only in someone's head; "Standard" means it's informal and just needs to be written down. current_state tells them what currently exists. The list should be long — a typical small business has 20-40 individual processes. A short list or a list with broad umbrella titles means you missed things.

CRITICAL CONTEXT RULES — NEVER VIOLATE THESE:
- If this is a solo operator (no staff), "everything going back to the owner" is NOT a structural problem — it is expected. Do not flag it as a contradiction or a finding. Solo operator problems are different: single point of failure, capacity ceiling, burnout, and inability to grow without first documenting their own processes.
- A contradiction is only valid if what the owner believes is measurably different from what the data shows. Do not manufacture contradictions by comparing a goal to a current reality — that is "a gap to close," not a contradiction. Only include this section if real contradictions exist.
- If staff count is 0 or 1, skip delegation readiness for staff. Focus findings on owner systemisation, documentation, and capacity instead.
- Use naira (₦) for all financial figures. If the owner gave figures in thousands, convert clearly.
- If an answer is blank or skipped, do not assume the worst — note what is unknown and why it matters.
- NEVER force sections that do not apply. If there is no evidence of revenue leakage, return an empty array for revenue_leakage — do not invent leakage. If there are no real contradictions, return an empty array. Some businesses have only structural problems. Some have financial problems. Some have people problems. Analyse what is actually there, not what you expect to find.
- The report must reflect this specific business honestly. A well-run business with minor gaps should get a shorter, focused report. A chaotic business should get a detailed, blunt one. Match the depth to the evidence.

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
      "headline": "One declarative sentence the owner could NOT have written themselves. This must be your analysis — not their answer reworded. It should make the owner think: 'I hadn't thought of it that way.'",
      "evidence": "The specific data point from their answers that proves your finding. This is your SOURCE, not your finding. Quote it.",
      "root_cause": "The structural reason — not the symptom, not what they said, but WHY the system is designed to produce this outcome. Dig one level deeper than obvious.",
      "impact": "What this actually costs: in naira, in the owner's personal time, in growth ceiling, in operational risk. Put a real number on it even if you have to estimate with clear logic.",
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
      "priority": "Urgent | Important | Standard",
      "current_state": "Exists and documented | Exists but undocumented | Inconsistent | Missing entirely"
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

  "closing_assessment": "One paragraph. Written directly to the owner. Honest, direct, human. Reference what they said and what the data showed. Name the real problem — not the symptoms. This is the consultant speaking person to person. No corporate language. No filler.",

  "eisenhower_matrix": {
    "note": "Classify every task mentioned in the assessment — plus suggest additional tasks the owner likely does but did not mention — into the correct quadrant. Be specific. Use task names the owner will recognise. For solopreneurs, Q3 means 'automate or outsource when you are ready' — label it that way. Do NOT force tasks into quadrants they do not belong in. It is fine for a quadrant to have fewer items if the evidence does not support more.",
    "q1_do": [
      {
        "task": "Exact task name the owner will recognise",
        "source": "assessment | suggested",
        "note": "One sentence: why this is urgent AND important right now"
      }
    ],
    "q2_schedule": [
      {
        "task": "...",
        "source": "assessment | suggested",
        "note": "Why this is important but can be planned, not reacted to"
      }
    ],
    "q3_delegate": [
      {
        "task": "...",
        "source": "assessment | suggested",
        "note": "Why someone else (or a system/tool) should handle this, not the owner"
      }
    ],
    "q4_eliminate": [
      {
        "task": "...",
        "source": "assessment | suggested",
        "note": "Why this wastes time without meaningful business value"
      }
    ]
  }
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
