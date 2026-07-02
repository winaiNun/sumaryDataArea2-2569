const TTL = 30_000
let _cache: { data: Record<string, any[]>; ts: number } | null = null

function getUrl(): string {
  const url = process.env.APPS_SCRIPT_URL
  if (!url) throw createError({ statusCode: 500, statusMessage: 'APPS_SCRIPT_URL ยังไม่ได้ตั้งค่าใน .env' })
  return url
}

export async function getSheetRows(name: string): Promise<Record<string, any>[]> {
  const now = Date.now()
  if (!_cache || now - _cache.ts > TTL) {
    const res = await $fetch<{ ok: boolean; data: Record<string, any[]> }>(getUrl())
    if (!res.ok) throw createError({ statusCode: 502, statusMessage: 'Apps Script ตอบกลับ error' })
    _cache = { data: res.data, ts: now }
  }
  return (_cache!.data[name] || []) as Record<string, any>[]
}

export function invalidateCache(): void { _cache = null }

export function getScriptUrl(): string { return getUrl() }
