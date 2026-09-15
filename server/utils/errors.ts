/**
 * Converts a thrown value into a message that is safe to send to the client.
 *
 * Errors we throw deliberately in the service layer ("Insufficient stock",
 * "Customer not found", …) are meant for the user and pass through unchanged.
 * Low-level errors — SQLite constraint failures, type errors, driver errors —
 * would leak schema/internal detail, so they are logged server-side and
 * replaced with a generic message.
 */

const SQLITE_FRIENDLY: Record<string, string> = {
  SQLITE_CONSTRAINT_UNIQUE: 'A record with these details already exists.',
  SQLITE_CONSTRAINT_PRIMARYKEY: 'A record with these details already exists.',
  SQLITE_CONSTRAINT_FOREIGNKEY: 'This action references a record that does not exist.',
  SQLITE_CONSTRAINT_NOTNULL: 'A required field is missing.',
  SQLITE_CONSTRAINT_CHECK: 'One or more values are out of the allowed range.',
  SQLITE_CONSTRAINT_TRIGGER: 'This change is not allowed.',
  SQLITE_BUSY: 'The database is busy. Please try again in a moment.',
  SQLITE_LOCKED: 'The database is busy. Please try again in a moment.',
};

const GENERIC = 'Something went wrong. Please try again.';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export function clientMessage(err: unknown, fallback: string = GENERIC): string {
  if (!isRecord(err)) {
    console.error('Non-error thrown:', err);
    return fallback;
  }

  const code = typeof err.code === 'string' ? err.code : '';
  const name = typeof err.name === 'string' ? err.name : '';
  const message = typeof err.message === 'string' ? err.message : '';

  // better-sqlite3 driver errors.
  if (name === 'SqliteError' || code.startsWith('SQLITE_')) {
    console.error('Database error:', code, message);
    return SQLITE_FRIENDLY[code] || 'The database rejected this operation.';
  }

  // Programming errors — never surface these verbatim.
  if (name === 'TypeError' || name === 'RangeError' || name === 'ReferenceError' || name === 'SyntaxError') {
    console.error('Unexpected error:', err);
    return fallback;
  }

  // Anything left is treated as a deliberate, user-facing Error.
  if (message) return message;

  console.error('Unclassified error:', err);
  return fallback;
}
