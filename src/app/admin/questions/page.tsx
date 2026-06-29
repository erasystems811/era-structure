import { createClient } from '@/lib/supabase/server'
import { QuestionsClient } from '@/components/admin/QuestionsClient'

export default async function QuestionsPage() {
  const supabase = await createClient()
  const { data: businessTypes } = await supabase.from('business_types').select('*').order('name')
  const { data: questions } = await supabase.from('questions').select('*').eq('is_active', true).order('order_index')

  return <QuestionsClient businessTypes={businessTypes ?? []} allQuestions={questions ?? []} />
}
