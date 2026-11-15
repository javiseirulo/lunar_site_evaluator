#!/usr/bin/env bash
# Trae lo último de la rama de integración (origin/dev, o origin/main si no existe) y muestra qué cambió en docs/.
set -u
cd "$(git rev-parse --show-toplevel)" || exit 1
bash scripts/setup.sh >/dev/null
if ! git fetch origin --prune; then
  echo "ERROR: git fetch falló (¿red/permisos?)." >&2; exit 1
fi
branch=$(git rev-parse --abbrev-ref HEAD)
if git rev-parse --verify -q origin/dev >/dev/null; then int=dev; else int=main; fi
base=$(git merge-base HEAD origin/$int)
echo "== Rama actual: $branch =="
if [ "$base" != "$(git rev-parse origin/$int)" ]; then
  echo "== Cambios nuevos en origin/$int (docs/) =="
  git diff --stat "$base" origin/$int -- docs/
  git log --format='%h %an: %s' "$base..origin/$int" -- docs/
  if [ "$branch" = "$int" ]; then
    git merge --ff-only origin/$int
  else
    echo "Tu rama está desactualizada: ejecuta 'git rebase origin/$int' (o merge) cuando te convenga."
  fi
else
  echo "Al día con origin/$int."
fi
echo "== Lee docs/ en origin/$int (puede diferir de tu rama) =="
git ls-tree -r --name-only origin/$int docs | sort
echo "== PRs abiertos (contexto de lo que hacen los demás) =="
gh pr list --state open 2>/dev/null || echo "(gh no disponible)"
