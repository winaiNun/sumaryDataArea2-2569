import { getSheetRows } from '../utils/sheetsStore'

type Cfg = {
  sheetKey: string
  colFilter: (cols: string[], k: string) => string[]
  statusSuffix: string
  evidenceSuffix: string
  classify: (v: string) => 'done' | 'mid' | 'none'
  getStatusCols?: (relevantCols: string[]) => string[]
  getEvidenceCol?: (sCol: string) => string
}

const CONFIGS: Cfg[] = [
  {
    sheetKey: '1. ความพร้อมเปิดเรียน',
    colFilter: (cols, k) => cols.filter(c => /^ข้อ\s*\d+/.test(c) && (k ? new RegExp(`^ข้อ\\s*${k}\\.`).test(c) : true) && (c.endsWith('(สถานะ)') || c.endsWith('(หลักฐาน)'))),
    statusSuffix: '(สถานะ)', evidenceSuffix: '(หลักฐาน)',
    classify: v => v === 'ดำเนินการแล้ว' ? 'done' : v === 'อยู่ระหว่างดำเนินการ' ? 'mid' : 'none'
  },
  {
    sheetKey: '2. จุดเน้นเขตพื้นที่',
    colFilter: (cols, k) => cols.filter(c =>
      /^\d+\.\d+(\.\d+)?\s+ข้อ/.test(c) &&
      (k ? c.startsWith(k + ' ข้อ') : true) &&
      (c.endsWith('(ผลการจัด)') || c.endsWith('(ระดับคะแนน 1-4)'))
    ),
    statusSuffix: '(ผลการจัด)', evidenceSuffix: '(แหล่งข้อมูล)',
    getStatusCols: (relevantCols) => relevantCols.filter(c =>
      c.endsWith('(ผลการจัด)') || c.endsWith('(ระดับคะแนน 1-4)')
    ),
    getEvidenceCol: (sCol) => sCol.endsWith('(ผลการจัด)')
      ? sCol.replace('(ผลการจัด)', '(แหล่งข้อมูล)')
      : sCol.replace('(ระดับคะแนน 1-4)', '(ร่องรอยหลักฐาน)'),
    classify: v => {
      const n = parseFloat(String(v))
      if (!isNaN(n) && n > 0) return n >= 3 ? 'done' : n >= 2 ? 'mid' : 'none'
      return v === 'มี' ? 'done' : 'none'
    }
  },
  {
    sheetKey: '3. การประกันภายใน',
    colFilter: (cols, k) => cols.filter(c => (k ? new RegExp(`องค์ประกอบที่\\s*${k}[\\s\\u0E02]`).test(c) : /องค์ประกอบที่/.test(c)) && (c.endsWith('(ระดับคุณภาพ 1-5)') || c.endsWith('(เอกสารอ้างอิง)'))),
    statusSuffix: '(ระดับคุณภาพ 1-5)', evidenceSuffix: '(เอกสารอ้างอิง)',
    classify: v => { const n = parseFloat(v) || 0; return n >= 4 ? 'done' : n >= 3 ? 'mid' : 'none' }
  },
  {
    sheetKey: '4. นโยบาย สพฐ.',
    colFilter: (cols, k) => cols.filter(c => /ประเด็นที่/.test(c) && (k ? new RegExp(`ประเด็นที่\\s*${k}\\s`).test(c) : true) && (c.endsWith('(สถานะ)') || c.endsWith('(หลักฐาน)'))),
    statusSuffix: '(สถานะ)', evidenceSuffix: '(หลักฐาน)',
    classify: v => v === 'ดำเนินการแล้ว' ? 'done' : v === 'อยู่ระหว่างดำเนินการ' ? 'mid' : 'none'
  }
]

// Quality level text for numeric scores
function scoreText(status: string): string {
  const n = parseFloat(status)
  if (isNaN(n)) return ''
  const map: Record<number, string> = { 5: 'ดีเยี่ยม', 4: 'ดีมาก', 3: 'ดี', 2: 'พอใช้', 1: 'ปรับปรุง' }
  return map[n] ? `${n} — ${map[n]}` : String(n)
}

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const si = parseInt(String(q.sheet || '0'))
  const groupKey = String(q.group || '')
  const district = String(q.district || '')
  const network = String(q.network || '')
  const schoolCode = String(q.schoolCode || '')
  const schoolSearch = String(q.school || '').toLowerCase()

  const cfg = CONFIGS[si]
  if (!cfg) return []

  const rows = await getSheetRows(cfg.sheetKey)
  if (!rows.length) return []

  const allCols = Object.keys(rows[0] || {})
  const relevantCols = cfg.colFilter(allCols, groupKey)
  const statusCols = cfg.getStatusCols
    ? cfg.getStatusCols(relevantCols)
    : relevantCols.filter(c => c.endsWith(cfg.statusSuffix))

  return rows
    .filter(row => {
      if (district && row['อำเภอ'] !== district) return false
      if (network && row['ศูนย์เครือข่าย'] !== network) return false
      if (schoolCode && String(row['DMC Code'] || '') !== schoolCode) return false
      if (!schoolCode && schoolSearch && !String(row['ชื่อโรงเรียน'] || '').toLowerCase().includes(schoolSearch)) return false
      return true
    })
    .map(row => ({
      code: String(row['DMC Code'] || ''),
      name: String(row['ชื่อโรงเรียน'] || ''),
      district: String(row['อำเภอ'] || ''),
      network: String(row['ศูนย์เครือข่าย'] || ''),
      items: statusCols.map(sCol => {
        const eCol = cfg.getEvidenceCol
          ? cfg.getEvidenceCol(sCol)
          : sCol.replace(cfg.statusSuffix, cfg.evidenceSuffix)
        const rawLabel = cfg.getEvidenceCol
          ? sCol.replace(/\s*\([^)]+\)$/, '')
          : sCol.replace(' ' + cfg.statusSuffix, '')
        const label = rawLabel.length > 70 ? rawLabel.slice(0, 70) + '…' : rawLabel
        const status = String(row[sCol] ?? '').trim()
        const evidence = String(row[eCol] ?? '').trim()
        const n = parseFloat(status)
        const displayStatus = !isNaN(n) && n > 0 ? scoreText(status) : status
        return { label, status, displayStatus, cat: cfg.classify(status), evidence }
      })
    }))
})
