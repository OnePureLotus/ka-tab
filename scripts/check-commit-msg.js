#!/usr/bin/env node
// Conventional Commits format check
import { readFileSync } from 'node:fs'

const msgFile = process.argv[2]
const msg = readFileSync(msgFile, 'utf8').trim()

const pattern = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?: .{1,72}/

if (!pattern.test(msg)) {
  console.error('❌ Commit message must follow Conventional Commits:')
  console.error('   <type>(<scope>): <subject>')
  console.error('   e.g. feat(collections): add color picker')
  process.exit(1)
}
