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

PHYSICAL LOCATION RULE: Before listing SOPs, check whether this business has a physical office, shop, or workspace. If yes, the list MUST include location-specific SOPs — how to open for the day, how to close and secure the premises, how to set up before customers arrive, how to handle the physical cash float, how to manage the space during operating hours, etc. These processes are invisible to a business owner but critical to anyone who needs to run the place without them. If the business is remote or home-based, skip location SOPs entirely — they do not apply.

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

REVENUE LEAKAGE CALCULATION RULE — THIS IS NON-NEGOTIABLE:
Every naira figure in revenue_leakage must be derived from numbers the owner actually provided. No invented prices. No assumed volumes. No generic "industry estimates."

HOW TO CALCULATE A LEAK:
1. Identify the actual process failure from the data (e.g. "no follow-up on unconverted enquiries")
2. Find the owner's real numbers to anchor it: their stated revenue, their stated transaction value or price, their stated customer volume, their stated daily/weekly/monthly frequency
3. Calculate: [missed transactions or lost amount] × [frequency] × [owner's own price or margin]
4. Show the exact chain: "Owner stated ₦X per job. Owner stated Y jobs per week. If 2 out of Y are lost to no follow-up, that is ₦X × 2 × 4.3 weeks = ₦Z/month"

WHEN OWNER DATA IS MISSING:
If the owner did not provide a specific figure you need (e.g. transaction value, customer volume), use real Nigerian SME market rate estimates appropriate to their business type and scale — but label them clearly as market estimates in calculation_note. For example: "Estimated at ₦8,000 per service based on typical Lagos [business type] market rate." Nigerian benchmarks: Lagos/PH/Abuja service businesses ₦2,000–₦50,000 per transaction; FMCG margins 15–30%; food vendors 30–50%; logistics ₦500–₦3,000 per delivery; professional services ₦15,000–₦150,000 per engagement. Use what matches the business type and stated scale. Owner-stated figures always override these estimates.

WHAT NOT TO DO:
- Do not use the same round invented number (₦50,000) for every leak — derive each one from the business type and scale
- Do not change the figures on regeneration unless the underlying data or estimates are revised — figures must be consistent run to run
- Do not ignore what the owner DID tell you — their actual stated figures always take priority over market estimates

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
      "description": "Exactly what is happening and why money is leaving. Name the specific process failure.",
      "frequency": "Daily / Weekly / Per transaction / Monthly",
      "monthly_min": 0,
      "monthly_max": 0,
      "calculation_note": "Show the exact calculation chain using ONLY numbers the owner actually stated. Format: 'Owner stated ₦X per [unit]. Owner stated Y [units] per [period]. [Z]% estimated lost due to [specific failure] = ₦X × Z × frequency = ₦result/month.' If you cannot calculate from real data, set both figures to 0 and write: 'Cannot quantify — owner did not provide [specific missing data]. Ask owner: [exact question].'"
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
    "note": "Each tier can have as many actions as the business genuinely needs — there is no limit. A complex business with many structural problems may have 6-8 immediate actions. A simpler one may have 2. Do not cap the list artificially. Every action must be specific and necessary. Do not pad with generic actions. Immediate = must happen in the first 2 weeks or money keeps leaking. Short term = within 2 months. Medium term = 3-6 months.",
    "immediate": [
      {
        "action": "Specific verb-led instruction. What exactly to do.",
        "owner": "Who does this — by name if a staff member, or 'Business Owner'",
        "success_looks_like": "How you know this is done."
      }
    ],
    "short_term": [
      {
        "action": "...",
        "owner": "...",
        "success_looks_like": "..."
      }
    ],
    "medium_term": [
      {
        "action": "...",
        "owner": "...",
        "success_looks_like": "..."
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
    "note": "Generate TWO versions of the matrix: current and ideal. Current shows how the owner's time is actually distributed today. Ideal shows how it should look once the ideal org structure from this report is fully in place — roles hired, SOPs documented, delegation working. The owner keeps this matrix long-term and checks it regularly to see if they are operating closer to the ideal. The difference between current and ideal is the transformation story of the report. In the ideal state, the owner's Q1 should be smaller (fewer fires), Q2 should be larger (more strategy), and Q3 should be nearly empty (delegated to people or systems). Every quadrant in both versions MUST contain both assessment tasks (from what the owner told you) AND suggested tasks (what this type of business almost certainly does). Mark assessment tasks source: 'assessment', suggested source: 'suggested'. For solopreneurs in the ideal state, Q3 means 'handled by a system or outsourced role'.",
    "current": {
      "q1_do": [
        { "task": "Exact task name — what the owner is urgently handling today", "source": "assessment | suggested", "note": "Why this is urgent AND important right now" }
      ],
      "q2_schedule": [
        { "task": "...", "source": "assessment | suggested", "note": "Why important but not yet planned" }
      ],
      "q3_delegate": [
        { "task": "...", "source": "assessment | suggested", "note": "Why the owner is doing this but shouldn't be" }
      ],
      "q4_eliminate": [
        { "task": "...", "source": "assessment | suggested", "note": "Why this wastes time without business value" }
      ]
    },
    "ideal": {
      "note_for_ai": "This is the owner's time once the ideal org is in place. Tasks that are currently in Q3 (owner doing them) should move here to Q3 (delegated to named role) or disappear entirely. New Q2 items should appear — strategic things the owner currently has no time for. Q1 should be shorter. Show the owner what their week looks like when the business runs without them being the centre of everything.",
      "q1_do": [
        { "task": "What remains genuinely urgent and important even in the ideal state", "source": "suggested", "note": "Why this still requires the owner personally even when fully structured" }
      ],
      "q2_schedule": [
        { "task": "Strategic work the owner will finally have time for", "source": "suggested", "note": "Why this becomes possible once ops are delegated" }
      ],
      "q3_delegate": [
        { "task": "Task currently owned by the owner — delegated to which role in the ideal org", "source": "assessment | suggested", "note": "Who owns this in the ideal structure and why the owner must fully exit it" }
      ],
      "q4_eliminate": [
        { "task": "...", "source": "assessment | suggested", "note": "Still true in the ideal state — stop doing this" }
      ]
    }
  },

  "org_structure": {
    "note": "This section shows the owner what their organisation actually looks like today — and what it should look like. Most small business owners have never seen their business drawn as a structure. They give one person multiple roles without realising it, they hire without a plan, and they don't know what role to hire next. Your job is to draw both pictures clearly using the actual people in this business. The current chart uses the real names and roles from the staff data. The ideal chart shows what the org SHOULD look like for this business type and size — including positions that don't exist yet. Use the hiring sequence to tell them exactly who to bring on first and why.",

    "current": {
      "people": [
        {
          "name": "Owner's actual name — pull from business data",
          "title": "Business Owner",
          "actual_roles": ["List every function this person is personally handling — sales, operations, finance, HR, customer service, etc. Be specific."],
          "overload_note": "One sentence: what this concentration of roles is costing the business."
        }
      ],
      "structural_problems": [
        "Specific problem 1 — e.g. 'No one person owns operations; every customer issue returns to the owner'",
        "Specific problem 2 — e.g. 'Two staff members share the title Salesperson but have different responsibilities with no documented boundary'"
      ]
    },

    "ideal": {
      "positions": [
        {
          "title": "Business Owner",
          "focus": "Strategy, key client relationships, and business development only",
          "reports_to": null,
          "status": "exists"
        },
        {
          "title": "Example: Operations Manager",
          "focus": "Day-to-day running — staff, customer fulfilment, quality control",
          "reports_to": "Business Owner",
          "status": "needs to be hired | can be assigned internally",
          "hire_priority": 1
        }
      ],
      "hiring_sequence": [
        "First hire: [Role name] — because [specific reason based on this business's biggest bottleneck]. This person frees the owner from [specific task]. Hire when monthly revenue consistently exceeds [figure].",
        "Second hire: [Role name] — because [reason]. Hire when [condition]."
      ],
      "immediate_restructure": [
        "Action the owner can take today without hiring anyone — e.g. 'Designate [Name] as the single point of contact for all customer complaints. Remove yourself from that loop immediately.'"
      ]
    }
  },

  "process_map": [
    {
      "note": "Map the 3-5 most critical processes in this business — the ones that happen most often or carry the most revenue/risk. For each, show exactly how it works today (with the owner's involvement made explicit) versus how it should work (with the owner removed from routine steps). Use language the owner will recognise. Name the people involved. Do not map processes that were not described in the data.",
      "process_name": "e.g. Customer Enquiry to First Sale",
      "current_flow": [
        "Step 1: Customer contacts the business (how — phone, walk-in, WhatsApp)",
        "Step 2: Owner personally handles the enquiry",
        "Step 3: Owner gives a quote verbally with no written record",
        "Step 4: Customer either buys or the owner follows up by memory"
      ],
      "current_owner_involvement": "100% — owner is the process",
      "current_problems": [
        "No record of enquiries that didn't convert — no ability to follow up",
        "Owner is the only one who can quote, so every enquiry waits for them"
      ],
      "ideal_flow": [
        "Step 1: Enquiry received by designated person using intake form",
        "Step 2: Qualification checklist completed",
        "Step 3: Standard quote generated from price list and sent within 24 hours",
        "Step 4: Automated or scheduled follow-up at day 3 and day 7"
      ],
      "ideal_owner_involvement": "Owner reviews quotes over ₦X only. Everything else runs without them.",
      "what_changes": "The single change that unlocks this process — the one structural fix."
    }
  ]
}`,
      },
    ],
    response_format: { type: 'json_object' },
  })

  return JSON.parse(response.choices[0].message.content ?? '{}')
}

const SECTION_SCHEMAS: Record<string, string> = {
  executive_summary: `{
  "situation": "1-2 sentences. What this business is and what was assessed.",
  "complication": "1-3 sentences. The specific structural problem the data reveals.",
  "resolution": ["Top 3-5 priority findings as bold declarative sentences."]
}`,
  business_snapshot: `{
  "type": "business type",
  "staff_count": 0,
  "owner_stated_problem": "Direct quote or close paraphrase.",
  "current_stage": "Survival | Stabilisation | Growth",
  "one_line_diagnosis": "The single most important structural problem in one sentence."
}`,
  key_findings: `[
  {
    "headline": "One declarative sentence the owner could NOT have written themselves.",
    "evidence": "The specific data point from their answers that proves this.",
    "root_cause": "The structural reason — one level deeper than obvious.",
    "impact": "What this costs in naira, time, or operational risk.",
    "category": "owner_dependency | process_gap | financial_visibility | staff_clarity | customer_experience | revenue_leakage | decision_bottleneck | growth_ceiling"
  }
]`,
  contradiction_analysis: `[
  { "owner_stated": "What the owner said.", "reality": "What the data shows." }
]`,
  revenue_leakage: `[
  {
    "title": "Short name",
    "description": "What is happening and why money is leaving.",
    "frequency": "Daily | Weekly | Per transaction | Monthly",
    "monthly_min": 0,
    "monthly_max": 0,
    "calculation_note": "Show the logic."
  }
]`,
  structural_gaps: `[
  { "gap": "Missing process, system, or clarity.", "severity": "Critical | High | Medium", "impact": "What breaks because this gap exists." }
]`,
  priority_actions: `{
  "immediate": [{ "action": "Verb-led instruction.", "owner": "Who does this.", "success_looks_like": "How you know it's done." }],
  "short_term": [{ "action": "...", "owner": "...", "success_looks_like": "..." }],
  "medium_term": [{ "action": "...", "owner": "...", "success_looks_like": "..." }]
}`,
  sop_list: `[
  {
    "title": "Specific individual process — e.g. 'How to respond to a new WhatsApp enquiry'",
    "responsible": "Name or role",
    "priority": "Urgent | Important | Standard",
    "current_state": "Exists and documented | Exists but undocumented | Inconsistent | Missing entirely"
  }
]`,
  delegation_readiness: `[
  {
    "person": "Name",
    "role": "Role",
    "tasks_to_absorb": "Specific tasks they could take from the owner.",
    "what_they_need_first": "Training / Documentation / Authority / Nothing",
    "risk_note": "What could go wrong and how to mitigate."
  }
]`,
  vision_90_days: `["Specific measurable outcome", "Another outcome"]`,
  closing_assessment: `"One paragraph written directly to the owner. Honest, direct, human. No corporate language."`,
  org_structure: `{
  "current": {
    "people": [{ "name": "...", "title": "...", "actual_roles": ["..."], "overload_note": "..." }],
    "structural_problems": ["..."]
  },
  "ideal": {
    "positions": [{ "title": "...", "focus": "...", "reports_to": null, "status": "exists | needs to be hired | can be assigned internally", "hire_priority": 1 }],
    "hiring_sequence": ["First hire: ..."],
    "immediate_restructure": ["Action without hiring..."]
  }
}`,
  process_map: `[
  {
    "process_name": "...",
    "current_flow": ["Step 1", "Step 2"],
    "current_owner_involvement": "...",
    "current_problems": ["..."],
    "ideal_flow": ["Step 1", "Step 2"],
    "ideal_owner_involvement": "...",
    "what_changes": "The single structural change that unlocks this."
  }
]`,
  eisenhower_matrix: `{
  "current": {
    "q1_do": [{ "task": "...", "source": "assessment | suggested", "note": "Why urgent AND important today" }],
    "q2_schedule": [{ "task": "...", "source": "...", "note": "..." }],
    "q3_delegate": [{ "task": "...", "source": "...", "note": "Why owner is doing this but shouldn't be" }],
    "q4_eliminate": [{ "task": "...", "source": "...", "note": "..." }]
  },
  "ideal": {
    "q1_do": [{ "task": "...", "source": "suggested", "note": "Still requires owner even in ideal state" }],
    "q2_schedule": [{ "task": "...", "source": "suggested", "note": "Strategic work unlocked by delegation" }],
    "q3_delegate": [{ "task": "...", "source": "assessment | suggested", "note": "Delegated to which role in ideal org" }],
    "q4_eliminate": [{ "task": "...", "source": "...", "note": "..." }]
  }
}`,
}

export async function generateSection(
  section: string,
  instruction: string,
  layer1: Record<string, unknown>,
  layer2: Record<string, unknown>,
  businessType: string,
  businessName: string,
  staffMembers: { name: string; role: string }[],
  existingReport: Record<string, unknown>
): Promise<unknown> {
  const schema = SECTION_SCHEMAS[section]
  if (!schema) throw new Error(`Unknown section: ${section}`)

  const staffBlock = staffMembers.length > 0
    ? staffMembers.map(s => `- ${s.name}: ${s.role}`).join('\n')
    : 'Solo operator — no staff'

  const currentSection = existingReport[section]
  const hasInstruction = instruction && instruction.trim().length > 0

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.3,
    messages: [
      { role: 'system', content: MASTER_PROMPT },
      {
        role: 'user',
        content: `You are editing the "${section}" section of a diagnostic report for ${businessName} — a ${businessType} business.

STAFF:
${staffBlock}

BUSINESS DATA — LAYER 1 (self-assessment):
${JSON.stringify(layer1, null, 2)}

BUSINESS DATA — LAYER 2 (owner interview):
${JSON.stringify(layer2, null, 2)}

OTHER REPORT SECTIONS (for consistency — do not change these, just stay aligned with them):
${JSON.stringify({ ...existingReport, [section]: undefined }, null, 2)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CURRENT CONTENT OF THE "${section}" SECTION — THIS IS WHAT YOU ARE EDITING:
${JSON.stringify(currentSection, null, 2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${hasInstruction ? `OPERATOR INSTRUCTION: "${instruction}"

HOW TO APPLY THIS INSTRUCTION:
- Read the instruction carefully and understand what the operator ACTUALLY wants changed.
- If they say "add X" — keep every existing item and add new ones for X. Do not remove anything.
- If they say "remove X" or "delete X" — remove only the specific item(s) that match. Keep everything else exactly as is.
- If they say "change X" or "make X more specific" — modify only that item. Leave all other items untouched.
- If they say "add more" — keep all existing items and add additional ones.
- If they say "rewrite" or "redo" or "start over" — then and only then rebuild the section from scratch.
- When in doubt about what the operator means, interpret it as the SMALLEST possible change that satisfies the instruction. Never delete things you were not told to delete.
- The operator is reviewing a real business report. They want surgical edits, not a new section.` : `No instruction given — improve the quality and specificity of this section. Keep the same structure and number of items. Make each item more specific to this exact business.`}

Return a JSON object with a single key named exactly "${section}" containing the updated value.
The value must match this schema:
${schema}

Example format: { "${section}": <value here> }`,
      },
    ],
    response_format: { type: 'json_object' },
  })

  const raw = JSON.parse(response.choices[0].message.content ?? '{}')

  // GPT json_object mode always wraps in an object even when we ask for a raw value.
  // Priority 1: the model used the exact section name as the key — most reliable
  if (raw[section] !== undefined) return raw[section]

  // Priority 2: ignore noise keys (note, message, explanation) and return the real data key
  const NOISE_KEYS = new Set(['note', 'note_for_ai', 'message', 'explanation', 'comment', 'response'])
  const dataKeys = Object.keys(raw).filter(k => !NOISE_KEYS.has(k))
  if (dataKeys.length === 1) return raw[dataKeys[0]]

  // Priority 3: if there's genuinely only one key total, return its value
  if (Object.keys(raw).length === 1) return raw[Object.keys(raw)[0]]

  // Fallback: return as-is and let the caller handle it
  return raw
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
