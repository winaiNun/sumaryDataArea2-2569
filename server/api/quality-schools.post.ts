import { getScriptUrl, invalidateCache } from '../utils/sheetsStore'

export default defineEventHandler(async (event) => {
  const { flags } = await readBody(event) as {
    flags: Array<{ code: string; qualitySchool: string; homeSchool: string }>
  }
  if (!Array.isArray(flags)) throw createError({ statusCode: 400, statusMessage: 'ข้อมูลไม่ถูกต้อง' })
  await $fetch(getScriptUrl(), {
    method: 'POST',
    body: { action: 'setSchoolFlags', flags }
  })
  invalidateCache()
  return { ok: true }
})
