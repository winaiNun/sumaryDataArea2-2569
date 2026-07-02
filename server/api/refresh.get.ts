import { invalidateCache } from '../utils/sheetsStore'

export default defineEventHandler(() => {
  invalidateCache()
  return { ok: true }
})
