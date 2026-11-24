import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const SLOT_NAMES = ['Breakfast', 'Lunch', 'Dinner']

function parseArgs(argv) {
  if (argv.length < 2 || argv[0] !== '--versions') {
    throw new Error('Usage: node scripts/eval/build-sheet.mjs --versions baseline,v2 [--suffix <name>]')
  }
  const versions = argv[1].split(',').filter(Boolean)
  if (!versions.length || versions.some((version) => !/^[A-Za-z0-9._-]+$/.test(version) || version === '.' || version === '..')) {
    throw new Error('Provide one or more valid comma-separated version names.')
  }
  let suffix = null
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === '--suffix') {
      suffix = argv[++index]
      if (!suffix || !/^[A-Za-z0-9._-]+$/.test(suffix) || suffix === '.' || suffix === '..') {
        throw new Error('Provide a valid --suffix <name>.')
      }
    } else {
      throw new Error('Usage: node scripts/eval/build-sheet.mjs --versions baseline,v2 [--suffix <name>]')
    }
  }
  return { versions: [...new Set(versions)], suffix }
}

function csvCell(value) {
  const text = String(value ?? '')
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function csv(rows) {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1))
    ;[items[index], items[other]] = [items[other], items[index]]
  }
  return items
}

async function main() {
  const { versions, suffix } = parseArgs(process.argv.slice(2))
  const receipts = JSON.parse(await fs.readFile(path.join(SCRIPT_DIR, 'receipts.json'), 'utf8'))
  const pairs = []

  for (const version of versions) {
    const versionDir = path.join(SCRIPT_DIR, 'out', version)
    let files
    try {
      files = await fs.readdir(versionDir)
    } catch (error) {
      if (error.code === 'ENOENT') throw new Error(`No output directory found for version "${version}".`)
      throw error
    }
    for (const file of files.filter((name) => name.endsWith('.json')).sort()) {
      const receiptId = path.basename(file, '.json')
      const receipt = receipts.find((item) => item.id === receiptId)
      if (!receipt) continue
      const plan = JSON.parse(await fs.readFile(path.join(versionDir, file), 'utf8'))
      if (!Array.isArray(plan.days)) throw new Error(`Invalid plan JSON: ${path.join(versionDir, file)}`)
      for (const day of plan.days) {
        for (const slot of SLOT_NAMES) {
          const meal = day?.[slot]
          if (!meal || typeof meal !== 'object') continue
          pairs.push({
            receiptId,
            receiptLabel: receipt.label,
            version,
            day: day.day || '',
            slot: slot.toLowerCase(),
            title: meal.title ?? '',
          })
        }
      }
    }
  }

  shuffle(pairs)
  const sheetRows = [['plan_code', 'receipt_label', 'day', 'slot', 'title', 'cook_it', 'screenshot_it', 'why_not']]
  const keyRows = [['plan_code', 'version', 'receipt_id']]
  pairs.forEach((pair, index) => {
    const planCode = `P${String(index + 1).padStart(2, '0')}`
    sheetRows.push([planCode, pair.receiptLabel, pair.day, pair.slot, pair.title, '', '', ''])
    keyRows.push([planCode, pair.version, pair.receiptId])
  })

  const ratingSheet = suffix ? `rating-sheet-${suffix}.csv` : 'rating-sheet.csv'
  const keySheet = suffix ? `key-${suffix}.csv` : 'key.csv'
  await fs.writeFile(path.join(SCRIPT_DIR, ratingSheet), csv(sheetRows), 'utf8')
  await fs.writeFile(path.join(SCRIPT_DIR, keySheet), csv(keyRows), 'utf8')
  console.log(`Wrote ${pairs.length} meal rows to scripts/eval/${ratingSheet} and ${pairs.length} mappings to scripts/eval/${keySheet}.`)
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
