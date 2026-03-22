# Monorepo Guide

This document is the source of truth for how to add and run apps in `my-app`.

## Purpose

`my-app` is a Docker-first monorepo.

- The repository root is for orchestration, automation, and shared tooling.
- Individual applications live under `apps/`.
- Shared code lives under `packages/`.
- `Miyabi`, GitHub workflows, and skill-bus state stay at the repository root.

## Directory Rules

```text
my-app/
├── apps/
│   ├── web/
│   ├── admin/
│   └── api/
├── packages/
│   ├── ui/
│   └── shared-types/
├── docker/
├── scripts/
├── .claude/
├── .github/workflows/
└── package.json
```

### `apps/`

Put every independently deployable application here.

Examples:

- `apps/web`: public frontend
- `apps/admin`: internal admin console
- `apps/api`: backend API
- `apps/worker`: background job runner
- `apps/lp`: landing page

### `packages/`

Put reusable code here when it is shared by two or more apps.

Examples:

- `packages/ui`: shared UI components
- `packages/config-eslint`: shared lint config
- `packages/shared-types`: domain types
- `packages/sdk`: API client or internal SDK

## Naming Conventions

Every app should follow both rules:

1. Directory name: `apps/<name>`
2. Package name: `@my-app/<name>`

Example:

- Directory: `apps/admin`
- Package name: `@my-app/admin`

This matters because the root runner script resolves apps from those conventions:

- `apps/<name>` on disk
- `@my-app/<name>` in npm workspaces

See `scripts/run-app.sh` for the exact behavior.

## Required App Scripts

Each app workspace should expose at least these scripts:

- `dev`
- `build`
- `start`
- `lint`

The root scripts call those names through the workspace runner.

## Root Control Layer

The repository root stays responsible for:

- Docker
- npm workspaces
- `Miyabi`
- `agent-skill-bus`
- GitHub Actions
- shared repo documentation

That means app-specific framework files belong inside the app workspace, not at the root.

## Current Default App

Right now, the default app is `web`.

These root commands all target `apps/web` by default:

```bash
npm run dev
npm run build
npm run start
npm run lint
```

This default is defined in `package.json`.

## Running a Specific App

Use `APP_NAME` when you want a different app:

```bash
APP_NAME=admin npm run app:dev
APP_NAME=admin npm run app:build
APP_NAME=admin npm run app:lint
APP_NAME=api npm run app:start
```

The root helper will run the matching workspace scripts.

## Docker Workflow

### Default app

```bash
docker compose up web
```

This starts the default app service on port `3000`.

### One-off commands

```bash
docker compose run --rm workspace npm run lint
docker compose run --rm workspace npm run miyabi:status -- --json
docker compose run --rm -e APP_NAME=admin workspace npm run app:dev -- --hostname 0.0.0.0 --port 3001
```

### Why Docker first

- Keeps host machines cleaner
- Makes tool versions predictable
- Lets local sibling repos such as `Miyabi/` and `agent-skill-bus/` be mounted into the same environment

## How To Add a New App

### 1. Create the workspace

```text
apps/admin/
```

### 2. Add `package.json`

Example:

```json
{
  "name": "@my-app/admin",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint ."
  }
}
```

### 3. Add framework files inside that app

For a Next.js app:

```text
apps/admin/
├── app/
├── public/
├── package.json
├── tsconfig.json
├── next.config.ts
├── eslint.config.mjs
└── postcss.config.mjs
```

### 4. Reuse repo-wide TypeScript defaults

App `tsconfig.json` files should usually extend `tsconfig.base.json`.

Example:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### 5. Install dependencies from the repo root

```bash
npm install
```

### 6. Run it

```bash
APP_NAME=admin npm run app:dev
```

## Architecture Flexibility

Not every app has to use the same stack.

Examples:

- `apps/web`: Next.js + TypeScript + App Router
- `apps/admin`: Next.js + TypeScript + App Router
- `apps/api`: Fastify or Express
- `apps/worker`: Node.js worker

The only repo-level contract is that each app exposes the scripts the root runner expects.

## When To Use `packages/`

Create a shared package when:

- two apps need the same types
- two apps need the same validation logic
- two apps need the same UI system
- two apps need the same client SDK

Do not put app-specific code into `packages/`.

## Docker Service Pattern For Additional Apps

If an app becomes common enough to deserve its own service, add one to `docker-compose.yml`.

Example shape:

```yaml
admin:
  <<: *workspace-base
  environment:
    APP_NAME: admin
    APP_PORT: "3001"
  ports:
    - "3001:3001"
  command:
    - bash
    - -lc
    - npm run app:dev -- --hostname 0.0.0.0 --port 3001
```

## Operational Notes

- `Miyabi` runs at the repository root because it manages the repository, not one specific app.
- `agent-skill-bus` state is stored under `.skill-bus/` at the repository root.
- `gitnexus-stable-ops` is also repo-level tooling.

## Source Files

These files define the current monorepo behavior:

- `package.json`
- `scripts/run-app.sh`
- `docker-compose.yml`
- `tsconfig.base.json`
- `apps/web/package.json`
