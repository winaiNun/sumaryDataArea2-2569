import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import XLSX from 'xlsx'

const publicPath = resolve(process.cwd(), 'public', '001.xlsx')
const legacyPath = resolve(process.cwd(), '001.xlsx')
const filePath = existsSync(publicPath) ? publicPath : legacyPath
console.log('filePath', filePath)
if (!existsSync(filePath)) {
  throw new Error('ไม่พบไฟล์ Excel 001.xlsx')
}
const workbookData = readFileSync(filePath)
const workbook = XLSX.read(workbookData, { type: 'buffer' })
const sheetName = workbook.SheetNames.includes('4. นโยบาย สพฐ.') ? '4. นโยบาย สพฐ.' : workbook.SheetNames[0]
console.log('sheetName', sheetName)
const sheet = workbook.Sheets[sheetName]
const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
console.log('rows', rows.length)
console.log(rows[0])
