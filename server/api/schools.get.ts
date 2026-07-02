import { getSheetRows } from '../utils/sheetsStore'

export default defineEventHandler(async () => {
  const rows = await getSheetRows('4. นโยบาย สพฐ.')
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'ยังไม่มีข้อมูล' })

  return rows.map((row, index) => {
    const statusCols = Object.keys(row).filter(k => k.endsWith('(สถานะ)'))
    const evidenceCols = Object.keys(row).filter(k => k.endsWith('(หลักฐาน)'))
    const doneCount = statusCols.filter(k => row[k] === 'ดำเนินการแล้ว').length
    const evidenceCount = evidenceCols.filter(k => row[k] && String(row[k]).trim() !== '').length
    const progress = statusCols.length > 0 ? Math.round((doneCount / statusCols.length) * 100) : 0
    const evidence = evidenceCols.length > 0 ? Math.round((evidenceCount / evidenceCols.length) * 100) : 0

    return {
      id: index + 1,
      schoolName: row['ชื่อโรงเรียน'] || `โรงเรียน ${index + 1}`,
      district: row['อำเภอ'] || 'ไม่ระบุ',
      network: row['ศูนย์เครือข่าย'] || 'ไม่ระบุ',
      evaluationStatus: row['สถานะการประเมิน'] || 'ยังไม่เริ่มประเมิน',
      progress, evidence,
      note: row['ผู้ประเมิน'] || ''
    }
  })
})
