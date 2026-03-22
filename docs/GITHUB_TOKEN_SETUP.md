# GitHub Automation Token Setup

This repository can run in three modes:

1. Basic GitHub Actions with the built-in `GITHUB_TOKEN`
2. Projects V2 automation with `GH_PROJECT_TOKEN`
3. Autonomous code generation on a self-hosted PC runner with local Claude Code login

## 1. Built-in `GITHUB_TOKEN`

GitHub Actions injects this automatically. It is enough for:

- label automation
- issue / PR comments
- weekly report issues
- dashboard fallback data generation

## 2. `GH_PROJECT_TOKEN`

Projects V2 sync and status updates need a Personal Access Token with:

- `repo`
- `read:project`
- `project`

Configure it as a repository secret named `GH_PROJECT_TOKEN`.

Optional:

- set repository variable `PROJECT_NUMBER`

If `GH_PROJECT_TOKEN` is missing, project-related workflows skip gracefully.

## 3. Self-hosted Claude Code runner

`autonomous-agent.yml` now targets a self-hosted runner labeled `my-app-local`.

That runner needs:

- `claude auth login` completed on the PC that runs the job
- GitHub Actions runner installed and online for this repository

It does not need `ANTHROPIC_API_KEY` in the repository secrets when you use the local PC runner.
