export type BusinessStage = 'assessment' | 'guide' | 'maintenance'
export type ReportStatus = 'pending' | 'released'
export type InputType = 'dropdown' | 'multi-select' | 'yes-no' | 'short-text' | 'number' | 'voice-note'
export type DocumentCategory = 'operations' | 'people' | 'finance' | 'customer' | 'standards'
export type DocumentHealth = 'green' | 'amber' | 'red' | 'locked'

export interface BusinessType {
  id: string
  name: string
  created_at: string
}

export interface Question {
  id: string
  business_type_id: string
  layer: 1 | 2
  block: string
  question_text: string
  input_type: InputType
  options: string[] | null
  order_index: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Business {
  id: string
  name: string
  owner_name: string
  owner_phone: string
  owner_email: string
  business_type_id: string
  business_type?: BusinessType
  stage: BusinessStage
  is_active: boolean
  is_locked: boolean
  locked_at: string | null
  created_at: string
}

export interface StaffMember {
  id: string
  business_id: string
  name: string
  role: string
  whatsapp_number: string
  is_active: boolean
  created_at: string
}

export interface Layer1Response {
  id: string
  business_id: string
  answers: Record<string, unknown>
  submitted_at: string
  admin_released: boolean
}

export interface ObservationSchedule {
  id: string
  business_id: string
  day1_date: string
  day2_date: string
  notes: string | null
  generated_questions: Question[] | null
  created_at: string
}

export interface Layer2Response {
  id: string
  business_id: string
  answers: Record<string, unknown>
  photo_uploads: string[]
  submitted_at: string
}

export interface Report {
  id: string
  business_id: string
  generated_content: ReportContent
  admin_notes: string | null
  status: ReportStatus
  generated_at: string
  released_at: string | null
}

export interface ReportContent {
  business_snapshot: string
  contradiction: string
  gap_analysis: string
  revenue_leaks: RevenueLeakItem[]
  delegation_readiness: string
  priority_sequence: string
  structured_vision: string
}

export interface RevenueLeakItem {
  title: string
  description: string
  calculation: string
  monthly_naira: number
}

export interface Document {
  id: string
  business_id: string
  title: string
  category: DocumentCategory
  google_doc_id: string | null
  google_doc_url: string | null
  assigned_role: string | null
  assigned_staff_id: string | null
  last_reviewed_at: string | null
  next_review_due: string | null
  review_cycle_days: number
  is_active: boolean
  created_at: string
}

export interface GuideSession {
  id: string
  business_id: string
  session_date: string
  messages: ChatMessage[]
  completed_tasks: string[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  voice_note_url?: string
}

export interface Checklist {
  id: string
  business_id: string
  staff_id: string
  date: string
  tasks: ChecklistTask[]
  send_time: string
}

export interface ChecklistTask {
  index: number
  description: string
  completed: boolean
  completed_at: string | null
}

export interface Payment {
  id: string
  business_id: string
  amount: number
  currency: string
  flutterwave_ref: string
  status: string
  paid_at: string | null
  unlock_triggered: boolean
}

export interface AdminNote {
  id: string
  business_id: string
  note: string
  created_by: string
  created_at: string
}

export interface SectionFeedback {
  id: string
  business_id: string
  section_name: string
  question: string
  response: string
  submitted_at: string
}
