import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClientNav } from '@/components/client/ClientNav'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('owner_profiles')
    .select('role, business_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profile?.role === 'admin') redirect('/admin/dashboard')

  const { data: business } = profile?.business_id
    ? await admin.from('businesses').select('*, business_types(name)').eq('id', profile.business_id).maybeSingle()
    : { data: null }

  return (
    <div className="min-h-screen bg-[#F4F2EE]">
      <ClientNav business={business} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
