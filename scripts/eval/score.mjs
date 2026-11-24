import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const SLOTS = ['breakfast', 'lunch', 'dinner']

function parseArgs(argv) {
  let suffix = null
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--suffix') {
      suffix = argv[++index]
      if (!suffix || !/^[A-Za-z0-9._-]+$/.test(suffix) || suffix === '.' || suffix === '..') {
        throw new Error('Provide a valid --suffix <name>.')
      }
    } else {
      throw new Error('Usage: node scripts/eval/score.mjs [--suffix <name>]')
    }
  }
  return suffix
}

function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  const content = text.replace(/^\uFEFF/, '')
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    if (quoted) {
      if (char === '"' && content[index + 1] === '"') {
        cell += '"'
        index += 1
      } else if (char === '"') {
        quoted = false
      } else {
        cell += char
      }
    } else if (char === '"' && cell.length === 0) {
      quoted = true
    } else if (char === ',') {
      row.push(cell)
      cell = ''
    } else if (char === '\r' || char === '\n') {
      if (char === '\r' && content[index + 1] === '\n') index += 1
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }
  if (quoted) throw new Error('Malformed CSV: unterminated quoted field.')
  if (cell.length || row.length) {
    row.push(cell)
    rows.push(row)
  }
  if (!rows.length) return []
  const headers = rows[0]
  return rows.slice(1).map((values, index) => {
    if (values.length !== headers.length) throw new Error(`Malformed CSV row ${index + 2}: column count does not match header.`)
    return Object.fromEntries(headers.map((header, i) => [header, values[i]]))
  })
}

function rate(rows, column) {
  const rated = rows.filter((row) => ['Y', 'N'].includes((row[column] || '').trim().toUpperCase()))
  const yes = rated.filter((row) => row[column].trim().toUpperCase() === 'Y').length
  return `${yes}/${rated.length} (${rated.length ? (yes / rated.length * 100).toFixed(1) : '0.0'}%)`
}

async function main() {
  let suffix
  try {
    suffix = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
    return
  }
  const ratingSheet = suffix ? `rating-sheet-${suffix}.csv` : 'rating-sheet.csv'
  const keySheet = suffix ? `key-${suffix}.csv` : 'key.csv'
  const [sheetText, keyText] = await Promise.all([
    fs.readFile(path.join(SCRIPT_DIR, ratingSheet), 'utf8'),
    fs.readFile(path.join(SCRIPT_DIR, keySheet), 'utf8'),
  ])
  const ratings = parseCsv(sheetText)
  const keys = parseCsv(keyText)
  const versionByCode = new Map(keys.map((row) => [row.plan_code, row.version]))
  const grouped = new Map()
  let skipped = 0

  for (const rating of ratings) {
    const cookIt = (rating.cook_it || '').trim().toUpperCase()
    if (!cookIt) {
      skipped += 1
      continue
    }
    const version = versionByCode.get(rating.plan_code)
    if (!version) throw new Error(`No key.csv mapping for plan code ${rating.plan_code}.`)
    if (!grouped.has(version)) grouped.set(version, [])
    grouped.get(version).push(rating)
  }

  console.log(`Skipped ${skipped} row(s) with blank cook_it.`)
  for (const [version, rows] of grouped) {
    console.log(`\n${version}`)
    console.log(`Total meals rated: ${rows.length}`)
    console.log(`Cook-it rate overall: ${rate(rows, 'cook_it')}`)
    for (const slot of SLOTS) {
      console.log(`Cook-it rate ${slot}: ${rate(rows.filter((row) => row.slot.trim().toLowerCase() === slot), 'cook_it')}`)
    }
    console.log(`Screenshot-it rate overall: ${rate(rows, 'screenshot_it')}`)
    const reasons = new Map()
    for (const row of rows) {
      const reason = (row.why_not || '').trim()
      if (reason) reasons.set(reason, (reasons.get(reason) || 0) + 1)
    }
    const topReasons = [...reasons.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5)
    console.log('Top why_not values:')
    if (topReasons.length) {
      for (const [reason, count] of topReasons) console.log(`  ${count}: ${reason}`)
    } else {
      console.log('  none')
    }
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
