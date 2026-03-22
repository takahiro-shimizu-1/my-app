#!/usr/bin/env bash
set -euo pipefail

# Reuse the authenticated GitHub CLI token when Miyabi subcommands
# require env-based authentication but no explicit token is set.
if [[ -z "${GITHUB_TOKEN:-}" && -z "${GH_TOKEN:-}" ]] && command -v gh >/dev/null 2>&1; then
  export GH_TOKEN="$(gh auth token)"
fi

exec npx miyabi "$@"
