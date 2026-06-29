'use client'
import { ERALogo } from '@/components/shared/ERALogo'
import { formatDate } from '@/lib/utils'
import { Lock } from 'lucide-react'

interface Props {
  business: { name: string; locked_at: string | null }
}

export function LockedScreen({ business }: Props) {
  return (
    <div className="min-h-screen bg-[#F4F2EE] flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-6">
          <ERALogo size="lg" />
        </div>

        <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-8">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <Lock size={24} className="text-red-500" />
          </div>

          <h1 className="text-lg font-bold text-[#0D1B3E] mb-2">Account locked</h1>
          <p className="text-sm text-[#666] mb-1">{business.name}</p>
          {business.locked_at && (
            <p className="text-xs text-[#999] mb-5">Locked on {formatDate(business.locked_at)}</p>
          )}

          <p className="text-sm text-[#1A1A2E] leading-relaxed">
            Your account has been locked due to a missed document review. Contact ERA Systems to restore access.
          </p>
        </div>

        <p className="text-xs text-[#999] mt-5">
          Reach out to your ERA consultant to unlock your account.
        </p>
      </div>
    </div>
  )
}
