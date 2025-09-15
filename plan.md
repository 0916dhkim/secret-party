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
- **Database Migrations in Production** - No production migration scripts or backup procedures
- **Logging Libraries** - Using simple console logging instead of external logging libraries
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

## Phase 5: Security Hardening

### Security Measures:

1. **Input Validation**

   - Zod schemas for all API inputs
   - XSS protection with proper escaping
   - SQL injection prevention (parameterized queries)

2. **Audit Logging**

   - Log all secret access (API calls)
   - Log all management operations (create/update/delete)
   - Include IP, timestamp, user/API key identifier

## Implementation Order:

1. ✅ Basic auth system (already exists)
2. ✅ Database schema and migrations (already done)
3. 🔄 Encryption utilities
4. 🔄 Dashboard UI components and pages (Remix)
5. 🔄 Public REST API implementation (Hono)
6. 🔄 Security hardening
7. 🔄 Documentation

## Technical Considerations:

- **Hybrid architecture:**
  - **Remix** - Dashboard UI, authentication, internal operations (loaders/actions)
  - **Hono** - Public REST API endpoints only
  - **Shared:** Drizzle ORM + PostgreSQL (PGLite on local, pg on prod)
- Client-side crypto operations for API key usage
- Memory-safe handling of encryption keys (clear after use)
- Proper error handling without information leakage
- Backup and recovery procedures for encrypted data
