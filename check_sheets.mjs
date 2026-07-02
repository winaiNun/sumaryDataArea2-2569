import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
const XLSX = createRequire(import.meta.url)('xlsx')
const wb = XLSX.read(readFileSync(resolve('public','001.xlsx')), { type: 'buffer' })
wb.SheetNames.forEach(name => {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '' })
  if (!rows.length) return
  const cols = Object.keys(rows[0])
  const statusCols = cols.filter(c => c.endsWith('(สถานะ)'))
  const nums = [...new Set(statusCols.map(c => { const m = c.match(/ประเด็นที่\s*(\d+)/); return m ? m[1] : null }).filter(Boolean))].sort((a,b)=>+a-+b)
  console.log(`${name} | rows:${rows.length} | ประเด็น:[${nums.join(',')}] | status_cols:${statusCols.length}`)
})
