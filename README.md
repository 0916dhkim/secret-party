# Secret Party

Simple self-hostable secrets manager

## Features

- Organize your secrets by projects and environments (e.g. prod & staging)
  - Secrets are stored as key-value pairs.
  - No versioning.
- Easy backup & restore.
- Public API for managing secrets.
  - Authentication: Bearer token using public key in Authorization header
  - Endpoints:
    - GET /api/v1/environments/:environmentId - Get environment info
    - GET /api/v1/environments/:environmentId/secrets - List all secret keys
    - GET /api/v1/environments/:environmentId/secrets/:key - Get specific secret
    - POST /api/v1/environments/:environmentId/secrets/:key - Create new secret
    - PUT /api/v1/environments/:environmentId/secrets/:key - Update existing secret
  - API key pair generation from dashboard.

## How It Works

Secrets are saved on database after encrypted with a symmetric DEK (data encryption key).
There is one DEK per environment, and each DEK is saved on db after encrypted with the user's password.

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
