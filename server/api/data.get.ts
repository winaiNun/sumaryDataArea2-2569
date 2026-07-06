import { getSheetRows } from '../utils/sheetsStore'

type Stat = [number, number, number] // [done, mid, none]
type Mean = [number, number]         // [sum, count]

function getColScale(col: string): 0 | 4 | 5 {
  if (col.endsWith('(ระดับคะแนน 1-4)')) return 4
  if (col.endsWith('(ระดับคุณภาพ 1-5)')) return 5
  return 0
}

const QUALITY_SCHOOL_GROUPS = new Set(['9.1'])
const HOME_SCHOOL_GROUPS = new Set(['9.6'])

interface Parser {
  sheetKey: string
  name: string
  getGroupKeys(cols: string[]): string[]
  groupLabel(k: string): string
  colsForGroup(cols: string[], k: string): string[]
  classify(v: string): 'done' | 'mid' | 'none' | null
}

const PARSERS: Parser[] = [
  {
    sheetKey: '1. ความพร้อมเปิดเรียน', name: 'ความพร้อมเปิดเรียน',
    getGroupKeys: cols => [...new Set(cols.filter(c => c.endsWith('(สถานะ)') && /^ข้อ\s*\d+/.test(c))
      .map(c => c.match(/^ข้อ\s*(\d+)/)?.[1]).filter(Boolean) as string[])].sort((a, b) => +a - +b),
    groupLabel: k => ({ '1': 'งานวิชาการ', '2': 'งานงบประมาณ', '3': 'งานบริหารงานบุคคล', '4': 'งานบริหารทั่วไป' } as Record<string,string>)[k] ?? `ข้อ ${k}`,
    colsForGroup: (cols, k) => cols.filter(c => c.endsWith('(สถานะ)') && new RegExp(`^ข้อ\\s*${k}\\.`).test(c)),
    classify: v => v === 'ดำเนินการแล้ว' ? 'done' : v === 'อยู่ระหว่างดำเนินการ' ? 'mid' : 'none'
  },
  {
    sheetKey: '2. จุดเน้นเขตพื้นที่', name: 'จุดเน้นเขตพื้นที่',
    getGroupKeys: cols => {
      const keys = [...new Set(
        cols.filter(c => /^\d+\.\d+(\.\d+)?\s+ข้อ/.test(c) &&
          (c.endsWith('(ผลการจัด)') || c.endsWith('(ระดับคะแนน 1-4)')))
          .map(c => c.match(/^(\d+\.\d+(?:\.\d+)?)/)?.[1]).filter(Boolean) as string[]
      )]
      return keys.sort((a, b) => {
        const ap = a.split('.').map(Number), bp = b.split('.').map(Number)
        for (let i = 0; i < Math.max(ap.length, bp.length); i++)
          if ((ap[i] || 0) !== (bp[i] || 0)) return (ap[i] || 0) - (bp[i] || 0)
        return 0
      })
    },
    groupLabel: k => ({ '2.1': 'การอ่าน การเขียน', '2.2': 'คิดเลขเป็น', '2.3.1': 'การดำเนินงานผู้สอน', '2.3.2': 'คุณลักษณะฯ' } as Record<string,string>)[k] ?? `กลุ่ม ${k}`,
    colsForGroup: (cols, k) => {
      const suffix = k.split('.').length === 3 ? '(ระดับคะแนน 1-4)' : '(ผลการจัด)'
      return cols.filter(c => c.startsWith(k + ' ข้อ') && c.endsWith(suffix))
    },
    classify: v => {
      const n = parseFloat(String(v))
      if (!isNaN(n) && n > 0) return n >= 3 ? 'done' : n >= 2 ? 'mid' : 'none'
      return v === 'มี' ? 'done' : 'none'
    }
  },
  {
    sheetKey: '3. การประกันภายใน', name: 'การประกันภายใน',
    getGroupKeys: cols => [...new Set(cols.filter(c => c.endsWith('(ระดับคุณภาพ 1-5)'))
      .map(c => c.match(/องค์ประกอบที่\s*(\d+)/)?.[1]).filter(Boolean) as string[])].sort((a, b) => +a - +b),
    groupLabel: k => `องค์ประกอบ ${k}`,
    colsForGroup: (cols, k) => cols.filter(c => c.endsWith('(ระดับคุณภาพ 1-5)') && new RegExp(`องค์ประกอบที่\\s*${k}[\\s\\u0E02]`).test(c)),
    classify: v => { const n = parseFloat(v) || 0; return n >= 4 ? 'done' : n >= 3 ? 'mid' : 'none' }
  },
  {
    sheetKey: '4. นโยบาย สพฐ.', name: 'นโยบาย สพฐ.',
    getGroupKeys: cols => [...new Set(
      cols.filter(c => c.endsWith('(สถานะ)') && /ประเด็นที่/.test(c))
        .map(c => c.match(/ประเด็นที่\s*(\d+(?:\.\d+)?)/)?.[1]).filter(Boolean) as string[]
    )].sort((a, b) => {
      const [a1, a2 = 0] = a.split('.').map(Number)
      const [b1, b2 = 0] = b.split('.').map(Number)
      return a1 !== b1 ? a1 - b1 : a2 - b2
    }),
    groupLabel: k => `ประเด็น ${k}`,
    colsForGroup: (cols, k) => cols.filter(c =>
      c.endsWith('(สถานะ)') && new RegExp(`ประเด็นที่\\s*${k.replace('.', '\\.')}(\\s|ข)`).test(c)
    ),
    classify: v => {
      if (!v.trim()) return null  // blank = N/A ไม่นับเข้าสถิติ
      return v === 'ดำเนินการแล้ว' ? 'done' : v === 'อยู่ระหว่างดำเนินการ' ? 'mid' : 'none'
    }
  }
]

export default defineEventHandler(async () => {
  // Fetch all 4 sheets in parallel (hits cache after first call)
  const allRows = await Promise.all(PARSERS.map(p => getSheetRows(p.sheetKey)))

  const sheetMaps = PARSERS.map((parser, pi) => {
    const rows = allRows[pi]
    if (!rows.length) return { map: new Map<string, { os: string, groups: Stat[] }>(), keys: [], labels: [] }
    const allCols = Object.keys(rows[0])
    const groupKeys = parser.getGroupKeys(allCols)
    const groupColsList = groupKeys.map(k => parser.colsForGroup(allCols, k))

    const map = new Map<string, { os: string, groups: Stat[], means: Mean[] }>()
    for (const row of rows) {
      const code = String(row['DMC Code'] || '')
      const groups: Stat[] = []
      const means: Mean[] = []
      groupColsList.forEach((cols, gi) => {
        const gKey = groupKeys[gi]
        if (pi === 3) {
          if (QUALITY_SCHOOL_GROUPS.has(gKey) && row['โรงเรียนคุณภาพ'] !== 'ใช่') { groups.push([0,0,0]); means.push([0,0]); return }
          if (HOME_SCHOOL_GROUPS.has(gKey) && row['Home School'] !== 'ใช่') { groups.push([0,0,0]); means.push([0,0]); return }
        }
        let d = 0, m = 0, n = 0, sum = 0, cnt = 0
        for (const col of cols) {
          const raw = String(row[col] ?? '').trim()
          const cat = parser.classify(raw)
          if (cat === null) continue
          if (cat === 'done') d++; else if (cat === 'mid') m++; else n++
          const scale = getColScale(col)
          if (scale > 0) { const nv = parseFloat(raw); if (!isNaN(nv) && nv > 0) { sum += nv; cnt++ } }
        }
        groups.push([d, m, n])
        means.push([sum, cnt])
      })
      map.set(code, { os: String(row['สถานะการประเมิน'] || ''), groups, means })
    }
    const scales = groupColsList.map(cols => cols.map(c => getColScale(c)).find(s => s > 0) ?? 0)
    return { map, keys: groupKeys, labels: groupKeys.map(k => parser.groupLabel(k)), scales }
  })

  // Master school list from sheet 4 (already fetched, reuse from allRows)
  const masterRows = allRows[3]

  const schools = masterRows.map(row => {
    const code = String(row['DMC Code'] || '')
    return {
      code,
      name: String(row['ชื่อโรงเรียน'] || ''),
      district: String(row['อำเภอ'] || ''),
      network: String(row['ศูนย์เครือข่าย'] || ''),
      os: sheetMaps.map(s => s.map.get(code)?.os || ''),
      g: sheetMaps.map(s => s.map.get(code)?.groups || []),
      means: sheetMaps.map(s => s.map.get(code)?.means || [])
    }
  })

  const districts = [...new Set(schools.map(s => s.district).filter(Boolean))].sort()
  const networks = [...new Set(schools.map(s => s.network).filter(Boolean))].sort()

  return {
    sheetNames: PARSERS.map(p => p.name),
    groupLabels: sheetMaps.map(s => s.labels),
    groupKeys: sheetMaps.map(s => s.keys),
    groupScales: sheetMaps.map(s => s.scales),
    districts,
    networks,
    schools
  }
})
