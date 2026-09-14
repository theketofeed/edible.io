import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const args = new Set(process.argv.slice(2))
const dryRun = !args.has('--delete')

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY

if (!supabaseUrl || (!supabaseAnonKey && !serviceRoleKey)) {
  console.error('Missing SUPABASE_URL and a Supabase key (SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SERVICE_KEY).')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey || supabaseAnonKey, {
  auth: { persistSession: false },
})

function normalizeTitle(value) {
  return value.trim().toLocaleLowerCase()
}

function titleWords(value) {
  return normalizeTitle(value).match(/[a-z0-9]+/g) || []
}

function isTitlePrefixOrWordSubset(shortTitle, longTitle) {
  const shortNormalized = normalizeTitle(shortTitle)
  const longNormalized = normalizeTitle(longTitle)

  if (!shortNormalized || shortNormalized === longNormalized || shortNormalized.length >= longNormalized.length) {
    return false
  }

  if (longNormalized.startsWith(shortNormalized)) return true

  const longWords = new Set(titleWords(longTitle))
  return titleWords(shortTitle).every(word => longWords.has(word))
}

function findGenericTitlePairs(rows) {
  const pairs = []

  for (const shortRow of rows) {
    if (!shortRow.normalized_title || typeof shortRow.normalized_title !== 'string') continue

    for (const longRow of rows) {
      if (!longRow.normalized_title || typeof longRow.normalized_title !== 'string') continue
      if (isTitlePrefixOrWordSubset(shortRow.normalized_title, longRow.normalized_title)) {
        pairs.push({
          genericTitle: shortRow.normalized_title,
          replacementTitle: longRow.normalized_title,
        })
      }
    }
  }

  return pairs
}

async function main() {
  console.log(`Running meal_images cleanup in ${dryRun ? 'dry-run' : 'delete'} mode...`)

  const { data, error } = await supabase
    .from('meal_images')
    .select('*')

  if (error) {
    console.error('Failed to read meal_images:', error)
    process.exit(1)
  }

  const pairs = findGenericTitlePairs(data || [])
  const titlesToDelete = [...new Set(pairs.map(pair => pair.genericTitle))]

  if (!pairs.length) {
    console.log('No rows matched the generic-title pair check. Nothing to do.')
    return
  }

  console.log(`\nMatched title pairs (${pairs.length}):`)
  for (const pair of pairs) {
    console.log(`${pair.genericTitle}  ->  ${pair.replacementTitle}`)
  }

  if (dryRun) {
    console.log('\nDry run only — no rows were deleted. Re-run with --delete to remove the flagged rows.')
    return
  }

  const rowsByTitle = new Map((data || []).map(row => [row.normalized_title, row]))
  console.log('\nRows that will be deleted (longer replacement rows remain untouched):')
  for (const pair of pairs) {
    const row = rowsByTitle.get(pair.genericTitle)
    const rowId = row?.id === undefined ? '(no id column)' : `id=${row.id}`
    console.log(`DELETE ${rowId} normalized_title=${pair.genericTitle}`)
    console.log(`KEEP   normalized_title=${pair.replacementTitle}`)
  }

  console.log(`\nDeleting ${titlesToDelete.length} flagged rows...`)

  const { error: deleteError } = await supabase
    .from('meal_images')
    .delete()
    .in('normalized_title', titlesToDelete)

  if (deleteError) {
    console.error('Delete failed:', deleteError)
    process.exit(1)
  }

  console.log('Delete successful.')
}

main().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
