#!/usr/bin/env node
// Prints env values for the admin panel login.
// Usage: node scripts/hash-admin-password.js   (prompts for the password, input is not echoed)

const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const readline = require('readline')

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
rl._writeToOutput = (s) => { if (!rl.muted) rl.output.write(s) }

rl.question('Admin password (min 12 chars): ', (password) => {
  rl.close()
  process.stdout.write('\n')
  if (password.length < 12) {
    console.error('Password must be at least 12 characters.')
    process.exit(1)
  }
  const hash = bcrypt.hashSync(password, 12)
  // base64 so the `$` characters in the bcrypt hash survive .env variable expansion
  console.log(`ADMIN_PASSWORD_HASH=${Buffer.from(hash).toString('base64')}`)
  console.log(`ADMIN_SESSION_SECRET=${crypto.randomBytes(32).toString('hex')}`)
})
rl.muted = true
