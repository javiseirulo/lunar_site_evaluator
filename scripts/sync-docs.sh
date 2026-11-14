#!/usr/bin/env bash
# Trae lo último del repo y lista qué cambió en docs/ desde el último pull.
set -u
cd "$(git rev-parse --show-toplevel)" || exit 1
before=$(git rev-parse HEAD 2>/dev/null || echo "")
if ! git pull --rebase --autostash; then
  echo "ERROR: git pull falló. Resuelve conflictos o revisa la red." >&2
  exit 1
fi
after=$(git rev-parse HEAD 2>/dev/null || echo "")
if [ -n "$before" ] && [ "$before" != "$after" ]; then
  echo "== Cambios nuevos en docs/ =="
  git diff --stat "$before" "$after" -- docs/
  git log --format='%h %an: %s' "$before..$after" -- docs/
else
  echo "docs/ ya estaba al día."
fi
echo "== Archivos en docs/ =="
find docs -type f -name '*.md' | sort
