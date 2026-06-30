'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ERALogo } from '@/components/shared/ERALogo'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function LoginPage() {
  const [businessNumber, setBusinessNumber] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const padded = businessNumber.trim().padStart(4, '0')
    const email = `era${padded}@era.internal`

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Invalid business number or password.')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#F4F2EE] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <ERALogo size="lg" variant="full" />
        </div>

        <div className="bg-white rounded-2xl border border-[#0D1B3E]/8 shadow-sm p-8">
          <h1 className="text-lg font-semibold text-[#0D1B3E] mb-1">Sign in</h1>
          <p className="text-sm text-[#666] mb-6">Enter your business number and password</p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <Input
              id="business_number"
              type="text"
              label="Business Number"
              placeholder="e.g. 0001"
              value={businessNumber}
              onChange={e => setBusinessNumber(e.target.value.replace(/\D/g, ''))}
              required
            />
            <Input
              id="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />

            {error && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} size="lg" className="mt-1 w-full">
              Sign in
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-[#999] mt-6">
          ERA Systems LTD · RC 9536766 · erasystems.com.ng
        </p>
      </div>
    </div>
  )
}
