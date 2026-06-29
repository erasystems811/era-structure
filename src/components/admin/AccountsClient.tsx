'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import type { Business, BusinessType } from '@/types'
import { Plus, X } from 'lucide-react'

interface Props {
  businessTypes: BusinessType[]
  businesses: (Business & { business_types: { name: string } | null })[]
}

export function AccountsClient({ businessTypes, businesses }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const [form, setForm] = useState({
    name: '', owner_name: '', owner_phone: '',
    owner_email: '', business_type_id: '', password: '',
  })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setShowForm(false)
      setForm({ name: '', owner_name: '', owner_phone: '', owner_email: '', business_type_id: '', password: '' })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-xl font-bold text-[#0D1B3E]">Accounts</h1>
          <p className="text-sm text-[#666] mt-0.5">{businesses.length} business{businesses.length !== 1 ? 'es' : ''}</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={16} className="mr-1.5" /> New account
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="mb-6" gold>
          <div className="px-5 py-4 border-b border-[#C9952B]/20 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#0D1B3E]">Create new account</h2>
            <button onClick={() => setShowForm(false)} className="text-[#999] hover:text-[#0D1B3E]">
              <X size={16} />
            </button>
          </div>
          <CardBody>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Business name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              <Input label="Owner full name" value={form.owner_name} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} required />
              <Input label="WhatsApp number" type="tel" placeholder="+234..." value={form.owner_phone} onChange={e => setForm(f => ({ ...f, owner_phone: e.target.value }))} required />
              <Input label="Email" type="email" value={form.owner_email} onChange={e => setForm(f => ({ ...f, owner_email: e.target.value }))} required />
              <Input label="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#1A1A2E]">Business type</label>
                <select
                  value={form.business_type_id}
                  onChange={e => setForm(f => ({ ...f, business_type_id: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-[#0D1B3E]/15 bg-white px-3.5 py-2.5 text-sm text-[#1A1A2E] focus:outline-none focus:border-[#C9952B] focus:ring-1 focus:ring-[#C9952B]"
                >
                  <option value="">Select type</option>
                  {businessTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {error && <p className="col-span-full text-sm text-red-500">{error}</p>}

              <div className="col-span-full flex gap-3 pt-1">
                <Button type="submit" loading={loading}>Create account</Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Businesses list */}
      <Card>
        <div className="divide-y divide-[#0D1B3E]/6">
          {businesses.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-[#999]">No accounts yet</div>
          )}
          {businesses.map(b => (
            <div key={b.id} className="px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#0D1B3E]">{b.name}</p>
                <p className="text-xs text-[#666] mt-0.5">{b.owner_name} · {b.owner_phone}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={b.is_locked ? 'red' : b.is_active ? 'green' : 'grey'}>
                  {b.is_locked ? 'Locked' : b.is_active ? 'Active' : 'Inactive'}
                </Badge>
                <Badge variant="navy">{b.business_types?.name}</Badge>
                <Badge variant="grey" className="hidden sm:inline-flex">{b.stage}</Badge>
                <span className="text-xs text-[#999] hidden md:block">{formatDate(b.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
