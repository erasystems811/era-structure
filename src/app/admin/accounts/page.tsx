import { createClient, createAdminClient } from '@/lib/supabase/server'
import { AccountsClient } from '@/components/admin/AccountsClient'

export default async function AccountsPage() {
  const supabase = await createClient()
  const { data: businessTypes } = await supabase.from('business_types').select('*').order('name')
  const { data: businesses } = await supabase
    .from('businesses')
    .select('*, business_types(name)')
    .order('created_at', { ascending: false })

  return <AccountsClient businessTypes={businessTypes ?? []} businesses={businesses ?? []} />
}
