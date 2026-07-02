import XLSX from 'xlsx'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const filePath = resolve(process.cwd(), 'public', '001.xlsx')
console.log('file', filePath)
const data = readFileSync(filePath)
const wb = XLSX.read(data, { type: 'buffer' })
console.log('sheetNames', wb.SheetNames)
