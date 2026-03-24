# Engineering Notes

## Framework

- Backend: Koa (TypeScript)
- Frontend: Astro
- Runtime: Bun

## Architecture

- Layered backend structure:
  - `config` (environment and runtime config)
  - `lifecycle` (startup/shutdown for infra dependencies)
  - `db` (data access abstraction)
  - `services` (business logic)
  - `controller` (request handling)
  - `routes` (HTTP route registration)
  - `middleware` (cross-cutting concerns)
  - `auth` (security and permission logic)

## Tech Stack

- Language: TypeScript
- Database: SQLite (embedded file database)
- Cache / Session support: Redis
- Validation: Zod
- Auth: JWT + password hashing
- Lint / Format: ESLint + Prettier
