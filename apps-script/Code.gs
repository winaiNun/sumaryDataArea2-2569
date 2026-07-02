// ============================================================
// Google Apps Script — Web App สำหรับ Nuxt Dashboard
// วิธีใช้:
//   1. เปิด Google Sheets ที่มีข้อมูล 4 sheets
//   2. Extensions → Apps Script → วางโค้ดนี้ลงในไฟล์ Code.gs
//   3. Deploy → New deployment → Web app
//      - Execute as: Me
//      - Who has access: Anyone
//   4. Copy URL ที่ลงท้ายด้วย /exec → ใส่ใน .env เป็น APPS_SCRIPT_URL=...
// ============================================================

const SHEET_NAMES = [
  '1. ความพร้อมเปิดเรียน',
  '2. จุดเน้นเขตพื้นที่',
  '3. การประกันภายใน',
  '4. นโยบาย สพฐ.'
]

// GET — ดึงข้อมูลทั้งหมด
function doGet(e) {
  try {
    const data = getAllSheetsData()
    return ok(data)
  } catch (err) {
    return fail(err.message)
  }
}

// POST — อัปเดตข้อมูลโรงเรียน / กำหนดธงโรงเรียน
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents)
    if (body.action === 'updateSchool') {
      updateSchool(body.code, body.updates)
    } else if (body.action === 'setSchoolFlags') {
      setSchoolFlags(body.flags)
    }
    return ok({ updated: true })
  } catch (err) {
    return fail(err.message)
  }
}

// ── Helpers ──────────────────────────────────────────────────

function ok(data) {
  return res({ ok: true, data: data })
}

function fail(msg) {
  return res({ ok: false, error: msg })
}

function res(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
}

// ── Data readers ─────────────────────────────────────────────

function getAllSheetsData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var result = {}
  for (var i = 0; i < SHEET_NAMES.length; i++) {
    var name = SHEET_NAMES[i]
    var sheet = ss.getSheetByName(name)
    if (!sheet) continue
    result[name] = sheetToRows(sheet)
  }
  return result
}

function sheetToRows(sheet) {
  var values = sheet.getDataRange().getValues()
  if (!values.length) return []
  var headers = values[0]
  var rows = []
  for (var i = 1; i < values.length; i++) {
    var row = values[i]
    var obj = {}
    for (var j = 0; j < headers.length; j++) {
      var h = headers[j]
      if (h !== '') obj[String(h)] = row[j] !== undefined ? row[j] : ''
    }
    rows.push(obj)
  }
  return rows
}

// ── Update ────────────────────────────────────────────────────

function setSchoolFlags(flags) {
  // flags: [{code, qualitySchool, homeSchool}, ...]
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sheet = ss.getSheetByName('4. นโยบาย สพฐ.')
  if (!sheet) throw new Error('ไม่พบ sheet 4')
  var values = sheet.getDataRange().getValues()
  var headers = values[0]
  var codeIdx = headers.indexOf('DMC Code')
  if (codeIdx < 0) throw new Error('ไม่พบคอลัมน์ DMC Code')

  // สร้างคอลัมน์อัตโนมัติถ้ายังไม่มี (เพิ่มท้าย)
  var qIdx = headers.indexOf('โรงเรียนคุณภาพ')
  if (qIdx < 0) {
    qIdx = headers.length
    sheet.getRange(1, qIdx + 1).setValue('โรงเรียนคุณภาพ')
    headers.push('โรงเรียนคุณภาพ')
  }
  var hsIdx = headers.indexOf('Home School')
  if (hsIdx < 0) {
    hsIdx = headers.length
    sheet.getRange(1, hsIdx + 1).setValue('Home School')
    headers.push('Home School')
  }

  var flagMap = {}
  for (var i = 0; i < flags.length; i++) flagMap[flags[i].code] = flags[i]
  for (var r = 1; r < values.length; r++) {
    var code = String(values[r][codeIdx])
    if (flagMap[code]) {
      sheet.getRange(r + 1, qIdx + 1).setValue(flagMap[code].qualitySchool)
      sheet.getRange(r + 1, hsIdx + 1).setValue(flagMap[code].homeSchool)
    }
  }
}

function updateSchool(code, updates) {
  // updates: [{sheetName, col, value}, ...]
  var ss = SpreadsheetApp.getActiveSpreadsheet()

  // Group updates by sheet
  var bySheet = {}
  for (var i = 0; i < updates.length; i++) {
    var u = updates[i]
    if (!bySheet[u.sheetName]) bySheet[u.sheetName] = []
    bySheet[u.sheetName].push({ col: u.col, value: u.value })
  }

  var sheetNames = Object.keys(bySheet)
  for (var si = 0; si < sheetNames.length; si++) {
    var sheetName = sheetNames[si]
    var sheet = ss.getSheetByName(sheetName)
    if (!sheet) continue

    var values = sheet.getDataRange().getValues()
    var headers = values[0]
    var codeIdx = headers.indexOf('DMC Code')
    if (codeIdx < 0) continue

    // Find row with matching code
    var rowIdx = -1
    for (var ri = 1; ri < values.length; ri++) {
      if (String(values[ri][codeIdx]) === String(code)) {
        rowIdx = ri + 1  // 1-indexed for getRange
        break
      }
    }
    if (rowIdx < 0) continue

    // Apply updates
    var sheetUpdates = bySheet[sheetName]
    for (var ui = 0; ui < sheetUpdates.length; ui++) {
      var colIdx = headers.indexOf(sheetUpdates[ui].col)
      if (colIdx >= 0) {
        sheet.getRange(rowIdx, colIdx + 1).setValue(sheetUpdates[ui].value)
      }
    }
  }
}
