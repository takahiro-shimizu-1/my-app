#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GITNEXUS_BIN="${GITNEXUS_BIN:-$HOME/.local/bin/gitnexus-stable}"

detect_gitnexus_root() {
  local resolved
  resolved="$(readlink -f "$GITNEXUS_BIN" 2>/dev/null || true)"
  if [[ -z "$resolved" ]]; then
    return 1
  fi

  cd "$(dirname "$resolved")/../.." >/dev/null 2>&1 && pwd
}

check_native_runtime() {
  local root
  local core_path=""
  root="$(detect_gitnexus_root)" || {
    echo "GitNexus binary not found at $GITNEXUS_BIN" >&2
    return 1
  }

  if [[ -d "$root/node_modules/@ladybugdb/core" ]]; then
    core_path="$root/node_modules/@ladybugdb/core"
  elif [[ -d "$(dirname "$root")/@ladybugdb/core" ]]; then
    core_path="$(dirname "$root")/@ladybugdb/core"
  fi

  if [[ -z "$core_path" ]]; then
    return 0
  fi

  local check_script
  check_script="require('${core_path}')"
  if ! node -e "$check_script" >/tmp/gni-safe-check.log 2>&1; then
    cat >&2 <<EOF
GitNexus native runtime is not compatible with this host.

Detected binary: $GITNEXUS_BIN
Detected package root: $root

The currently installed GitNexus build requires a newer system runtime than this machine provides.
Typical symptom:
  GLIBC_2.38 not found

Current host:
  $(ldd --version | head -n 1)

Raw loader error:
$(cat /tmp/gni-safe-check.log)

Action needed:
  1. Install a GitNexus build compatible with GLIBC 2.35, or
  2. Run GitNexus inside a newer container / host environment.
EOF
    return 1
  fi
}

run_init() {
  check_native_runtime
  ALLOW_DIRTY_REINDEX=1 REPO_PATH="$REPO_ROOT" ../gitnexus-stable-ops/bin/gitnexus-auto-reindex.sh --force
}

run_doctor() {
  check_native_runtime
  ../gitnexus-stable-ops/bin/gitnexus-doctor.sh "$REPO_ROOT" my-app Page
}

run_reindex() {
  check_native_runtime
  REPO_PATH="$REPO_ROOT" ../gitnexus-stable-ops/bin/gitnexus-auto-reindex.sh
}

case "${1:-}" in
  init)
    run_init
    ;;
  doctor)
    run_doctor
    ;;
  reindex)
    run_reindex
    ;;
  *)
    echo "Usage: ./scripts/gni-safe.sh <init|doctor|reindex>" >&2
    exit 1
    ;;
esac
