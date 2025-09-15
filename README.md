# Secret Party 🎉

A self-hostable secrets manager with project/environment organization, encrypted storage, and API access.

## Features

- ✅ **Secure Encryption**: AES-256-GCM encryption with scrypt key derivation
- ✅ **Project Organization**: Organize secrets by projects and environments  
- ✅ **Web Dashboard**: Modern React-based UI for managing secrets
- ✅ **REST API**: Programmatic access with RSA key-based authentication
- ✅ **Password Protection**: All sensitive operations require password confirmation
- ✅ **Audit Logging**: Track all secret access and management operations
- ✅ **Self-Hosted**: Run on your own infrastructure
- ✅ **Single User**: Designed for personal or small team use

## Architecture

- **Frontend**: Tanstack Start (React) with Flow CSS
- **Backend**: Hono REST API integrated with Tanstack Start
- **Database**: PostgreSQL with Drizzle ORM (PGLite for local development)
- **Encryption**: @noble/ciphers for AES encryption, Web Crypto API for RSA
- **Authentication**: Session-based with password confirmation for sensitive ops

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd secret-party
```

2. Install dependencies:
```bash
pnpm install
```

3. Run database migrations:
```bash
pnpm drizzle-kit migrate
```

4. Start the development server:
```bash
pnpm dev
```

5. Open your browser to `http://localhost:3000`

### First-Time Setup

1. Navigate to `/signup` to create your account
2. After signup, you'll be redirected to the dashboard
3. Create your first project and environment
4. Add secrets to your environments

## Usage

### Web Dashboard

1. **Dashboard**: Overview of all projects, environments, and secrets
2. **Projects**: Create and manage projects 
3. **Environments**: Create environments within projects (dev, staging, prod, etc.)
4. **Secrets**: Add, view, edit, and delete encrypted secrets
5. **API Keys**: Generate RSA key pairs for programmatic access

### REST API

The API is available at `/api/v1/` and requires API key authentication:

**Authentication**: Include your public key as a base64-encoded bearer token:
```bash
curl -H "Authorization: Bearer $(echo -n 'your-public-key-pem' | base64)" \
  "http://localhost:3000/api/v1/secrets?project=1&environment=1"
```

**Available Endpoints**:
- `GET /api/v1/secrets` - List secret keys in environment
- `GET /api/v1/secret` - Get encrypted secret value
- `POST /api/v1/secret` - Create new secret
- `PUT /api/v1/secret` - Update existing secret
- `DELETE /api/v1/secret` - Delete secret

### Client-Side Decryption

For API access, secrets are returned encrypted. You need to:

1. Decrypt the DEK using your RSA private key
2. Use the DEK to decrypt the secret value with AES-256-GCM

Example with Node.js:
```javascript
import crypto from 'crypto';

// Decrypt DEK with your private key
const dek = crypto.privateDecrypt(privateKey, Buffer.from(encrypted_dek, 'base64'));

// Decrypt secret value with DEK
const decipher = crypto.createDecipherGCM('aes-256-gcm', dek);
// ... (implement AES-GCM decryption)
```

## Security

- **Encryption**: All secrets encrypted with AES-256-GCM
- **Key Management**: DEKs (Data Encryption Keys) encrypted with user passwords or RSA keys
- **Password Confirmation**: Required for all sensitive operations
- **Audit Logging**: All access and modifications logged
- **Input Validation**: Comprehensive validation with Zod schemas
- **Memory Safety**: Sensitive data cleared from memory after use
- **Session Management**: Secure session handling with expiration

## Database Schema

The application uses the following main tables:
- `user` - User accounts
- `session` - User sessions  
- `project` - Projects (owned by users)
- `environment` - Environments within projects
- `secret` - Encrypted secrets within environments
- `api_client` - API clients with public keys
- `environment_access` - API client access to environments

## Development

### Database Migrations

Create a new migration:
```bash
pnpm drizzle-kit generate
```

Apply migrations:
```bash
pnpm drizzle-kit migrate
```

### Building for Production

```bash
pnpm build
```

### Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (optional, defaults to PGLite)
- `NODE_ENV` - Set to `production` for production builds

## Deployment

1. Build the application: `pnpm build`
2. Set up PostgreSQL database
3. Run migrations: `pnpm drizzle-kit migrate`
4. Start the server: `pnpm start`

The application runs on port 3000 by default.

## Contributing

This project is designed for personal/small team use. Feel free to fork and modify for your needs.

## License

MIT License - see LICENSE file for details.

---

Built with ❤️ using modern web technologies for secure secret management.