# Secret Party

Simple self-hostable secrets manager

> Uses monorepo structure with TypeScript custom conditions for zero-build development

## Features

- Organize your secrets by projects and environments (e.g. prod & staging)
  - Secrets are stored as key-value pairs.
  - No versioning.
- Easy backup & restore.
- Public API for managing secrets.
  - Authentication: Bearer token using public key in Authorization header
  - Endpoints:
    - GET /api/v1/environments - List all environments the API key has access to
    - GET /api/v1/environments/:environmentId - Get environment info
    - GET /api/v1/environments/:environmentId/secrets - List all secret keys
    - GET /api/v1/environments/:environmentId/secrets/:key - Get specific secret
    - POST /api/v1/environments/:environmentId/secrets/:key - Create new secret
    - PUT /api/v1/environments/:environmentId/secrets/:key - Update existing secret
  - API key pair generation from dashboard.

## How It Works

Secrets are saved on database after encrypted with a symmetric DEK (data encryption key).
There is one DEK per environment, and each DEK is saved on db after encrypted with the user's password.

### Security

**Password-to-Key Derivation:**

- Uses Argon2id with production-grade parameters (64MB memory, 3 iterations, 4 threads)
- Unique salt per environment (prevents rainbow table attacks)
- ~100ms derivation time (resistant to brute force attacks at ~10 attempts/sec)
- Same security parameters as login authentication

**Encryption:**

- DEK: 256-bit AES keys
- Secrets: AES-256-GCM (authenticated encryption)
- API Keys: RSA-2048 with OAEP padding
- All cryptographic operations use audited libraries (@noble/ciphers, @noble/hashes)

**Performance:**

- Initial environment access: ~100ms (one-time password-to-key derivation)
- Subsequent secret operations: <10ms (DEK cached in memory)
- API key-based access: Client-side decryption (zero server overhead)

### New API key creation flow

- User enters the password.
- DEK is decrypted with the user password.
- Server generates a new public private key pair.
- DEK gets encrypted with the public key and saved on database (as `environment_access.dek_wrapped_by_client_public_key`).
- The private key is shown to the user so that they can store it safely. The private key is not saved on database.

### Secret fetch flow

- Client requests a secret with the project id, environment id, and key (e.g. Portfolio + production + DATABASE_URL).
- Server responds with the encrypted DEK and the encrypted secret value.
- Client decrypts the DEK with its private key.
- Client decrypts the secret value with the DEK.

## Security Considerations

### Password Requirements

For optimal security, use passwords with:

- Minimum 12 characters (16+ recommended)
- Mix of uppercase, lowercase, numbers, and symbols
- No dictionary words or common patterns

**Note**: The Argon2id key derivation provides strong protection even for moderate passwords (10+ chars), but longer passwords are always better.

### Threat Model

**Protected Against:**

- ✅ Database breach + offline brute force attacks (Argon2id makes this infeasible)
- ✅ Rainbow table attacks (unique salt per environment)
- ✅ API key compromise (each key limited to specific environments)

**Not Protected Against:**

- ❌ Password phishing or keyloggers (user password compromise)
- ❌ Server compromise with live memory access (DEK cached during session)
- ❌ Physical access to running server

### Performance Impact

Password-to-key derivation using Argon2id adds ~100ms latency to:

- Environment creation
- First secret access per environment per session
- API key creation

This is intentional and necessary for security. Subsequent operations are fast (<10ms).
