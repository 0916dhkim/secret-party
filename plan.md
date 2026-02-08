# Secret Party Implementation Plan

## Overview

Build a self-hostable secrets manager with project/environment organization, encrypted storage, and API access.

_Note: All required packages are already installed in package.json - no additional installations needed._

## Out of Scope

The following items are explicitly **not** included in this implementation:

- **Testing** - No test suites, unit tests, or integration tests
- **Rate Limiting** - No API rate limiting or request throttling
- **Deployment** - No Docker, CI/CD, or production deployment configuration
- **Internal Management APIs** - Using Tanstack Start server actions instead of REST endpoints
- **Advanced Security Features** - No 2FA, session management, or security settings page
- **Database Migrations in Production** - No production migration scripts
- **CORS Configuration** - Single domain architecture, no cross-origin requests
- **UI Polish** - No focus on making polished UI. Rough UI is ok as long as the functionality is there.

## Phase 1: Encryption System

### Components to Build:

1. **DEK Management (`app/crypto/dek.ts`)**
   - `generateDEK()` - Generate new 256-bit AES key
   - `encryptDEKWithPassword(dek, password)` - Encrypt DEK with user password
   - `decryptDEKWithPassword(encryptedDEK, password)` - Decrypt DEK with user password
   - `encryptDEKWithPublicKey(dek, publicKey)` - Encrypt DEK with RSA public key

2. **Secret Encryption (`app/crypto/secrets.ts`)**
   - `encryptSecret(value, dek)` - Encrypt secret value with AES-256-GCM
   - `decryptSecret(encryptedValue, dek)` - Decrypt secret value

3. **Key Pair Generation (`app/crypto/keypair.ts`)**
   - `generateKeyPair()` - Generate RSA-2048 public/private key pair
   - `decryptWithPrivateKey(encryptedData, privateKey)` - Decrypt data with private key

## Phase 2: Authentication & Authorization

### Enhance Current Auth System:

1. **Password Verification for All Operations**
   - Add password confirmation modal component (based on <dialog>)
   - Middleware requiring password verification for all secret operations
   - No session-based elevated permissions - password required every time

2. **API Key Authentication**
   - Middleware to validate API keys from headers
   - Key rotation capabilities

## Phase 3: Dashboard UI (Frontend)

### Pages to Create:

1. **Dashboard Home (`/dashboard`)**
   - List all user's projects
   - Quick stats (total secrets, environments, API keys)
   - Create new project button

2. **Project Detail (`/projects/:projectId`)**
   - Project overview
   - List environments in project
   - Create/edit/delete environments
   - Environment-specific secret counts

3. **Environment Detail (`/projects/:projectId/environments/:envId`)**
   - List all secrets in environment
   - Add/edit/delete secrets
   - Bulk secret import/export
   - Secret search and filtering

4. **API Keys Management (`/api-keys`)**
   - List all API keys with creation dates and expiry
   - Create new API key flow with environment selection
   - Revoke/delete API keys
   - Show private key once during creation

### UI Components to Build:

1. **PasswordConfirmationModal** - For sensitive operations
2. **SecretForm** - Add/edit secret key-value pairs
3. **EnvironmentSelector** - Dropdown for environment selection
4. **APIKeyCreationWizard** - Multi-step API key creation
5. **SecretsList** - Table with search, sort, pagination
6. **ProjectCard** - Project overview card component
7. **NavigationMenu** - Main app navigation

### Navigation Menu Structure:

- **Dashboard** - Home/overview page
- **Projects** - All projects page
- **API Keys** - API key management page
- **Account** - User settings and security
- **Logout** - Sign out option

### Navigation Features:

- Breadcrumb navigation for deep pages (Project > Environment > Secrets)
- Active state highlighting for current page/section
- Responsive design (mobile hamburger menu)
- Project switcher for quick navigation between projects
- Environment indicators showing secret counts

## Phase 4: API Implementation (Hono)

### API Server Setup:

- Embedded Hono server for public REST API. Hono server is integrated as a Tanstack Start server route handler.
- Shared Drizzle database connection with Remix app
- API key authentication middleware
- JSON-only responses (no HTML)

### API Endpoints:

1. **List Secrets in Environment**
   - `GET /api/v1/secrets?project=<project-id>&environment=<environment-id>`
   - Returns: `{ secretKeys: [string] }`
   - Authentication: API public key in Authorization header

2. **Get Specific Secret**
   - `GET /api/v1/secret?project=<project-id>&environment=<environment-id>&key=<key>`
   - Returns: `{ key: string, encrypted_dek: string, encrypted_secret: string }`
   - Authentication: API public key in Authorization header

3. **Create New Secret**
   - `POST /api/v1/secret`
   - Body: `{ projectId: number, environmentId: number, key: string, value: string }`
   - Returns: status 201 with empty body
   - Authentication: API public key in Authorization header

4. **Update Existing Secret**
   - `PUT /api/v1/secret`
   - Body: `{ projectId: number, environmentId: number, key: string, value: string }`
   - Returns: status 200 with empty body
   - Authentication: API public key in Authorization header

## Phase 5: Backup & Restore

### Admin Role

- Add `isAdmin` column to `userTable` (integer, 0 or 1)
- First registered user is automatically promoted to admin
- Add `requireAdmin()` helper alongside existing `requireAuth()`
- All backup/restore operations require admin role

### Backup

- **Trigger**: Manual only (button in dashboard)
- **Format**: JSON file containing all tables except sessions (which are ephemeral)
- **Storage**: Server filesystem, configurable via `BACKUP_DIR` env var (default `./backups/`)
- **Filename**: `backup-YYYY-MM-DDTHH-MM-SS.json`
- **Contents**: Full encrypted database dump — secrets remain encrypted (DEKs stay wrapped), so backups are safe at rest without additional encryption layer
- **Structure**:
  ```json
  {
    "version": 1,
    "createdAt": "ISO timestamp",
    "tables": {
      "user": [...],
      "project": [...],
      "environment": [...],
      "secret": [...],
      "api_client": [...],
      "environment_access": [...],
      "audit_log": [...]
    }
  }
  ```

### Restore

- **Behavior**: Full wipe-and-replace (truncate all tables, then insert from backup)
- **Ordering** (respects FK constraints):
  - Truncate: audit_log, environment_access, secret, session, environment, api_client, project, user
  - Insert: user, project, environment, secret, api_client, environment_access, audit_log
- **Validation**: Check backup `version` and table schema before restoring
- **Session handling**: Re-create the current admin user's session after restore
- **Confirmation**: Requires explicit user confirmation ("This will wipe all existing data")

### Dashboard UI (`/admin/backups`)

- **Backup section**: "Create Backup Now" button, list of existing backups with timestamps and file sizes
- **Restore section**: File upload, confirmation modal, progress/status indicator
- Page guarded behind `requireAdmin()`
- "Backups" link in navigation menu (visible to admin users only)

### Audit Logging

- Log `backup.created` and `backup.restored` events via existing audit logger

### Implementation Files

- `packages/database/src/schema.ts` — add `isAdmin` column to `userTable`
- `apps/dashboard/app/auth/actions.tsx` — auto-promote first user to admin on signup
- `apps/dashboard/app/auth/session.tsx` — add `requireAdmin()` helper
- `apps/dashboard/app/backup/backup.ts` — `createBackup()`, `listBackups()`
- `apps/dashboard/app/backup/restore.ts` — `restoreFromBackup()`
- `apps/dashboard/app/routes/admin.backups.tsx` — dashboard UI page

## Implementation Order:

1. ✅ Basic auth system (already exists)
2. ✅ Database schema and migrations (already done)
3. ✅ Encryption utilities
4. ✅ Dashboard UI components and pages (core functionality complete)
5. ✅ Public REST API implementation (Hono)

### Deferred/Optional UI Features:

- Dashboard home with stats (currently redirects to /projects)
- Bulk secret import/export
- Secret search and filtering

### Completed:

- ✅ **Audit logging backend** - Tracks secret access, API key usage, auth attempts, and all user actions

### TODO:

- **JavaScript Client Library for Public API** - Build a reusable JS/TS client for interacting with the public API
  - Features:
    - Initialize with private key PEM
    - Automatically extract public key from private key
    - Handle HTTP header encoding (newline escaping)
    - Type-safe API with TypeScript definitions
  - Package: `@secret-party/client` or similar
- **CLI Client for Public API** - Build a command-line tool for accessing secrets from the terminal
  - Features:
    - Accept private key via file path or environment variable
    - Commands: `get`, `list`, `set`, `update`, `delete`
    - Output formats: env vars, JSON, dotenv files
    - Use cases: CI/CD pipelines, local development, scripts
    - Could leverage the JS client library internally
  - Package: `@secret-party/cli` or similar
- **Audit log viewer UI** - Page to view audit logs with filtering by action, user, date range
- **Unique environment name per project** - Add unique constraint on (projectId, name) in environmentTable
- **Secret key validation** - Restrict keys to alphanumeric + underscores for env var compatibility
- **Delete endpoint in public API** - Add `DELETE /api/v1/secret` endpoint
- **Scheduled Backups** - Add cron-based automatic backups with configurable schedule and retention
  - `BACKUP_SCHEDULE` env var — cron expression (default: daily at midnight)
  - `BACKUP_RETENTION` env var — number of backups to keep (default: 30, oldest auto-deleted)
  - Initialize scheduler in server entry point

## Security Concerns

### High Severity Issues:

1. **✅ RESOLVED: Strong Password-to-Key Derivation**
   - **Location**: `app/crypto/dek.ts:93-97`
   - **Status**: Implemented Argon2id with production-grade parameters
   - **Solution**: Uses Argon2id (64MB memory, 3 iterations, 4 threads) with unique salt per environment
   - **Security**: ~100ms derivation time makes brute force attacks infeasible (~10 attempts/sec vs 10 billion/sec with SHA3)
   - **Format**: `salt(hex):iv(base64);ciphertext(base64)` - salt embedded in wrapped DEK

2. **No Rate Limiting on Authentication**
   - **Location**: `app/auth/actions.ts` (login), `app/public-api/server.tsx` (API auth)
   - **Issue**: Unlimited login/API authentication attempts allowed
   - **Impact**: Enables brute force attacks on passwords and API keys
   - **Fix**: Implement rate limiting middleware (e.g., 5 attempts per 15 minutes per IP)

3. **No Account Lockout Mechanism**
   - **Location**: `app/auth/actions.ts:23-37`
   - **Issue**: Failed login attempts don't trigger account lockout
   - **Impact**: Attackers can attempt unlimited password guesses
   - **Fix**: Lock account after N failed attempts with 30-minute cooldown

4. **Missing CSRF Protection**
   - **Location**: All POST/PUT/DELETE operations
   - **Issue**: Only relies on SameSite cookie protection, no CSRF tokens
   - **Impact**: Cross-site request forgery attacks possible on state-changing operations
   - **Fix**: Implement CSRF token validation or verify Origin/Referer headers

5. **Timing Attack in Login Flow**
   - **Location**: `app/auth/actions.ts:23-37`
   - **Issue**: Different response times for "user not found" vs "invalid password"
   - **Impact**: Allows attackers to enumerate valid email addresses
   - **Fix**: Always hash password even when user doesn't exist (constant-time operations)

### Medium Severity Issues:

- **No Security Headers**: Missing HSTS, CSP, X-Frame-Options, X-Content-Type-Options
- **Private Keys Displayed in Browser**: API client private keys persist in browser memory/history after creation
- **No Session Token Invalidation**: Logout doesn't truly revoke session tokens from database
- **No HTTPS Enforcement**: Secure cookie flag only enabled in production, no HSTS header

### Security Strengths:

- ✅ Excellent password hashing (Argon2id with production-grade parameters)
- ✅ Strong password-to-key derivation (Argon2id with unique salt per environment)
- ✅ Strong encryption (AES-256-GCM with proper IVs and authenticated encryption)
- ✅ Good session management (7-day expiration, 256-bit random tokens)
- ✅ Comprehensive audit logging (all sensitive actions tracked)
- ✅ Proper authorization checks (ownership + environment-level access control)
- ✅ HttpOnly cookies with SameSite protection

## Technical Considerations:

- **Hybrid architecture:**
  - **Remix** - Dashboard UI, authentication, internal operations (loaders/actions)
  - **Hono** - Public REST API endpoints only
  - **Shared:** Drizzle ORM + PostgreSQL (PGLite on local, pg on prod)
- Client-side crypto operations for API key usage
- Proper error handling without information leakage
- Backup saves full encrypted DB to filesystem; restore wipes and replaces all data
