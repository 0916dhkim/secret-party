# Secret Party

Simple self-hostable secrets manager

## Features

- Organize your secrets by projects and environments (e.g. prod & staging)
  - Secrets are stored as key-value pairs.
  - No versioning.
- Public API for fetching secrets.
  - Endpoint: GET /api/v1/secret?project=<project-id>&environment=<environment-name>&key=<key>
  - API key generation from dashboard.

// does it need to be on cloud?
// self host is fine as long as i can backup

// Making my own
// - organize by projects / environments
// - auth / no sharing yet.
// - key + value pairs
// - no versioning
// - public api for fetching secrets GET /api/v1/secret?project=<id>&environment=<id>&key=<key>
// - public api key

Would it make sense to decrypt secrets on server-side?
I think the server is generally safer than the client.
Well, the client eventually reads all secret values.
That means we need to protect server.
Yeah, let's not encrypt the values.

- Client can read secrets plain text
- Server should not store secrets plain text. They should be encrypted.
- API key with revoke access

User

- id
- password_hash

Project

- id
- owner_id fk

Environment

- id
- project_id fk
- dek_wrapped_by_password

Secret

- key
- value_encrypted

EnvironmentAccess

- environment_id fk
- client_id fk
- dek_wrapped_by_client_public_key

ApiClient

- id
- name
- public_key
