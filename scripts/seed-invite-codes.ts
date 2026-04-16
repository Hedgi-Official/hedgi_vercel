/**
 * One-shot seed for the invite_codes table during the Replit→Vercel
 * migration. Reads codes from process.env.BETA_INVITE_CODES (the same
 * comma-separated format Replit used in .replit userenv.shared) and
 * inserts each one. Existing codes (matched by primary key) are left
 * untouched so re-running this script is safe and will NOT resurrect
 * codes that have already been used on the new Vercel deployment.
 *
 * Run with: tsx scripts/seed-invite-codes.ts
 *   (DATABASE_URL must be set; BETA_INVITE_CODES must be set).
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { db } from '../db';
import { inviteCodes } from '../db/schema';

async function main() {
  const raw = process.env.BETA_INVITE_CODES;
  if (!raw) {
    console.error('BETA_INVITE_CODES env var is empty. Nothing to seed.');
    process.exit(1);
  }

  const codes = raw
    .split(',')
    .map(c => c.trim())
    .filter(c => c.length > 0);

  if (codes.length === 0) {
    console.error('No codes parsed from BETA_INVITE_CODES.');
    process.exit(1);
  }

  console.log(`Seeding ${codes.length} invite code(s)…`);

  // ON CONFLICT DO NOTHING preserves the used_at / used_by_user_id state
  // of any code that already exists in the table.
  const inserted = await db
    .insert(inviteCodes)
    .values(codes.map(code => ({ code })))
    .onConflictDoNothing({ target: inviteCodes.code })
    .returning({ code: inviteCodes.code });

  console.log(`Inserted ${inserted.length} new code(s); skipped ${codes.length - inserted.length} existing.`);
  process.exit(0);
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
