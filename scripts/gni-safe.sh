#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GITNEXUS_BIN="${GITNEXUS_BIN:-$SCRIPT_DIR/../../gitnexus-stable-ops/bin/gitnexus-portable.sh}"

check_gitnexus_entrypoint() {
  if [[ ! -x "$GITNEXUS_BIN" ]]; then
    echo "GitNexus entrypoint not found at $GITNEXUS_BIN" >&2
    return 1
  fi
}

run_init() {
  check_gitnexus_entrypoint
  ALLOW_DIRTY_REINDEX=1 REPO_PATH="$REPO_ROOT" ../gitnexus-stable-ops/bin/gitnexus-auto-reindex.sh --force
}

run_doctor() {
  check_gitnexus_entrypoint
  ../gitnexus-stable-ops/bin/gitnexus-doctor.sh "$REPO_ROOT" my-app Home
}

run_reindex() {
  check_gitnexus_entrypoint
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
