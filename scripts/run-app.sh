#!/usr/bin/env bash
set -euo pipefail

app_name="${APP_NAME:-${1:-web}}"
if [[ -z "${APP_NAME:-}" && $# -gt 0 ]]; then
  shift
fi

script_name="${APP_SCRIPT:-${1:-dev}}"
if [[ -z "${APP_SCRIPT:-}" && $# -gt 0 ]]; then
  shift
fi

workspace_dir="apps/$app_name"
workspace_name="@my-app/$app_name"

if [[ ! -d "$workspace_dir" ]]; then
  echo "Unknown app workspace: $workspace_dir" >&2
  exit 1
fi

if [[ $# -gt 0 && "$1" == "--" ]]; then
  shift
fi

exec npm --workspace "$workspace_name" run "$script_name" -- "$@"
