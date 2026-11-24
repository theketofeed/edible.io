import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cleanGroceryList } from './eval/lib/grocery-clean.mjs'
import {
  buildStep1Prompt,
  filterItemsByDiet,
  getStep3SplitPlan,
  runPlanPipeline,
  validatePlanRequest,
} from '../shared/planPipeline.mjs'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..')
const RECEIPTS_PATH = path.join(SCRIPT_DIR, 'eval', 'receipts.json')
const ENV_PATH = path.join(REPO_ROOT, '.env.local')
const OUTPUT_DIR = path.join(SCRIPT_DIR, 'eval', 'out', 'prod-test')
const USAGE = 'Usage: node scripts/test-plan-pipeline.mjs --receipt r08 --days 3 [--dry-run]'
const SLOTS = ['Breakfast', 'Lunch', 'Dinner']

function parseArgs(argv) {
  const options = { receipt: null, days: null, dryRun: false }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--receipt') options.receipt = argv[++index]
    else if (arg === '--days') {
      options.days = Number(argv[++index])
    } else if (arg === '--dry-run') options.dryRun = true
    else throw new Error(`Unknown argument: ${arg}`)
  }
  if (!options.receipt || !Number.isInteger(options.days) || options.days < 1 || options.days > 7) {
    throw new Error(USAGE)
  }
  return options
}

async function loadApiKey() {
  let envText
  try {
    envText = await fs.readFile(ENV_PATH, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
  for (const line of envText.split(/\r?\n/)) {
    const entry = line.trim()
    if (!entry || entry.startsWith('#')) continue
    const separator = entry.indexOf('=')
    if (separator === -1) continue
    if (entry.slice(0, separator).trim() !== 'CLAUDE_API_KEY') continue
    let value = entry.slice(separator + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1).trim()
    }
    return value || null
  }
  return null
}

function prepareItems(rawItems, diet) {
  const originalLog = console.log
  let cleaned
  console.log = () => {}
  try {
    cleaned = cleanGroceryList(rawItems)
  } finally {
    console.log = originalLog
  }
  return filterItemsByDiet(cleaned, diet)
}

function printValidation(validation) {
  if (!validation.ok) {
    console.log(`Request validation: ok=false; reason=${validation.reason}`)
    return
  }
  console.log(`Request validation: ok=true; items=${validation.items.length}; diet=${validation.diet}; days=${validation.days}`)
}

function printSplitPlan(days) {
  const parts = getStep3SplitPlan(days)
  console.log(`Step 3 split: ${parts.length > 1 ? `yes, ${parts.length} parallel calls` : 'no, one call'}`)
  parts.forEach((part, index) => {
    const meals = part.dayCount * 3
    console.log(`  call ${index + 1}: Day ${part.startDay} to Day ${part.endDay}; ${meals} meals; timeout ${part.timeoutMs}ms`)
  })
}

function printStepMetrics(steps) {
  for (const step of steps) {
    console.log(`  ${step.label || `Step ${step.step}`} attempt ${step.attempt}: time ${step.elapsedMs}ms; input tokens ${step.inputTokens ?? 'n/a'}; output tokens ${step.outputTokens ?? 'n/a'}; stop_reason ${step.stopReason ?? 'n/a'}`)
  }
}

function check(title, ok, detail) {
  const status = ok ? 'PASS' : 'FAIL'
  console.log(`    ${title}: ${status}${ok ? '' : ` (${detail})`}`)
  return ok
}

function printStructureChecks(plan, days) {
  let allOk = check(`day count is ${days}`, plan.days.length === days, `got ${plan.days.length}`)
  for (let index = 0; index < plan.days.length; index += 1) {
    const day = plan.days[index]
    const label = `Day ${index + 1}`
    allOk = check(`${label} key`, day?.day === label, `got ${day?.day ?? 'missing'}`) && allOk
    for (const slot of SLOTS) {
      const meal = day?.[slot]
      const instructionsOk = Array.isArray(meal?.instructions) && meal.instructions.at(-1) === 'ENJOY!❤️'
      const ingredientsOk = Array.isArray(meal?.ingredients)
      const nutritionOk = Boolean(meal?.nutrition && typeof meal.nutrition === 'object' && !Array.isArray(meal.nutrition))
      const titleOk = typeof meal?.title === 'string' && meal.title.trim().length > 0
      console.log(`  ${label} ${slot}:`)
      allOk = check('title', titleOk, `got ${typeof meal?.title}`) && allOk
      allOk = check('instructions end in ENJOY!❤️', instructionsOk, Array.isArray(meal?.instructions) ? `last=${JSON.stringify(meal.instructions.at(-1))}` : 'not an array') && allOk
      allOk = check('ingredients array', ingredientsOk, `got ${typeof meal?.ingredients}`) && allOk
      allOk = check('nutrition object', nutritionOk, `got ${typeof meal?.nutrition}`) && allOk
    }
  }
  console.log(`Structure checks: ${allOk ? 'ALL PASS' : 'FAILED'}`)
  return allOk
}

async function main() {
  let options
  try {
    options = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
    return
  }

  const receipts = JSON.parse(await fs.readFile(RECEIPTS_PATH, 'utf8'))
  const receipt = receipts.find((entry) => entry.id === options.receipt)
  if (!receipt) {
    console.error(`Unknown receipt: ${options.receipt}`)
    process.exitCode = 1
    return
  }

  const items = prepareItems(receipt.items, receipt.diet)
  const validation = validatePlanRequest({ items, diet: receipt.diet, days: options.days })

  console.log(`Receipt: ${receipt.id}; diet: ${receipt.diet}; days: ${options.days}; cleaned items: ${items.length}`)
  printValidation(validation)

  if (options.dryRun) {
    console.log('Dry run. No API call.')
    console.log('STEP 1 PROMPT:')
    console.log(buildStep1Prompt(items, receipt.diet, options.days))
    console.log('STEP 3 PLAN:')
    printSplitPlan(options.days)
    return
  }

  if (!validation.ok) {
    process.exitCode = 1
    return
  }

  const apiKey = await loadApiKey()
  if (!apiKey) {
    console.error(`Missing CLAUDE_API_KEY in ${path.relative(REPO_ROOT, ENV_PATH)}`)
    process.exitCode = 1
    return
  }

  const steps = []
  console.log('Calling runPlanPipeline directly...')
  const plan = await runPlanPipeline({
    items: validation.items,
    diet: validation.diet,
    days: validation.days,
    apiKey,
    onStepResult: (info) => steps.push(info),
  })

  console.log('Step metrics:')
  printStepMetrics(steps)
  printSplitPlan(options.days)

  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  const outputPath = path.join(OUTPUT_DIR, `${receipt.id}-${options.days}d.json`)
  await fs.writeFile(outputPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8')
  console.log(`Saved plan: ${path.relative(REPO_ROOT, outputPath)}`)
  console.log(`Day count: ${plan.days.length}`)

  for (const day of plan.days) {
    for (const slot of SLOTS) {
      console.log(`${day.day} ${slot}: ${day[slot]?.title ?? 'missing'}`)
    }
  }

  if (!printStructureChecks(plan, options.days)) process.exitCode = 1
}

main().catch((error) => {
  console.error(`Test failed: ${error?.message || String(error)}`)
  process.exitCode = 1
})
