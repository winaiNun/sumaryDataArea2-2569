import { getSheetRows } from '../utils/sheetsStore'

export default defineEventHandler(async () => {
  const rows = await getSheetRows('4. นโยบาย สพฐ.')
  return rows
    .map(r => ({
      code: String(r['DMC Code'] || ''),
      name: String(r['ชื่อโรงเรียน'] || ''),
      district: String(r['อำเภอ'] || ''),
      qualitySchool: String(r['โรงเรียนคุณภาพ'] || '') === 'ใช่',
      homeSchool: String(r['Home School'] || '') === 'ใช่'
    }))
    .filter(r => r.code)
})
