import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
const XLSX = createRequire(import.meta.url)('xlsx')
const wb = XLSX.read(readFileSync(resolve('public','001.xlsx')), { type: 'buffer' })

wb.SheetNames.slice(0, 3).forEach(name => {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '' })
  if (!rows.length) return
  const cols = Object.keys(rows[0])
  console.log(`\n=== ${name} (${cols.length} cols) ===`)
  cols.slice(0, 30).forEach(c => console.log(' ', JSON.stringify(c)))
})
