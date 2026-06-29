export async function GET() {
  return Response.json({ ok: true, service: 'era-structure', ts: Date.now() })
}
