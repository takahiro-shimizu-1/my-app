#!/usr/bin/env bash
set -euo pipefail

stamp_file="node_modules/.install-lock.sha"
lock_dir="node_modules/.npm-bootstrap.lock"
current_hash="$(
  sha256sum package.json package-lock.json | sha256sum | awk '{print $1}'
)"

needs_install() {
  [[ ! -d node_modules ]] || [[ ! -f "$stamp_file" ]] || [[ "$(cat "$stamp_file")" != "$current_hash" ]]
}

if needs_install; then
  while ! mkdir "$lock_dir" 2>/dev/null; do
    sleep 1
  done
  trap 'rmdir "$lock_dir" 2>/dev/null || true' EXIT

  if needs_install; then
    npm ci
    mkdir -p node_modules
    printf '%s\n' "$current_hash" > "$stamp_file"
  fi
fi

if command -v git >/dev/null 2>&1; then
  git config --global --add safe.directory /workspace/my-app >/dev/null 2>&1 || true
fi

exec "$@"
