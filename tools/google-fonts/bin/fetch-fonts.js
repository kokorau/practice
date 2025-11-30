#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const script = resolve(__dirname, '../src/cli.ts')

spawn('node', ['--import', 'tsx', script, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
}).on('exit', (code) => process.exit(code ?? 0))
