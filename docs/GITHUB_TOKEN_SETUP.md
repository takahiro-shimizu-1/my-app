# GitHub Automation Token Setup

This repository can run in three modes:

1. Basic GitHub Actions with the built-in `GITHUB_TOKEN`
2. Projects V2 automation with `GH_PROJECT_TOKEN`
3. Autonomous code generation with `ANTHROPIC_API_KEY`

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

## 3. `ANTHROPIC_API_KEY`

GitHub-side autonomous agent execution needs:

- repository secret `ANTHROPIC_API_KEY`

If it is missing, `autonomous-agent.yml` comments on the issue and exits without failing the workflow.
