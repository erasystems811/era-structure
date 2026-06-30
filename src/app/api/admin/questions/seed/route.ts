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
  // Block A — Financial Depth
  { block:'A', question_text:'Do you have audited or formally reviewed financial statements for the past year?', input_type:'yes-no', options:null, order_index:1 },
  { block:'A', question_text:'What is your current gross profit margin (%)?', input_type:'number', options:null, order_index:2 },
  { block:'A', question_text:'Do you prepare an annual budget before the start of each year?', input_type:'yes-no', options:null, order_index:3 },
  { block:'A', question_text:'Do you have a credit facility, overdraft, or loan line with any bank?', input_type:'yes-no', options:null, order_index:4 },
  { block:'A', question_text:'How many months of operating expenses do you have saved as a cash reserve?', input_type:'number', options:null, order_index:5 },
  { block:'A', question_text:'Do you use financial forecasting (projecting future revenue or costs)?', input_type:'yes-no', options:null, order_index:6 },
  { block:'A', question_text:'Are all your income streams (revenue sources) clearly separated and tracked?', input_type:'yes-no', options:null, order_index:7 },
  { block:'A', question_text:'Do you have a plan for reinvesting profit back into the business?', input_type:'yes-no', options:null, order_index:8 },
  // Block B — Operational Depth
  { block:'B', question_text:'Do you have documented Standard Operating Procedures (SOPs) for key processes?', input_type:'yes-no', options:null, order_index:9 },
  { block:'B', question_text:'How do you currently measure operational efficiency or output quality?', input_type:'short-text', options:null, order_index:10 },
  { block:'B', question_text:'Do you conduct regular quality checks on your products or service delivery?', input_type:'yes-no', options:null, order_index:11 },
  { block:'B', question_text:'Do you have a business continuity plan (what happens if you or a key person is unavailable)?', input_type:'yes-no', options:null, order_index:12 },
  { block:'B', question_text:'Do you have any industry certifications, licences, or permits currently active?', input_type:'yes-no', options:null, order_index:13 },
  { block:'B', question_text:'How frequently do you review and update your operational processes?', input_type:'dropdown', options:['Never','Yearly','Every 6 months','Quarterly','Monthly'], order_index:14 },
  { block:'B', question_text:'Do you have a documented supplier agreement or procurement policy?', input_type:'yes-no', options:null, order_index:15 },
  // Block C — HR & Organisation
  { block:'C', question_text:'Do you have an organisational chart that shows reporting lines?', input_type:'yes-no', options:null, order_index:16 },
  { block:'C', question_text:'Do you conduct formal performance reviews for your staff?', input_type:'yes-no', options:null, order_index:17 },
  { block:'C', question_text:'Do you have written HR policies (leave, disciplinary procedures, code of conduct)?', input_type:'yes-no', options:null, order_index:18 },
  { block:'C', question_text:'Do you have a succession plan for any critical role in the business?', input_type:'yes-no', options:null, order_index:19 },
  { block:'C', question_text:'What is your approximate staff turnover rate per year (%)?', input_type:'number', options:null, order_index:20 },
  { block:'C', question_text:'Do you comply with Nigerian Labour Act requirements (pension, NSITF, ITF, etc.)?', input_type:'yes-no', options:null, order_index:21 },
  { block:'C', question_text:'How do you handle onboarding of new staff?', input_type:'short-text', options:null, order_index:22 },
  // Block D — Market & Growth
  { block:'D', question_text:'Have you conducted any formal market research or competitor analysis in the past year?', input_type:'yes-no', options:null, order_index:23 },
  { block:'D', question_text:'Do you have a documented marketing or business development strategy?', input_type:'yes-no', options:null, order_index:24 },
  { block:'D', question_text:'Do you know your customer acquisition cost (how much it costs to get one new customer)?', input_type:'yes-no', options:null, order_index:25 },
  { block:'D', question_text:'Do you track your customer retention or repeat purchase rate?', input_type:'yes-no', options:null, order_index:26 },
  { block:'D', question_text:'Do you have any formal strategic partnerships, B2B contracts, or distribution agreements?', input_type:'yes-no', options:null, order_index:27 },
  { block:'D', question_text:'Have you explored or entered any new markets or product lines in the past 12 months?', input_type:'yes-no', options:null, order_index:28 },
  { block:'D', question_text:'What is the biggest challenge currently limiting your business growth?', input_type:'short-text', options:null, order_index:29 },
  // Block E — Compliance & Risk
  { block:'E', question_text:'Are you current with all tax filings — income tax, VAT, and any applicable state levies?', input_type:'yes-no', options:null, order_index:30 },
  { block:'E', question_text:'Do you have any active business insurance (fire, liability, goods in transit, etc.)?', input_type:'yes-no', options:null, order_index:31 },
  { block:'E', question_text:'Are there any pending legal disputes, court cases, or regulatory issues?', input_type:'yes-no', options:null, order_index:32 },
  { block:'E', question_text:'Do you conduct risk assessments for your business operations?', input_type:'yes-no', options:null, order_index:33 },
  { block:'E', question_text:'Do you have a data protection or customer privacy policy?', input_type:'yes-no', options:null, order_index:34 },
  { block:'E', question_text:'Is your business fully compliant with all applicable sector regulations?', input_type:'yes-no', options:null, order_index:35 },
  // Block F — Strategic Direction
  { block:'F', question_text:'Do you have a written business plan (even a simple one)?', input_type:'yes-no', options:null, order_index:36 },
  { block:'F', question_text:'Have you set specific revenue or growth targets for the next 12 months?', input_type:'yes-no', options:null, order_index:37 },
  { block:'F', question_text:'Does your business have a clearly defined mission and vision statement?', input_type:'yes-no', options:null, order_index:38 },
  { block:'F', question_text:'Are your employees or key staff aware of the company goals for this year?', input_type:'yes-no', options:null, order_index:39 },
  { block:'F', question_text:'Do you review your overall business strategy at least once a year?', input_type:'yes-no', options:null, order_index:40 },
  { block:'F', question_text:'What is your primary goal for the business in the next 12 months?', input_type:'short-text', options:null, order_index:41 },
  { block:'F', question_text:'Do you have an exit strategy or long-term transition plan for the business?', input_type:'yes-no', options:null, order_index:42 },
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
