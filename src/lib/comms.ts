// ERA Comms integration — fire-and-forget notifications.
// Never throws — logs failures silently so callers are not blocked.

const COMMS_URL    = process.env.ERA_COMMS_API_URL
const COMMS_SECRET = process.env.ERA_COMMS_OPERATOR_SECRET

export interface NotifyOptions {
  to?: string          // E.164 phone number for WhatsApp
  email?: string       // Email address
  subject?: string
  message: string      // Plain-text body
  htmlMessage?: string
}

export async function notify(opts: NotifyOptions): Promise<void> {
  if (!COMMS_URL || !COMMS_SECRET) return // not configured — skip silently

  try {
    await fetch(`${COMMS_URL}/v1/admin/notify`, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'X-Operator-Secret': COMMS_SECRET,
      },
      body: JSON.stringify(opts),
    })
  } catch {
    // fire-and-forget — never block the caller
  }
}

export function reportReadyNotification(opts: {
  ownerName: string
  businessName: string
  ownerPhone?: string | null
  ownerEmail?: string | null
  portalUrl: string
}): NotifyOptions {
  const { ownerName, businessName, ownerPhone, ownerEmail, portalUrl } = opts
  const firstName = ownerName.split(' ')[0]
  const message =
    `Hi ${firstName},\n\n` +
    `Your ERA Structure business analysis report for *${businessName}* is ready.\n\n` +
    `Log in to your portal to view your full report, priority actions, and business roadmap:\n${portalUrl}\n\n` +
    `ERA Structure`

  const htmlMessage = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0d17;font-family:system-ui,-apple-system,sans-serif;color:#e2e0ef">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto">
    <tr><td style="padding:32px">
      <div style="margin-bottom:28px">
        <span style="font-size:22px;font-weight:700;color:#bf7c93">ERA</span>
        <span style="font-size:22px;font-weight:700;color:#e2e0ef"> Structure</span>
      </div>
      <h1 style="font-size:20px;font-weight:700;color:#e2e0ef;margin:0 0 8px">Your business analysis report is ready</h1>
      <p style="color:#8b8a9b;margin:0 0 24px">Hi <strong style="color:#e2e0ef">${firstName}</strong>, your report for <strong style="color:#e2e0ef">${businessName}</strong> has been reviewed and released.</p>

      <div style="background:#1a1729;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;margin-bottom:28px">
        <p style="margin:0 0 8px;font-size:14px;color:#8b8a9b">Your report includes:</p>
        <ul style="margin:0;padding-left:20px;font-size:14px;color:#e2e0ef;line-height:1.8">
          <li>Key findings about your business</li>
          <li>Revenue leakage analysis</li>
          <li>Priority action plan</li>
          <li>SOPs to build out</li>
          <li>Organisational structure guidance</li>
        </ul>
      </div>

      <a href="${portalUrl}" style="display:inline-block;background:#bf7c93;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px">View My Report</a>

      <p style="margin:32px 0 0;font-size:12px;color:#4a4958">ERA Structure · Business systems for Nigerian SMEs.</p>
    </td></tr>
  </table>
</body>
</html>`

  return {
    to:          ownerPhone ?? undefined,
    email:       ownerEmail ?? undefined,
    subject:     `Your ERA Structure report for ${businessName} is ready`,
    message,
    htmlMessage,
  }
}
