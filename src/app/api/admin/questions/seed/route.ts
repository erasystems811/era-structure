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
  // Block A — The Owner's Real Day (interview the owner — ask them to be specific, not general)
  { block:'A', question_text:'List every task you personally do from the moment you start work to the moment you stop — include everything, even the small things you do automatically without thinking:', input_type:'short-text', options:null, order_index:1 },
  { block:'A', question_text:'Of everything on that list, which 3 tasks consume the most of your time each day?', input_type:'short-text', options:null, order_index:2 },
  { block:'A', question_text:'Which tasks on that list could only you do — not because no one is trained, but because there is no documented way for anyone else to do them?', input_type:'short-text', options:null, order_index:3 },
  { block:'A', question_text:'Which tasks would you hand off today if someone reliable could take them?', input_type:'short-text', options:null, order_index:4 },
  { block:'A', question_text:'Describe your typical Monday from start to finish — what happens, in what order, from the time you begin to the time you stop:', input_type:'short-text', options:null, order_index:5 },
  { block:'A', question_text:'On a day when you cannot come in, which tasks simply do not get done — not because no one wants to do them, but because no one knows how?', input_type:'short-text', options:null, order_index:6 },

  // Block B — Staff Task Mapping (interview each key staff member one at a time, separately from the owner — write their exact words)
  { block:'B', question_text:'List the names and roles of all key staff members you will interview in this block:', input_type:'short-text', options:null, order_index:7 },
  { block:'B', question_text:'First staff member — ask them: "Walk me through everything you do in a typical day from when you arrive to when you leave." Write exactly what they say:', input_type:'short-text', options:null, order_index:8 },
  { block:'B', question_text:'Second staff member — same question: "Walk me through everything you do in a typical day." Write exactly what they say:', input_type:'short-text', options:null, order_index:9 },
  { block:'B', question_text:'Third staff member (if applicable) — same question. Write exactly what they say:', input_type:'short-text', options:null, order_index:10 },
  { block:'B', question_text:'After interviewing all staff, list any tasks that more than one person said they do — tasks with no clear single owner:', input_type:'short-text', options:null, order_index:11 },
  { block:'B', question_text:'List any tasks the owner said they do that staff members also said they do — overlaps where it is not clear who is responsible:', input_type:'short-text', options:null, order_index:12 },

  // Block C — Stress and Pressure Points (ask each person separately — their honest answers reveal where structure is missing)
  { block:'C', question_text:'Ask each staff member: "What is the most stressful part of your job?" Write their name and their exact answer for each person:', input_type:'short-text', options:null, order_index:13 },
  { block:'C', question_text:'Ask each staff member: "What part of your day do you dread the most?" Write their name and their exact answer:', input_type:'short-text', options:null, order_index:14 },
  { block:'C', question_text:'Ask the owner: "What part of running this business causes you the most stress or keeps you up at night?" Write their exact words:', input_type:'short-text', options:null, order_index:15 },
  { block:'C', question_text:'Ask each staff member: "Is there anything you are expected to do regularly that you were never properly trained or shown how to do?" Write their answers:', input_type:'short-text', options:null, order_index:16 },
  { block:'C', question_text:'Ask the owner: "Is there a task you do every day that you never intended to be your responsibility long-term — something you just ended up doing?" Write their answer:', input_type:'short-text', options:null, order_index:17 },
  { block:'C', question_text:'Based on all the answers in this block — which task or situation came up most as a source of stress, and what does that tell you about the business?', input_type:'short-text', options:null, order_index:18 },

  // Block D — What Would Break If Someone Was Absent (this block reveals which roles have no backup and which processes live only in someone's head)
  { block:'D', question_text:'Ask each staff member: "If you did not come in tomorrow, what would not get done — and would anyone else even know it needed doing?" Write their name and their answer:', input_type:'short-text', options:null, order_index:19 },
  { block:'D', question_text:'Ask the owner: "If you could not come in for one full week, what would genuinely break down in this business?" Write their exact words:', input_type:'short-text', options:null, order_index:20 },
  { block:'D', question_text:'Are there any tasks that only one person knows how to do — where if that person left or was sick, the knowledge would leave with them? List them and who holds them:', input_type:'short-text', options:null, order_index:21 },
  { block:'D', question_text:'Ask the owner: "Has a staff member ever left or been absent and caused a problem that surprised you — something you did not realise they were the only one handling?" Describe what happened:', input_type:'short-text', options:null, order_index:22 },
  { block:'D', question_text:'List the parts of this business that currently depend entirely on one specific person being present or available:', input_type:'short-text', options:null, order_index:23 },
  { block:'D', question_text:'If the owner and one key staff member were both unavailable for a full day — what would happen to the business?', input_type:'dropdown', options:['It would stop completely','It would struggle badly and lose customers','It would manage basics but miss important things','It would run mostly fine','It would run exactly as normal'], order_index:24 },

  // Block E — Who Decides What (this block maps the real decision-making structure — not the official one, the actual one)
  { block:'E', question_text:'Ask each staff member: "When something unexpected happens at work — something outside your normal day — what do you do? Handle it yourself, ask a colleague, or call the owner?" Write their name and answer:', input_type:'short-text', options:null, order_index:25 },
  { block:'E', question_text:'Ask the owner: "What kinds of things do staff call or message you about that you think they should be able to decide on their own?" Write their answer:', input_type:'short-text', options:null, order_index:26 },
  { block:'E', question_text:'Ask each staff member: "Is there anything you are not allowed to decide yourself that slows down your work or makes your job harder?" Write their answers:', input_type:'short-text', options:null, order_index:27 },
  { block:'E', question_text:'Are there unwritten rules about who makes which decisions — things everyone seems to know but that are never written down anywhere? List them:', input_type:'short-text', options:null, order_index:28 },
  { block:'E', question_text:'Based on your conversations: does this business have a real decision-making structure, or does everything eventually come back to the owner regardless of what it is?', input_type:'dropdown', options:['Everything goes back to the owner','Most things go back to the owner','Staff handle routine things, owner handles anything unusual','Staff make most decisions independently','Staff are fully empowered to decide within their roles'], order_index:29 },
  { block:'E', question_text:'Describe a specific example from your conversations where a decision was escalated to the owner that a properly trained staff member should have handled:', input_type:'short-text', options:null, order_index:30 },

  // Block F — Hidden and Undocumented Work (the most revealing block — what happens that nobody officially talks about)
  { block:'F', question_text:'Ask each staff member: "Is there something you do regularly at work that you were never officially asked to do — something you just started doing because it needed to be done?" Write their name and what they said:', input_type:'short-text', options:null, order_index:31 },
  { block:'F', question_text:'Ask each staff member: "Is there anything about how this business really runs that you think the owner does not fully know or understand?" Write what they say — use their exact words:', input_type:'short-text', options:null, order_index:32 },
  { block:'F', question_text:'Ask the owner: "Is there something that happens in this business that you know is not how it should be done — but it works well enough, so you have never fixed it?" Write their answer:', input_type:'short-text', options:null, order_index:33 },
  { block:'F', question_text:'Were there any tasks being done by the wrong person — a senior person doing junior tasks, or junior staff handling things that are above their level? Describe:', input_type:'short-text', options:null, order_index:34 },
  { block:'F', question_text:'What is one thing you learned from these conversations that the business owner almost certainly does not know about their own business?', input_type:'short-text', options:null, order_index:35 },
  { block:'F', question_text:'Write your overall summary: based on everything you heard today, what is the real state of this business — not what they tell people, but what is actually happening on the ground?', input_type:'short-text', options:null, order_index:36 },
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
