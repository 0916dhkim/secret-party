# Contributing

## Development

Requirements: Node.js 24+ and corepack

Clone this repo, `pnpm install` then `pnpm dev`.
No need to set environment variables.

## Structure

The main app is built with Tanstack Start. It is a fullstack web app for admin dashboard.

The public API is built with hono and embedded as a Tanstack `createServerFileRoute`.

Drizzle is the ORM for both the main app and the public API server. It connects to a PostgreSQL db on prod and in-memory PGlite on local.
