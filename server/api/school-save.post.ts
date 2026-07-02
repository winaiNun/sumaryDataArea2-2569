import { getScriptUrl, invalidateCache } from '../utils/sheetsStore'

const SHEET_KEYS = [
  '1. ความพร้อมเปิดเรียน',
  '2. จุดเน้นเขตพื้นที่',
  '3. การประกันภายใน',
  '4. นโยบาย สพฐ.'
]

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { code, updates } = body as { code: string; updates: Array<{ sheetIdx: number; col: string; value: string }> }

  if (!code || !Array.isArray(updates) || !updates.length) {
    throw createError({ statusCode: 400, statusMessage: 'ข้อมูลไม่ครบถ้วน' })
  }

  const appsUpdates = updates.map(u => ({
    sheetName: SHEET_KEYS[u.sheetIdx],
    col: u.col,
    value: u.value
  }))

  await $fetch(getScriptUrl(), {
    method: 'POST',
    body: { action: 'updateSchool', code, updates: appsUpdates }
  })

  invalidateCache()
  return { success: true }
})
