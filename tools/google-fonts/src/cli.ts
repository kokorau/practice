import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { Command } from 'commander'
import { config } from 'dotenv'
import { fetchGoogleFonts, generateTsFile } from './fetch-fonts'

const program = new Command()

program
  .name('update-googlefonts-list')
  .description('Fetch Google Fonts and generate TypeScript presets')
  .requiredOption('-o, --output <path>', 'Output file path')
  .option('-e, --env <path>', 'Path to .env file', '.env')
  .option('-l, --limit <number>', 'Limit number of fonts', '100')
  .parse()

const opts = program.opts<{
  output: string
  env: string
  limit: string
}>()

// Load .env
config({ path: opts.env })

const apiKey = process.env.GOOGLE_FONTS_API_KEY
const limit = parseInt(opts.limit, 10)
const outputPath = resolve(opts.output)

async function main() {
  if (!apiKey) {
    console.error('Error: GOOGLE_FONTS_API_KEY is required')
    console.error('Set it in .env file or as environment variable')
    process.exit(1)
  }

  const result = await fetchGoogleFonts({ apiKey, limit })

  console.log(`Fetched ${result.totalFetched} fonts`)
  console.log(`Output ${result.presets.length} fonts (limit=${limit || 'unlimited'})`)

  // Write to file
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, generateTsFile(result.presets))
  console.log(`Written to ${outputPath}`)
}

main()
