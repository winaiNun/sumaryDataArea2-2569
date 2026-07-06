import { getSheetRows } from '../utils/sheetsStore'

function getColScale(col: string): 0 | 4 | 5 {
  if (col.endsWith('(ระดับคะแนน 1-4)')) return 4
  if (col.endsWith('(ระดับคุณภาพ 1-5)')) return 5
  return 0
}

export function qualityLabel(mean: number, scale: 0 | 4 | 5): string {
  if (scale === 5) {
    if (mean >= 4.5) return 'ดีเยี่ยม'
    if (mean >= 3.5) return 'ดีมาก'
    if (mean >= 2.5) return 'ดี'
    if (mean >= 1.5) return 'พอใช้'
    return 'ปรับปรุง'
  }
  if (scale === 4) {
    if (mean >= 3.5) return 'ดีเยี่ยม'
    if (mean >= 2.5) return 'ดี'
    if (mean >= 1.5) return 'พอใช้'
    return 'ปรับปรุง'
  }
  return ''
}

const SHEET_CFG = [
  {
    sheetKey: '1. ความพร้อมเปิดเรียน',
    getStatusCols: (cols: string[], gKey: string) =>
      cols.filter(c => c.endsWith('(สถานะ)') && (gKey ? new RegExp(`^ข้อ\\s*${gKey}\\.`).test(c) : /^ข้อ\s*\d+/.test(c))),
    classify: (v: string) => v === 'ดำเนินการแล้ว' ? 'done' : v === 'อยู่ระหว่างดำเนินการ' ? 'mid' : v ? 'none' : null
  },
  {
    sheetKey: '2. จุดเน้นเขตพื้นที่',
    getStatusCols: (cols: string[], gKey: string) =>
      cols.filter(c => (gKey ? c.startsWith(gKey + ' ข้อ') : /^\d+\.\d+(\.\d+)?\s+ข้อ/.test(c)) &&
        (c.endsWith('(ผลการจัด)') || c.endsWith('(ระดับคะแนน 1-4)'))),
    classify: (v: string) => {
      const n = parseFloat(v); if (!isNaN(n) && n > 0) return n >= 3 ? 'done' : n >= 2 ? 'mid' : 'none'
      return v === 'มี' ? 'done' : v ? 'none' : null
    }
  },
  {
    sheetKey: '3. การประกันภายใน',
    getStatusCols: (cols: string[], gKey: string) =>
      cols.filter(c => c.endsWith('(ระดับคุณภาพ 1-5)') &&
        (gKey ? new RegExp(`องค์ประกอบที่\\s*${gKey}[\\s\\u0E02]`).test(c) : /องค์ประกอบที่/.test(c))),
    classify: (v: string) => { const n = parseFloat(v) || 0; return n > 0 ? (n >= 4 ? 'done' : n >= 3 ? 'mid' : 'none') : null }
  },
  {
    sheetKey: '4. นโยบาย สพฐ.',
    getStatusCols: (cols: string[], gKey: string) =>
      cols.filter(c => c.endsWith('(สถานะ)') && /ประเด็นที่/.test(c) &&
        (gKey ? new RegExp(`ประเด็นที่\\s*${gKey.replace('.', '\\.')}(\\s|ข)`).test(c) : true)),
    classify: (v: string) => v === 'ดำเนินการแล้ว' ? 'done' : v === 'อยู่ระหว่างดำเนินการ' ? 'mid' : v ? 'none' : null
  }
] as const

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const si = parseInt(String(q.sheet ?? '0'))
  const gKey = String(q.group ?? '')
  const district = String(q.district ?? '')
  const network = String(q.network ?? '')
  const schoolCode = String(q.schoolCode ?? '')

  const cfg = SHEET_CFG[si]
  if (!cfg) return []

  const rows = await getSheetRows(cfg.sheetKey)
  if (!rows.length) return []

  const filtered = rows.filter(row => {
    if (district && row['อำเภอ'] !== district) return false
    if (network && row['ศูนย์เครือข่าย'] !== network) return false
    if (schoolCode && String(row['DMC Code'] ?? '') !== schoolCode) return false
    return true
  })

  const allCols = Object.keys(rows[0] || {})
  const statusCols = cfg.getStatusCols(allCols, gKey)

  return statusCols.map(col => {
    const scale = getColScale(col)
    let done = 0, mid = 0, none = 0, sum = 0, cnt = 0

    for (const row of filtered) {
      const v = String(row[col] ?? '').trim()
      const cat = (cfg.classify as (v: string) => string | null)(v)
      if (cat === null) continue
      if (cat === 'done') done++
      else if (cat === 'mid') mid++
      else none++
      if (scale > 0) { const n = parseFloat(v); if (!isNaN(n) && n > 0) { sum += n; cnt++ } }
    }

    const total = done + mid + none
    const mean = cnt > 0 ? +(sum / cnt).toFixed(2) : null
    const rawLabel = col.replace(/\s*\([^)]+\)$/, '')
    return {
      label: rawLabel.length > 80 ? rawLabel.slice(0, 80) + '…' : rawLabel,
      col,
      scale,
      total,
      done, mid, none,
      donePct: total > 0 ? +(done / total * 100).toFixed(2) : 0,
      midPct:  total > 0 ? +(mid  / total * 100).toFixed(2) : 0,
      mean,
      qualityLabel: mean !== null ? qualityLabel(mean, scale) : ''
    }
  })
})
