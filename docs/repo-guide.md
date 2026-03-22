# Repository Guide

This document is the source of truth for how `my-app` is structured.

## Core Rule

One application per repository.

- one app
- one GitHub repository
- one issue tracker
- one pull request flow
- one Miyabi setup
- one skill-bus state
- one GitNexus index

If you create another product, create another sibling repository instead of adding it inside this one.

## Directory Layout

```text
my-app/
├── app/                   # Next.js App Router source
├── public/                # Static assets
├── docker/                # Docker image definition
├── scripts/               # Local helper scripts
├── .claude/               # Miyabi / Claude operational files
├── .github/workflows/     # GitHub automation
├── .skill-bus/            # Runtime state for agent-skill-bus
├── CLAUDE.md              # AI context for this repository
├── package.json           # App scripts and dependencies
└── docker-compose.yml     # Local development entrypoint
```

## What Stays Common Across Repositories

The following tools are common in concept, but each app repository gets its own copy of the setup:

- `Miyabi`
- `agent-skill-bus`
- `gitnexus-stable-ops`
- Docker-based development

Common means "same pattern", not "same repository".

## What Must Stay Independent

Each application repository should keep these isolated:

- source code
- GitHub Issues
- pull requests
- workflows
- `.claude/`
- `.skill-bus/`
- `.gitnexus/`
- environment variables
- deployment pipeline

## Local Parent Layout

Recommended parent directory layout:

```text
/home/shimizu/study/AI/hayashi/package/
├── Miyabi/
├── agent-skill-bus/
├── gitnexus-stable-ops/
├── my-app/
├── app-b/
└── app-c/
```

Each app directory above should be its own Git repository.

## Development Workflow

### Docker first

```bash
docker compose build
docker compose up app
```

### Shell inside the toolchain

```bash
docker compose run --rm workspace bash
```

### App commands

```bash
npm run dev
npm run build
npm run lint
npm run start
```

### Miyabi commands

```bash
npm run miyabi:doctor
npm run miyabi:status -- --json
npm run miyabi:cycle
```

## Autonomous Local Runner

The `autonomous-agent.yml` workflow executes issue-driven agents on a
self-hosted PC runner labeled **`my-app-local`**.

Requirements for the runner machine:

- GitHub Actions self-hosted runner registered with the labels
  `self-hosted`, `linux`, `x64`, and `my-app-local`.
- Claude Code installed and authenticated via `claude auth login`
  (no `ANTHROPIC_API_KEY` secret needed).
- Node.js and Docker available in `$PATH`.

Because the runner uses a local Claude Code login, agent jobs work without
storing an Anthropic API key in GitHub secrets.

## Creating a New App Repository

When a new app is needed:

1. Create a new sibling directory.
2. Initialize it as a separate Git repository.
3. Create its own GitHub repository.
4. Bootstrap the app inside that repository.
5. Apply the same Miyabi, skill-bus, Docker, and GitNexus pattern there.

Example:

```text
/home/shimizu/study/AI/hayashi/package/app-b
```

## Current Stack

This repository currently uses:

- Next.js
- TypeScript
- App Router
- Docker-first local development

If a future app needs a different stack, it should live in a different repository with its own setup.
