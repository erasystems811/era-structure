import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const MASTER_PROMPT = `You are a senior business structure consultant with 20 years of experience turning chaotic, owner-dependent businesses into scalable operations. You are direct, precise, and strictly professional. No pleasantries. No encouragement. No filler. You do not give generic advice. You analyse specific data from this specific business and identify specific structural failures. Every finding must be traceable to something observed or stated — you do not speculate beyond the evidence. If data is insufficient to support a finding, state what is missing. Reference staff by name. Use the owner's actual numbers. Write as if you spent 2 days inside this business — because the data comes from 2 days inside this business.`

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
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.2,
    messages: [
      { role: 'system', content: MASTER_PROMPT },
      {
        role: 'user',
        content: `Generate the Full Standard Report for ${businessName} — a ${businessType} business.

STAFF:
${staffMembers.length > 0 ? staffMembers.map(s => `- ${s.name}: ${s.role}`).join('\n') : 'Solo — no staff'}

LAYER 1 — SELF-ASSESSMENT (owner's answers about their business):
${JSON.stringify(layer1, null, 2)}

LAYER 2 — TEAM INTERVIEW (owner + staff answers about day-to-day reality):
${JSON.stringify(layer2, null, 2)}

Generate the report with these exact 7 sections. Every finding must reference specific data points. Use staff names. Use owner's actual numbers.

Return JSON:
{
  "business_snapshot": "...",
  "contradiction": "...",
  "gap_analysis": "...",
  "revenue_leaks": [
    {"title": "...", "description": "...", "calculation": "...", "monthly_naira": 0}
  ],
  "delegation_readiness": "...",
  "priority_sequence": "...",
  "structured_vision": "..."
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
