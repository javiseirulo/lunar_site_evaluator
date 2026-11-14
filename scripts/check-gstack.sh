#!/usr/bin/env bash
# Comprueba que gstack está instalado. Salida: OK / MISSING.
set -u
found=""
for d in "$HOME/.claude/skills/gstack" "$HOME/.claude/skills/office-hours" ".claude/skills/gstack"; do
  [ -d "$d" ] && found="$d" && break
done
if [ -n "$found" ]; then
  echo "OK gstack encontrado en $found"
  exit 0
fi
echo "MISSING gstack no está instalado."
echo "Pide al usuario instalarlo (ver docs/06-gstack-workflow.md) antes de continuar."
exit 1
