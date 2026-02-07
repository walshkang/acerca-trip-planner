import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

type Args = {
  email?: string;
  password?: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function parseArgs(argv: string[]): Args {
  const out: Args = {};

  for (const raw of argv) {
    if (raw.startsWith('--email=')) out.email = raw.slice('--email='.length);
    if (raw.startsWith('--password=')) out.password = raw.slice('--password='.length);
  }

  return out;
}

function loadDotEnvLocal() {
  const envPath = path.join(ROOT_DIR, '.env.local');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    if (!key || process.env[key] != null) continue;
    const value = trimmed.slice(idx + 1).trim();
    process.env[key] = value;
  }
}

function pickEnv(name: string): string | null {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isAlreadyExistsError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('already') ||
    m.includes('exists') ||
    m.includes('registered') ||
    m.includes('duplicate')
  );
}

async function findUserByEmail(
  admin: ReturnType<typeof createClient>,
  email: string,
): Promise<{ id: string; email: string | null } | null> {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) return null;

    const found = (data.users ?? []).find(
      (u) => (u.email ?? '').toLowerCase() === email.toLowerCase(),
    );
    if (found?.id) {
      return { id: found.id, email: found.email ?? null };
    }

    const lastPage = typeof (data as any).lastPage === 'number' ? (data as any).lastPage : null;
    if (lastPage && page >= lastPage) break;
    if (data.users.length < 200) break;
  }

  return null;
}

async function main() {
  loadDotEnvLocal();

  const args = parseArgs(process.argv.slice(2));

  const supabaseUrl = pickEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = pickEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const serviceRoleKey = pickEnv('SUPABASE_SERVICE_ROLE_KEY');

  const seedEmail = args.email ?? pickEnv('PLAYWRIGHT_SEED_EMAIL');
  const seedPassword = args.password ?? pickEnv('PLAYWRIGHT_SEED_PASSWORD');

  const missing: string[] = [];
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!seedEmail) missing.push('PLAYWRIGHT_SEED_EMAIL (or pass --email=...)');
  if (!seedPassword) missing.push('PLAYWRIGHT_SEED_PASSWORD (or pass --password=...)');

  if (missing.length) {
    throw new Error(
      `Missing env for seed user setup: ${missing.join(', ')}\n` +
        `Tip: set these in ${path.join(ROOT_DIR, '.env.local')}`,
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const createRes = await admin.auth.admin.createUser({
    email: seedEmail,
    password: seedPassword,
    email_confirm: true,
  });

  let userId = createRes.data.user?.id ?? null;
  let action: 'created' | 'existing' = 'created';

  if (createRes.error) {
    if (!isAlreadyExistsError(createRes.error.message)) {
      throw new Error(`Failed to create seed user: ${createRes.error.message}`);
    }

    const existing = await findUserByEmail(admin, seedEmail);
    if (!existing?.id) {
      throw new Error(
        `Seed user appears to already exist, but could not be located via listUsers().\n` +
          `Try creating it in the Supabase dashboard (Auth → Users), or delete/rename the existing user.\n` +
          `Original error: ${createRes.error.message}`,
      );
    }

    userId = existing.id;
    action = 'existing';
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signInRes = await client.auth.signInWithPassword({
    email: seedEmail,
    password: seedPassword,
  });

  if (signInRes.error) {
    throw new Error(
      `Seed user exists (${action}) but password sign-in failed: ${signInRes.error.message}\n` +
        `Check Supabase dashboard: Authentication → Providers → Email, ensure email/password sign-in is enabled and the user is confirmed.`,
    );
  }

  console.log(
    `✓ Playwright seed user ready (${action}): ${seedEmail} ${userId ? `(id: ${userId})` : ''}`,
  );
  console.log('Next: run `npm run dev` then `npm run test:e2e`.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

