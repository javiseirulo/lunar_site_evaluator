#!/usr/bin/env bash
# Configura el repo local: hooks compartidos (bloquea push a main).
cd "$(git rev-parse --show-toplevel)" || exit 1
git config core.hooksPath .githooks
echo "OK hooks activados (.githooks). Push directo a main bloqueado."
