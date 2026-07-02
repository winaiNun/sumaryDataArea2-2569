import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
const XLSX = createRequire(import.meta.url)('xlsx')
const wb = XLSX.read(readFileSync(resolve('public','001.xlsx')), { type: 'buffer' })

// Sheet 1 - check column pattern and distinct values
const s1 = XLSX.utils.sheet_to_json(wb.Sheets['1. ความพร้อมเปิดเรียน'], { defval: '' })
const s1Cols = Object.keys(s1[0]).filter(c => c.endsWith('(สถานะ)'))
const s1Groups = [...new Set(s1Cols.map(c => { const m = c.match(/ข้อ\s*(\d+)/); return m?.[1] }).filter(Boolean))]
console.log('Sheet1 status col sample:', s1Cols[0])
console.log('Sheet1 ข้อ groups:', s1Groups.sort((a,b)=>+a-+b).join(','))
const s1Vals = new Set(s1.flatMap(r => s1Cols.map(c => r[c])))
console.log('Sheet1 values:', [...s1Vals].filter(Boolean).join(' | '))

// Sheet 2
const s2 = XLSX.utils.sheet_to_json(wb.Sheets['2. จุดเน้นเขตพื้นที่'], { defval: '' })
const s2Cols = Object.keys(s2[0]).filter(c => c.includes('ผลการจัด') || c.includes('สถานะ'))
console.log('\nSheet2 col sample:', s2Cols.slice(0,2).join('\n'))
const s2Vals = new Set(s2.flatMap(r => s2Cols.map(c => r[c])))
console.log('Sheet2 values:', [...s2Vals].filter(Boolean).slice(0,10).join(' | '))

// group pattern for sheet2 - X.Y ข้อ N
const s2AllCols = Object.keys(s2[0])
const s2GroupCols = s2AllCols.filter(c => /^\d+\.\d+\s+ข้อ/.test(c))
const s2GroupNums = [...new Set(s2GroupCols.map(c => { const m = c.match(/^(\d+\.\d+)/); return m?.[1] }))]
console.log('Sheet2 groups:', s2GroupNums.join(','))
console.log('Sheet2 group col sample:', s2GroupCols.slice(0,2).join('\n'))

// Sheet 3
const s3 = XLSX.utils.sheet_to_json(wb.Sheets['3. การประกันภายใน'], { defval: '' })
const s3Cols = Object.keys(s3[0]).filter(c => c.includes('ระดับคุณภาพ'))
console.log('\nSheet3 col sample:', s3Cols[0])
const s3Vals = new Set(s3.flatMap(r => s3Cols.map(c => r[c])))
console.log('Sheet3 values:', [...s3Vals].filter(v => v !== '').slice(0,10).join(' | '))
const s3Groups = [...new Set(s3Cols.map(c => { const m = c.match(/องค์ประกอบที่\s*(\d+)/); return m?.[1] }))]
console.log('Sheet3 องค์ประกอบ groups:', s3Groups.sort((a,b)=>+a-+b).join(','))
