import { getSheetRows } from '../utils/sheetsStore'

type CfgItem = {
  sheetKey: string; name: string
  filterStatus: (c: string) => boolean
  groupKey: (c: string) => string
  groupLabel: (k: string) => string
  statusSuffix: string; evidenceSuffix: string
  evidenceLabel: string
  statusOptions: string[]
  getEvidenceCol?: (sCol: string) => string
  getItemStatusOptions?: (sCol: string) => string[]
}

const CONFIGS: CfgItem[] = [
  {
    sheetKey: '1. ความพร้อมเปิดเรียน', name: 'ความพร้อมเปิดเรียน',
    filterStatus: c => c.endsWith('(สถานะ)') && /^ข้อ\s*\d+/.test(c),
    groupKey:    c => c.match(/^ข้อ\s*(\d+)/)?.[1] || '',
    groupLabel:  k => `ข้อ ${k}`,
    statusSuffix: '(สถานะ)', evidenceSuffix: '(หลักฐาน)',
    evidenceLabel: 'หลักฐาน',
    statusOptions: ['ดำเนินการแล้ว', 'อยู่ระหว่างดำเนินการ', 'ยังไม่ดำเนินการ']
  },
  {
    sheetKey: '2. จุดเน้นเขตพื้นที่', name: 'จุดเน้นเขตพื้นที่',
    filterStatus: c => /^\d+\.\d+(\.\d+)?\s+ข้อ/.test(c) &&
      (c.endsWith('(ผลการจัด)') || c.endsWith('(ระดับคะแนน 1-4)')),
    groupKey:    c => c.match(/^(\d+\.\d+(?:\.\d+)?)/)?.[1] || '',
    groupLabel:  k => `กลุ่ม ${k}`,
    statusSuffix: '(ผลการจัด)', evidenceSuffix: '(แหล่งข้อมูล)',
    evidenceLabel: 'หลักฐาน/ร่องรอย',
    statusOptions: ['มี', 'ไม่มี', '-'],
    getEvidenceCol: sCol => sCol.endsWith('(ผลการจัด)')
      ? sCol.replace('(ผลการจัด)', '(แหล่งข้อมูล)')
      : sCol.replace('(ระดับคะแนน 1-4)', '(ร่องรอยหลักฐาน)'),
    getItemStatusOptions: sCol => sCol.endsWith('(ระดับคะแนน 1-4)')
      ? ['4', '3', '2', '1', '-']
      : ['มี', 'ไม่มี', '-']
  },
  {
    sheetKey: '3. การประกันภายใน', name: 'การประกันภายใน',
    filterStatus: c => c.endsWith('(ระดับคุณภาพ 1-5)'),
    groupKey:    c => c.match(/องค์ประกอบที่\s*(\d+)/)?.[1] || '',
    groupLabel:  k => `องค์ประกอบ ${k}`,
    statusSuffix: '(ระดับคุณภาพ 1-5)', evidenceSuffix: '(เอกสารอ้างอิง)',
    evidenceLabel: 'เอกสารอ้างอิง',
    statusOptions: ['5', '4', '3', '2', '1', '-']
  },
  {
    sheetKey: '4. นโยบาย สพฐ.', name: 'นโยบาย สพฐ.',
    filterStatus: c => c.endsWith('(สถานะ)') && /ประเด็นที่/.test(c),
    groupKey:    c => c.match(/ประเด็นที่\s*(\d+)/)?.[1] || '',
    groupLabel:  k => `ประเด็น ${k}`,
    statusSuffix: '(สถานะ)', evidenceSuffix: '(หลักฐาน)',
    evidenceLabel: 'หลักฐาน',
    statusOptions: ['ดำเนินการแล้ว', 'อยู่ระหว่างดำเนินการ', 'ยังไม่ดำเนินการ']
  }
]

export default defineEventHandler(async (event) => {
  const { code } = getQuery(event)
  if (!code) throw createError({ statusCode: 400, statusMessage: 'ต้องระบุรหัสโรงเรียน' })

  const allRows = await Promise.all(CONFIGS.map(cfg => getSheetRows(cfg.sheetKey)))

  const sheets = CONFIGS.map((cfg, ci) => {
    const rows = allRows[ci]
    const row = rows.find(r => String(r['DMC Code'] ?? '') === String(code))
    if (!row) return { name: cfg.name, statusOptions: cfg.statusOptions, evidenceLabel: cfg.evidenceLabel, groups: [] }

    const allCols = Object.keys(rows[0] || {})
    const statusCols = allCols.filter(cfg.filterStatus)

    const groupMap = new Map<string, Array<{
      statusCol: string; evidenceCol: string; label: string
      status: string; evidence: string; statusOptions: string[]
    }>>()

    for (const sCol of statusCols) {
      const gk = cfg.groupKey(sCol)
      if (!gk) continue
      const eCol = cfg.getEvidenceCol
        ? cfg.getEvidenceCol(sCol)
        : sCol.replace(cfg.statusSuffix, cfg.evidenceSuffix)
      const label = sCol.replace(/\s*\([^)]+\)$/, '')
      const itemOpts = cfg.getItemStatusOptions
        ? cfg.getItemStatusOptions(sCol)
        : cfg.statusOptions

      if (!groupMap.has(gk)) groupMap.set(gk, [])
      groupMap.get(gk)!.push({
        statusCol: sCol, evidenceCol: eCol, label,
        status: String(row[sCol] ?? '').trim(),
        evidence: String(row[eCol] ?? '').trim(),
        statusOptions: itemOpts
      })
    }

    const groups = Array.from(groupMap.entries())
      .sort(([a], [b]) => isNaN(+a) ? a.localeCompare(b) : +a - +b)
      .map(([key, items]) => ({ key, label: cfg.groupLabel(key), items }))

    return { name: cfg.name, statusOptions: cfg.statusOptions, evidenceLabel: cfg.evidenceLabel, groups }
  })

  const masterRows = allRows[3]
  const meta = masterRows.find(r => String(r['DMC Code'] ?? '') === String(code)) || {}

  return {
    code: String(code),
    name: String(meta['ชื่อโรงเรียน'] || ''),
    district: String(meta['อำเภอ'] || ''),
    network: String(meta['ศูนย์เครือข่าย'] || ''),
    sheets
  }
})
