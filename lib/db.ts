import { neon } from '@neondatabase/serverless';

const database = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

let accountSchemaReady: Promise<void> | undefined;

export function getDb() {
  if (!database) throw new Error('Database is not configured. Add a server-side DATABASE_URL.');
  return database;
}

export async function ensureAccountSchema() {
  const db = getDb();
  if (!accountSchemaReady) {
    accountSchemaReady = (async () => {
      await db`CREATE TABLE IF NOT EXISTS carebridge_users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text NOT NULL UNIQUE,
        password_salt text NOT NULL,
        password_hash text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      await db`CREATE TABLE IF NOT EXISTS carebridge_sessions (
        token_hash text PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES carebridge_users(id) ON DELETE CASCADE,
        expires_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      await db`CREATE INDEX IF NOT EXISTS carebridge_sessions_expiry_idx ON carebridge_sessions(expires_at)`;
      await db`CREATE TABLE IF NOT EXISTS consultations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id uuid NOT NULL REFERENCES carebridge_users(id) ON DELETE CASCADE,
        title text NOT NULL DEFAULT 'Consultation',
        messages jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT carebridge_consultations_messages_array CHECK (jsonb_typeof(messages) = 'array'),
        CONSTRAINT carebridge_consultations_one_per_owner UNIQUE(owner_id)
      )`;
    })().catch((error) => {
      accountSchemaReady = undefined;
      throw error;
    });
  }
  return accountSchemaReady;
}
