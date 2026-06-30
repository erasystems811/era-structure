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
  // Block A — Owner's Daily Tasks
  { block:'A', question_text:"Owner: Your 3 biggest time-consuming tasks every day (e.g. banking, customer calls, packing orders):", input_type:'short-text', options:null, order_index:1 },
  { block:'A', question_text:"Owner: Tasks ONLY you can do right now — nobody else knows how (list them briefly):", input_type:'short-text', options:null, order_index:2 },
  { block:'A', question_text:"Owner: Tasks you'd hand off today if someone was properly trained (list them):", input_type:'short-text', options:null, order_index:3 },
  { block:'A', question_text:"Owner: How many hours per day do you spend doing tasks yourself (not managing or planning)?", input_type:'number', options:null, order_index:4 },
  { block:'A', question_text:"Owner: When you're absent, which tasks do NOT get done because nobody else knows how?", input_type:'short-text', options:null, order_index:5 },
  { block:'A', question_text:"Owner: One thing you did yesterday that you honestly feel is NOT your job:", input_type:'short-text', options:null, order_index:6 },

  // Block B — Staff Task Mapping
  { block:'B', question_text:"Staff member 1 — full name and role (e.g. Precious — Cashier):", input_type:'short-text', options:null, order_index:7 },
  { block:'B', question_text:"Staff member 1 — their 3 main tasks every day (ask them directly, write what they say):", input_type:'short-text', options:null, order_index:8 },
  { block:'B', question_text:"Staff member 2 — full name and role:", input_type:'short-text', options:null, order_index:9 },
  { block:'B', question_text:"Staff member 2 — their 3 main tasks every day (ask them directly, write what they say):", input_type:'short-text', options:null, order_index:10 },
  { block:'B', question_text:"Staff member 3 — full name and role (skip if not applicable):", input_type:'short-text', options:null, order_index:11 },
  { block:'B', question_text:"Staff member 3 — their 3 main tasks every day (skip if not applicable):", input_type:'short-text', options:null, order_index:12 },

  // Block C — Stress and Pressure Points
  { block:'C', question_text:"Staff member 1 — most stressful part of their job (their exact words):", input_type:'short-text', options:null, order_index:13 },
  { block:'C', question_text:"Staff member 1 — something they do regularly but were never trained for:", input_type:'short-text', options:null, order_index:14 },
  { block:'C', question_text:"Staff member 2 — most stressful part of their job (their exact words):", input_type:'short-text', options:null, order_index:15 },
  { block:'C', question_text:"Staff member 2 — something they do regularly but were never trained for:", input_type:'short-text', options:null, order_index:16 },
  { block:'C', question_text:"Owner — what about running this business stresses you most?", input_type:'short-text', options:null, order_index:17 },
  { block:'C', question_text:"Owner — a task you do every day that was never meant to be yours long-term:", input_type:'short-text', options:null, order_index:18 },

  // Block D — What Breaks If Someone Is Absent
  { block:'D', question_text:"Staff member 1 — if they didn't come in tomorrow, what would NOT get done?", input_type:'short-text', options:null, order_index:19 },
  { block:'D', question_text:"Staff member 2 — if they didn't come in tomorrow, what would NOT get done?", input_type:'short-text', options:null, order_index:20 },
  { block:'D', question_text:"Owner — if you were away for one week, what would break first in the business?", input_type:'short-text', options:null, order_index:21 },
  { block:'D', question_text:"Which tasks exist only in ONE person's head — if they left, the knowledge goes with them?", input_type:'short-text', options:null, order_index:22 },
  { block:'D', question_text:"Has a staff departure or absence ever caused a problem that surprised you? Briefly describe what happened:", input_type:'short-text', options:null, order_index:23 },
  { block:'D', question_text:"If the owner and one key staff were both unavailable for a full day, what would happen?", input_type:'dropdown', options:['Business would stop completely','Would struggle badly and lose customers','Would manage basics but miss important things','Would run mostly fine','Would run exactly as normal'], order_index:24 },

  // Block E — Who Makes Decisions
  { block:'E', question_text:"Staff member 1 — when something unexpected happens, do they handle it or call the owner?", input_type:'dropdown', options:['Always calls the owner','Usually calls the owner','Depends on the situation','Usually handles it themselves','Always handles it themselves'], order_index:25 },
  { block:'E', question_text:"Staff member 2 — when something unexpected happens, do they handle it or call the owner?", input_type:'dropdown', options:['Always calls the owner','Usually calls the owner','Depends on the situation','Usually handles it themselves','Always handles it themselves'], order_index:26 },
  { block:'E', question_text:"Owner — what do staff call or message you about that you think they should decide themselves?", input_type:'short-text', options:null, order_index:27 },
  { block:'E', question_text:"Staff member 1 — something they cannot decide without the owner's approval:", input_type:'short-text', options:null, order_index:28 },
  { block:'E', question_text:"Staff member 2 — something they cannot decide without the owner's approval:", input_type:'short-text', options:null, order_index:29 },
  { block:'E', question_text:"How would you describe decision-making in this business overall?", input_type:'dropdown', options:['Everything goes back to the owner','Most things go back to the owner','Staff handle routine, owner handles unusual','Staff make most decisions independently','Staff are fully empowered in their roles'], order_index:30 },

  // Block F — Hidden and Undocumented Work
  { block:'F', question_text:"Staff member 1 — something they do regularly that they were never officially asked to do:", input_type:'short-text', options:null, order_index:31 },
  { block:'F', question_text:"Staff member 2 — something they do regularly that they were never officially asked to do:", input_type:'short-text', options:null, order_index:32 },
  { block:'F', question_text:"Staff member 1 — something about how this business really runs that the owner may not fully know:", input_type:'short-text', options:null, order_index:33 },
  { block:'F', question_text:"Owner — a process in your business that 'works' but you know isn't the right way to do it:", input_type:'short-text', options:null, order_index:34 },
  { block:'F', question_text:"Is anyone doing tasks clearly above or below their actual role? Name them and describe:", input_type:'short-text', options:null, order_index:35 },
  { block:'F', question_text:"The most honest thing said today that the owner probably did not expect to hear:", input_type:'short-text', options:null, order_index:36 },
]

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function POST(req: Request) {
  if (!verifyOperatorSecret(req)) return forbidden()
  const { business_type_id, layer } = await req.json()
  if (!business_type_id) return NextResponse.json({ error: 'business_type_id required' }, { status: 400, headers: corsHeaders() })

  const db = operatorAdminClient()

  const seedLayer1 = !layer || layer === 1
  const seedLayer2 = !layer || layer === 2

  // Only delete the layer(s) being reseeded
  if (seedLayer1) await db.from('questions').delete().eq('business_type_id', business_type_id).eq('layer', 1)
  if (seedLayer2) await db.from('questions').delete().eq('business_type_id', business_type_id).eq('layer', 2)

  const rows = [
    ...(seedLayer1 ? LAYER1.map(q => ({ ...q, business_type_id, layer: 1 })) : []),
    ...(seedLayer2 ? LAYER2.map(q => ({ ...q, business_type_id, layer: 2 })) : []),
  ]

  const { error } = await db.from('questions').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() })

  return NextResponse.json({ success: true, inserted: rows.length }, { headers: corsHeaders() })
}
