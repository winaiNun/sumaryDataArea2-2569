import { getSheetRows } from '../utils/sheetsStore'

type Group = { label: string; done: number; middle: number; notDone: number; total: number }

const QUALITY_SCHOOL_GROUPS = new Set(['9.1'])
const HOME_SCHOOL_GROUPS = new Set(['9.6'])

function calcStatus3(rows: any[], cols: string[], skipBlanks = false, rowFilter?: (r: any) => boolean): Omit<Group, 'label'> {
  const filtered = rowFilter ? rows.filter(rowFilter) : rows
  let done = 0, middle = 0, notDone = 0, total = 0
  for (const row of filtered) {
    for (const col of cols) {
      const v = String(row[col] ?? '').trim()
      if (skipBlanks && !v) continue
      total++
      if (v === 'ดำเนินการแล้ว') done++
      else if (v === 'อยู่ระหว่างดำเนินการ') middle++
      else notDone++
    }
  }
  return { done, middle, notDone, total }
}

function calcBinary(rows: any[], cols: string[]): Omit<Group, 'label'> {
  let done = 0, notDone = 0
  const total = rows.length * cols.length
  for (const row of rows) {
    for (const col of cols) {
      const v = String(row[col] ?? '').trim()
      if (v === 'มี') done++
      else notDone++
    }
  }
  return { done, middle: 0, notDone, total }
}

function calcScore5(rows: any[], cols: string[]): Omit<Group, 'label'> {
  let done = 0, middle = 0, notDone = 0
  const total = rows.length * cols.length
  for (const row of rows) {
    for (const col of cols) {
      const v = parseFloat(String(row[col] ?? '0')) || 0
      if (v >= 4) done++
      else if (v >= 3) middle++
      else notDone++
    }
  }
  return { done, middle, notDone, total }
}

function groupBy<K>(items: string[], keyFn: (s: string) => K | null): Map<K, string[]> {
  const map = new Map<K, string[]>()
  for (const item of items) {
    const k = keyFn(item)
    if (k === null) continue
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(item)
  }
  return map
}

function getSheet1Groups(rows: any[]): Group[] {
  const cols = Object.keys(rows[0] ?? {}).filter(c => c.endsWith('(สถานะ)') && /^ข้อ\s*\d+/.test(c))
  const map = groupBy(cols, c => { const m = c.match(/^ข้อ\s*(\d+)/); return m ? parseInt(m[1]) : null })
  return Array.from(map.entries()).sort(([a], [b]) => a - b).map(([n, cs]) => ({
    label: ({ 1: 'งานวิชาการ', 2: 'งานงบประมาณ', 3: 'งานบริหารงานบุคคล', 4: 'งานบริหารทั่วไป' } as Record<number,string>)[n] ?? `ข้อ ${n}`,
    ...calcStatus3(rows, cs)
  }))
}

function getSheet2Groups(rows: any[]): Group[] {
  const cols = Object.keys(rows[0] ?? {}).filter(c => /^\d+\.\d+\s+ข้อ/.test(c) && c.endsWith('(ผลการจัด)'))
  const map = groupBy(cols, c => { const m = c.match(/^(\d+\.\d+)/); return m ? m[1] : null })
  return Array.from(map.entries()).sort().map(([key, cs]) => ({
    label: ({ '2.1': 'การอ่าน การเขียน', '2.2': 'คิดเลขเป็น', '2.3.1': 'การดำเนินงานผู้สอน', '2.3.2': 'คุณลักษณะฯ' } as Record<string,string>)[key] ?? `กลุ่ม ${key}`,
    ...calcBinary(rows, cs)
  }))
}

function getSheet3Groups(rows: any[]): Group[] {
  const cols = Object.keys(rows[0] ?? {}).filter(c => c.endsWith('(ระดับคุณภาพ 1-5)'))
  const map = groupBy(cols, c => { const m = c.match(/องค์ประกอบที่\s*(\d+)/); return m ? parseInt(m[1]) : null })
  return Array.from(map.entries()).sort(([a], [b]) => a - b).map(([n, cs]) => ({
    label: `องค์ประกอบ ${n}`,
    ...calcScore5(rows, cs)
  }))
}

function getSheet4Groups(rows: any[]): Group[] {
  const cols = Object.keys(rows[0] ?? {}).filter(c => c.endsWith('(สถานะ)') && /ประเด็นที่/.test(c))
  const map = groupBy(cols, c => { const m = c.match(/ประเด็นที่\s*(\d+(?:\.\d+)?)/); return m ? m[1] : null })
  return Array.from(map.entries())
    .sort(([a], [b]) => {
      const [a1, a2 = 0] = a.split('.').map(Number)
      const [b1, b2 = 0] = b.split('.').map(Number)
      return a1 !== b1 ? a1 - b1 : a2 - b2
    })
    .map(([n, cs]) => {
      const rowFilter = QUALITY_SCHOOL_GROUPS.has(n)
        ? (r: any) => r['โรงเรียนคุณภาพ'] === 'ใช่'
        : HOME_SCHOOL_GROUPS.has(n)
        ? (r: any) => r['Home School'] === 'ใช่'
        : undefined
      return { label: `ประเด็น ${n}`, ...calcStatus3(rows, cs, true, rowFilter) }
    })
}

const SHEET_CONFIG = [
  { key: '1. ความพร้อมเปิดเรียน', name: 'ความพร้อมเปิดเรียน', getGroups: getSheet1Groups },
  { key: '2. จุดเน้นเขตพื้นที่', name: 'จุดเน้นเขตพื้นที่', getGroups: getSheet2Groups },
  { key: '3. การประกันภายใน', name: 'การประกันภายใน', getGroups: getSheet3Groups },
  { key: '4. นโยบาย สพฐ.', name: 'นโยบาย สพฐ.', getGroups: getSheet4Groups }
]

export default defineEventHandler(async () => {
  const allRows = await Promise.all(SHEET_CONFIG.map(({ key }) => getSheetRows(key)))

  return SHEET_CONFIG.map(({ name, getGroups }, i) => {
    const rows = allRows[i]
    if (!rows.length) return { name, totalSchools: 0, overallDone: 0, groups: [] }

    const overallDone = rows.filter(r => r['สถานะการประเมิน'] === 'เสร็จสมบูรณ์').length
    const groups = getGroups(rows)

    return { name, totalSchools: rows.length, overallDone, groups }
  })
})
