#!/usr/bin/env bash
# Trae lo último de origin/main y muestra qué cambió en docs/. No toca main directamente.
set -u
cd "$(git rev-parse --show-toplevel)" || exit 1
bash scripts/setup.sh >/dev/null
if ! git fetch origin --prune; then
  echo "ERROR: git fetch falló (¿red/permisos?)." >&2; exit 1
fi
branch=$(git rev-parse --abbrev-ref HEAD)
base=$(git merge-base HEAD origin/main)
echo "== Rama actual: $branch =="
if [ "$base" != "$(git rev-parse origin/main)" ]; then
  echo "== Cambios nuevos en origin/main (docs/) =="
  git diff --stat "$base" origin/main -- docs/
  git log --format='%h %an: %s' "$base..origin/main" -- docs/
  if [ "$branch" = "main" ]; then
    git merge --ff-only origin/main
  else
    echo "Tu rama está desactualizada: ejecuta 'git rebase origin/main' (o merge) cuando te convenga."
  fi
else
  echo "Al día con origin/main."
fi
echo "== Lee docs/ en origin/main (puede diferir de tu rama) =="
git ls-tree -r --name-only origin/main docs | sort
echo "== PRs abiertos (contexto de lo que hacen los demás) =="
gh pr list --state open 2>/dev/null || echo "(gh no disponible)"
