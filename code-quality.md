# Code Quality Improvements

## Duplicate Code

### Duplicate Session Cleanup Functions

**Location:** `app/auth/session.ts:39-41` and `app/auth/session.ts:83-88`

`deleteExpiredSessions()` and `cleanupExpiredSessions()` perform the same operation. Remove one and keep only `cleanupExpiredSessions()` which returns the count of deleted sessions.

```typescript
// Remove this:
export async function deleteExpiredSessions(): Promise<void> {
  await db.delete(sessionTable).where(lt(sessionTable.expiresAt, sql`NOW()`));
}

// Keep this:
export async function cleanupExpiredSessions(): Promise<number> {
  const deletedSessions = await db
    .delete(sessionTable)
    .where(lt(sessionTable.expiresAt, sql`NOW()`))
    .returning();
  return deletedSessions.length;
}
```

## Security Improvements

### Weak Password-to-Key Derivation

**Location:** `app/crypto/dek.ts:67-69`

The current implementation uses a single SHA3-256 hash which is vulnerable to brute-force attacks. Replace with a proper KDF:

```typescript
// Current (weak):
function passwordToAesKey(password: string) {
  const passwordBytes = new TextEncoder().encode(password);
  return Buffer.from(sha3_256(passwordBytes)).toString("base64");
}

// Recommended: Use PBKDF2, Argon2, or scrypt with salt and high iteration count
```

### No Salt in DEK Wrapping

The `wrapDekWithPassword` function derives the same AES key for identical passwords across different users. Add a per-environment salt stored alongside `dekWrappedByPassword`.

## Database Improvements

### Connection Pooling

**Location:** `app/db/db.ts`

Ensure the database connection handles pooling and graceful shutdown for production deployments.

### Missing Index

Consider adding an index on `sessionTable.token` for faster session lookups (though the unique constraint may already create one).

## API Improvements

### Large Bearer Token

Using the full RSA public key as a bearer token is unconventional and verbose. Consider using a shorter API key identifier that maps to the public key in the database.
