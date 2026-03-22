# my-app

Docker-first single-application repository with Miyabi, agent-skill-bus, and optional gitnexus-stable-ops support.

Repo architecture and setup rules live in `docs/repo-guide.md`.

## Structure

```text
my-app/
├── app/                   # Next.js + TypeScript + App Router app
├── public/                # Static assets
├── docker/                # Development image definition
├── scripts/               # Repo-level helpers
├── .claude/               # Miyabi / Claude operational config
├── .github/workflows/     # GitHub automation
├── CLAUDE.md              # Repo context for agents
└── package.json           # Monorepo entrypoint
```

This repository is for one application only. If you start another product, create another repository next to this one and apply the same tooling there.

## Development

### Docker-first workflow

The repository is designed to run without installing project dependencies on your PC.

```bash
docker compose build
docker compose up app
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

The Docker setup mounts the parent `package/` directory so the local `Miyabi/`, `agent-skill-bus/`, and `gitnexus-stable-ops/` sibling repositories are available inside the container too.

### Host workflow

If you want to run from the host anyway, the root scripts directly operate on this app:

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Creating Another App

If you need another independent app:

1. create a new sibling directory such as `/home/shimizu/study/AI/hayashi/package/app-b`
2. create a new GitHub repository for that app
3. copy this repository structure or bootstrap a new app and apply `Miyabi` there
4. keep its `.claude/`, `.skill-bus/`, `.gitnexus/`, Issues, PRs, and workflows separate

For the full conventions and examples, see `docs/repo-guide.md`.

## Miyabi and Tooling

Repo-level automation stays at the repository root:

- `Miyabi` manages GitHub workflows, labels, and agent orchestration for this repository.
- `agent-skill-bus` tracks skill health and queue state in `.skill-bus/`.
- `gitnexus-stable-ops` remains optional until the host or container can run a compatible `gitnexus-stable` binary.
