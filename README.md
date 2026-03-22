# my-app

Docker-first monorepo for building multiple apps under one Miyabi-managed repository.

## Structure

```text
my-app/
├── apps/
│   └── web/               # Current Next.js + TypeScript + App Router app
├── packages/              # Shared libraries for future apps
├── docker/                # Development image definition
├── scripts/               # Repo-level helpers
├── .claude/               # Miyabi / Claude operational config
├── .github/workflows/     # GitHub automation
├── CLAUDE.md              # Repo context for agents
└── package.json           # Monorepo entrypoint
```

Each app lives in its own workspace under `apps/`, so the stack can vary per app. Right now `apps/web` is a Next.js app, but future apps can be other Next.js apps or different runtimes as long as they expose `dev`, `build`, `start`, and `lint` scripts.

## Development

### Docker-first workflow

The repository is designed to run without installing project dependencies on your PC.

```bash
docker compose build
docker compose up web
```

This starts the default app at `http://localhost:3000`.

Open a shell inside the same toolchain:

```bash
docker compose run --rm workspace bash
```

From there you can run repo-level commands such as:

```bash
npm run miyabi:status
npm run miyabi:doctor
npm run asb:dashboard
```

The Docker setup mounts the parent `package/` directory so the local `Miyabi/` and `agent-skill-bus/` sibling repositories are available inside the container too.

### Host workflow

If you want to run from the host anyway, root scripts proxy to the default app:

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Running Other Apps Later

The root scripts are app-aware:

```bash
APP_NAME=web npm run app:dev
APP_NAME=web npm run app:build
APP_NAME=web npm run app:lint
```

When you add a new workspace such as `apps/admin`, the same commands work as long as that app has matching npm scripts.

## Adding a New App

1. Create a new workspace under `apps/<name>`.
2. Give it a package name like `@my-app/<name>`.
3. Add `dev`, `build`, `start`, and `lint` scripts in that app's `package.json`.
4. Run it with `APP_NAME=<name> npm run app:dev` or add a dedicated Docker service if it needs different ports or services.

## Miyabi and Tooling

Repo-level automation stays at the repository root:

- `Miyabi` manages GitHub workflows, labels, and agent orchestration.
- `agent-skill-bus` tracks skill health and queue state in `.skill-bus/`.
- `gitnexus-stable-ops` remains optional until the host or container can run a compatible `gitnexus-stable` binary.
