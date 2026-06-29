import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClientNav } from '@/components/client/ClientNav'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('owner_profiles')
    .select('role, business_id')
    .eq('user_id', user.id)
    .single()

  if (profile?.role === 'admin') redirect('/admin/dashboard')

  const { data: business } = await supabase
    .from('businesses')
    .select('*, business_types(name)')
    .eq('id', profile?.business_id)
    .single()

  return (
    <div className="min-h-screen bg-[#F4F2EE]">
      <ClientNav business={business} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
