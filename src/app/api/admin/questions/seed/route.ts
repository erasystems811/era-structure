import { verifyOperatorSecret, operatorAdminClient, forbidden, corsHeaders } from '@/lib/operator-auth'
import { NextResponse } from 'next/server'

const LAYER1: { block: string; question_text: string; input_type: string; options: string[] | null; order_index: number }[] = [
  // Block A — Registration & Legal
  { block:'A', question_text:'Is your business registered with the Corporate Affairs Commission (CAC)?', input_type:'yes-no', options:null, order_index:1 },
  { block:'A', question_text:'What is the legal structure of your business?', input_type:'dropdown', options:['Sole Proprietorship','Partnership','Limited Liability Company (LLC)','Enterprise'], order_index:2 },
  { block:'A', question_text:'Do you have a valid Tax Identification Number (TIN)?', input_type:'yes-no', options:null, order_index:3 },
  { block:'A', question_text:'Is your registered business address current and active?', input_type:'yes-no', options:null, order_index:4 },
  { block:'A', question_text:'Do you have a business bank account separate from your personal account?', input_type:'yes-no', options:null, order_index:5 },
  { block:'A', question_text:'Are your CAC documents (certificate, annual returns) up to date?', input_type:'yes-no', options:null, order_index:6 },
  // Block B — Financial Management
  { block:'B', question_text:'Do you maintain a separate record of all business income and expenses?', input_type:'yes-no', options:null, order_index:7 },
  { block:'B', question_text:'How do you currently track your business finances?', input_type:'dropdown', options:['Spreadsheet (Excel/Google Sheets)','Accounting software','Physical ledger/book','I don\'t track formally'], order_index:8 },
  { block:'B', question_text:'Do you prepare monthly financial summaries or statements?', input_type:'yes-no', options:null, order_index:9 },
  { block:'B', question_text:'What is your approximate average monthly revenue (₦)?', input_type:'number', options:null, order_index:10 },
  { block:'B', question_text:'What is your approximate average monthly total expense (₦)?', input_type:'number', options:null, order_index:11 },
  { block:'B', question_text:'Do you currently have any business loans or outstanding debts?', input_type:'yes-no', options:null, order_index:12 },
  { block:'B', question_text:'Do you have a dedicated business savings or emergency fund?', input_type:'yes-no', options:null, order_index:13 },
  { block:'B', question_text:'Do you know your profit margin for the last 3 months?', input_type:'yes-no', options:null, order_index:14 },
  // Block C — Operations
  { block:'C', question_text:'Do you have a documented process for your core day-to-day operations?', input_type:'yes-no', options:null, order_index:15 },
  { block:'C', question_text:'How do you manage your inventory or service materials?', input_type:'dropdown', options:['Manual count / physical','Spreadsheet','Inventory software','I don\'t manage formally'], order_index:16 },
  { block:'C', question_text:'Do you have a list of your regular suppliers or vendors?', input_type:'yes-no', options:null, order_index:17 },
  { block:'C', question_text:'How many days on average does it take to fulfil an order or complete a service?', input_type:'number', options:null, order_index:18 },
  { block:'C', question_text:'Do you experience regular stock-outs or supply disruptions?', input_type:'yes-no', options:null, order_index:19 },
  { block:'C', question_text:'How do you ensure consistent quality in your product or service delivery?', input_type:'short-text', options:null, order_index:20 },
  // Block D — Human Resources
  { block:'D', question_text:'How many full-time employees or staff do you currently have?', input_type:'number', options:null, order_index:21 },
  { block:'D', question_text:'Do your employees or key staff have written agreements or offer letters?', input_type:'yes-no', options:null, order_index:22 },
  { block:'D', question_text:'Do you pay your staff consistently and on time every month?', input_type:'yes-no', options:null, order_index:23 },
  { block:'D', question_text:'Do you have a payroll or salary schedule documented somewhere?', input_type:'yes-no', options:null, order_index:24 },
  { block:'D', question_text:'Have you provided any form of training or skills development for staff in the past 12 months?', input_type:'yes-no', options:null, order_index:25 },
  { block:'D', question_text:'Do you have defined roles and responsibilities for each staff member?', input_type:'yes-no', options:null, order_index:26 },
  // Block E — Marketing & Sales
  { block:'E', question_text:'How do most customers currently find out about your business?', input_type:'multi-select', options:['Word of mouth','Social media','Walk-in','Online search','Referrals','Advertising'], order_index:27 },
  { block:'E', question_text:'Do you actively use social media to promote your business?', input_type:'yes-no', options:null, order_index:28 },
  { block:'E', question_text:'Do you have a way to contact your existing customers (e.g. a list, WhatsApp group)?', input_type:'yes-no', options:null, order_index:29 },
  { block:'E', question_text:'Do you track your daily or weekly sales figures?', input_type:'yes-no', options:null, order_index:30 },
  { block:'E', question_text:'How do you handle customer complaints or returns?', input_type:'short-text', options:null, order_index:31 },
  { block:'E', question_text:'Do you offer any loyalty or repeat-customer incentives?', input_type:'yes-no', options:null, order_index:32 },
  // Block F — Technology & Tools
  { block:'F', question_text:'Do you use any digital tools or apps to help run your business?', input_type:'yes-no', options:null, order_index:33 },
  { block:'F', question_text:'Which of the following digital tools do you currently use?', input_type:'multi-select', options:['WhatsApp Business','Excel/Google Sheets','POS machine','Accounting software','Project management app','None'], order_index:34 },
  { block:'F', question_text:'How do you currently accept payments from customers?', input_type:'multi-select', options:['Cash','Bank transfer','POS','Mobile money (OPay, Palmpay, etc.)','Online payment (Paystack, Flutterwave)'], order_index:35 },
  { block:'F', question_text:'Do you have a website or online store?', input_type:'yes-no', options:null, order_index:36 },
]

const LAYER2: { block: string; question_text: string; input_type: string; options: string[] | null; order_index: number }[] = [
  // Block A — First Impression (document this within the first 5 minutes of arrival, before you speak to anyone)
  { block:'A', question_text:'Could you identify this as a business immediately from the outside — signage, branding, or any visual cue — without being told?', input_type:'yes-no', options:null, order_index:1 },
  { block:'A', question_text:'Was the entrance or first visible area clean, uncluttered, and presented in a way that signals a functioning business?', input_type:'yes-no', options:null, order_index:2 },
  { block:'A', question_text:'Was there a price list, service menu, or rate card displayed where a customer could read it without asking?', input_type:'yes-no', options:null, order_index:3 },
  { block:'A', question_text:'Did the layout of the space make sense for how the business operates — could you tell where things happen without being shown?', input_type:'yes-no', options:null, order_index:4 },
  { block:'A', question_text:'Was stock, equipment, or materials stored in a way that suggested a system — or was it wherever it happened to land?', input_type:'yes-no', options:null, order_index:5 },
  { block:'A', question_text:'Describe exactly what you saw in the first 5 minutes. Write what a camera would record — not your interpretation, just what was there:', input_type:'short-text', options:null, order_index:6 },

  // Block B — Customer Experience (observe at least 3 customer interactions before answering this block)
  { block:'B', question_text:'Were customers acknowledged within 30 seconds of arriving or making contact — without the customer having to initiate?', input_type:'yes-no', options:null, order_index:7 },
  { block:'B', question_text:'Did staff handle customers from start to finish without needing to consult the owner or get approval for anything?', input_type:'yes-no', options:null, order_index:8 },
  { block:'B', question_text:'When a customer asked about pricing, availability, or process — did staff answer confidently and correctly without guessing or going to check?', input_type:'yes-no', options:null, order_index:9 },
  { block:'B', question_text:'Did the business follow the same steps for every customer — or did each interaction look different depending on who was serving?', input_type:'yes-no', options:null, order_index:10 },
  { block:'B', question_text:'Was a receipt, invoice, or written confirmation of the transaction given to the customer — without them asking for it?', input_type:'yes-no', options:null, order_index:11 },
  { block:'B', question_text:'Describe one complete customer interaction from start to finish — exactly what happened, word for word if possible:', input_type:'short-text', options:null, order_index:12 },
  { block:'B', question_text:'Was there any moment a customer looked confused, waited too long, or had to repeat themselves? Describe it:', input_type:'short-text', options:null, order_index:13 },

  // Block C — Money and Transaction Handling (watch every transaction — do not skip any)
  { block:'C', question_text:'Was every sale recorded immediately at the point of exchange — before the customer left?', input_type:'yes-no', options:null, order_index:14 },
  { block:'C', question_text:'Was a POS machine, receipt printer, or digital invoicing tool actively used — not just sitting on the counter unused?', input_type:'yes-no', options:null, order_index:15 },
  { block:'C', question_text:'Did any transaction happen verbally or with cash exchanged — with no receipt, no record, and no system entry?', input_type:'yes-no', options:null, order_index:16 },
  { block:'C', question_text:'Was cash kept in a till, drawer, or designated place — separate from anyone\'s pocket or personal wallet?', input_type:'yes-no', options:null, order_index:17 },
  { block:'C', question_text:'Describe exactly how the most common type of transaction was handled — step by step, what you physically saw:', input_type:'short-text', options:null, order_index:18 },
  { block:'C', question_text:'If you spotted any transaction that looked informal, unrecorded, or handled differently from others — describe it here:', input_type:'short-text', options:null, order_index:19 },

  // Block D — Staff Behaviour (watch the team, not the owner — note what staff do when the owner is not looking)
  { block:'D', question_text:'Did staff know what to do next without being told — did work flow without direction?', input_type:'yes-no', options:null, order_index:20 },
  { block:'D', question_text:'Were staff actively doing something productive at all times — or did they stop and wait when there was no obvious task?', input_type:'yes-no', options:null, order_index:21 },
  { block:'D', question_text:'Was there one staff member (not the owner) who others naturally looked to for direction — a de facto supervisor or lead?', input_type:'yes-no', options:null, order_index:22 },
  { block:'D', question_text:'Did any staff member refer to a written guide, printed checklist, or documented process at any point during the visit?', input_type:'yes-no', options:null, order_index:23 },
  { block:'D', question_text:'Were staff dressed consistently — uniform, branded clothing, or an obvious shared dress standard — or was everyone in whatever they chose?', input_type:'yes-no', options:null, order_index:24 },
  { block:'D', question_text:'Describe a specific moment that showed whether the team functions as a unit or as individuals doing separate things:', input_type:'short-text', options:null, order_index:25 },

  // Block E — Owner Dependency (this is one of the most important blocks — watch specifically what the owner does, not what they say)
  { block:'E', question_text:'Did staff ask the owner to approve, decide, or be involved in anything that a trained staff member should handle independently?', input_type:'yes-no', options:null, order_index:26 },
  { block:'E', question_text:'When the owner was occupied or stepped away — did operations continue smoothly, or did things pause until they returned?', input_type:'yes-no', options:null, order_index:27 },
  { block:'E', question_text:'Was the owner doing tasks — serving customers, handling money, packing, answering calls — rather than managing or overseeing?', input_type:'yes-no', options:null, order_index:28 },
  { block:'E', question_text:'Was there a single moment where the business clearly could not proceed without the owner\'s direct involvement? Describe it:', input_type:'short-text', options:null, order_index:29 },
  { block:'E', question_text:'Based on everything you observed: if the owner did not come in tomorrow, how would the business operate?', input_type:'dropdown', options:['It would stop completely','It would struggle badly and likely lose customers','It would manage basic tasks but miss important things','It would run mostly fine for a day or two','It would run exactly as normal'], order_index:30 },

  // Block F — Systems and Documentation (ask to see these directly — do not accept "yes we have it" without seeing it)
  { block:'F', question_text:'Ask to see the sales record or transaction log for today. Was it available, up to date, and maintained by staff (not the owner)?', input_type:'yes-no', options:null, order_index:31 },
  { block:'F', question_text:'Ask to see the staff schedule or duty roster for this week. Did it exist in written or digital form?', input_type:'yes-no', options:null, order_index:32 },
  { block:'F', question_text:'Ask to see how they document a core task — e.g. how an order is processed, how stock is counted. Was any written process shown to you?', input_type:'yes-no', options:null, order_index:33 },
  { block:'F', question_text:'Was any software, app, or digital tool actively open and in use during the visit — not just mentioned as something they have?', input_type:'yes-no', options:null, order_index:34 },
  { block:'F', question_text:'What was the single biggest gap you personally witnessed that the owner is unlikely to have mentioned or noticed themselves?', input_type:'short-text', options:null, order_index:35 },
  { block:'F', question_text:'What did the business do well — something that would not have been obvious without being there in person?', input_type:'short-text', options:null, order_index:36 },
]

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function POST(req: Request) {
  if (!verifyOperatorSecret(req)) return forbidden()
  const { business_type_id } = await req.json()
  if (!business_type_id) return NextResponse.json({ error: 'business_type_id required' }, { status: 400, headers: corsHeaders() })

  const db = operatorAdminClient()

  // Clear existing questions for this type
  await db.from('questions').delete().eq('business_type_id', business_type_id)

  const rows = [
    ...LAYER1.map(q => ({ ...q, business_type_id, layer: 1 })),
    ...LAYER2.map(q => ({ ...q, business_type_id, layer: 2 })),
  ]

  const { error } = await db.from('questions').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() })

  return NextResponse.json({ success: true, inserted: rows.length }, { headers: corsHeaders() })
}
