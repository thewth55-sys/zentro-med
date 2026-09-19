#!/usr/bin/env bash
# Bakes .claude/qwen-lessons.md as a permanent SYSTEM prompt into a
# new Ollama model tag, so it applies no matter who/what calls it
# (Claude's delegate script, the Qwen Code VS Code extension, a raw
# curl) — not just when the caller remembers to inject it manually.
#
# Run this ON THE VPS where Ollama serves qwen2.5-coder:14b, from
# inside a copy of this repo (or after copying just
# .claude/qwen-lessons.md over). It does not touch anything outside
# Ollama's own model store.
#
# Usage:
#   ./bake-qwen-model.sh [base_model] [new_tag]
# Defaults: base_model=qwen2.5-coder:14b, new_tag=qwen2.5-coder-zentro

set -euo pipefail

BASE_MODEL="${1:-qwen2.5-coder:14b}"
NEW_TAG="${2:-qwen2.5-coder-zentro}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LESSONS_FILE="${SCRIPT_DIR}/qwen-lessons.md"

if ! command -v ollama >/dev/null 2>&1; then
  echo "Error: 'ollama' no está en PATH en esta máquina. Corre este script en el VPS donde vive Ollama." >&2
  exit 1
fi

if [ ! -f "$LESSONS_FILE" ]; then
  echo "Error: no encontré $LESSONS_FILE — corre este script desde .claude/ de una copia del repo, o copia qwen-lessons.md junto a este script." >&2
  exit 1
fi

if ! ollama list | awk '{print $1}' | grep -qx "$BASE_MODEL"; then
  echo "Aviso: '$BASE_MODEL' no aparece en 'ollama list'. ¿Seguro que es el tag correcto? Continuando de todos modos..." >&2
fi

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

MODELFILE="${WORKDIR}/Modelfile"
{
  echo "FROM ${BASE_MODEL}"
  echo
  echo 'SYSTEM """'
  # Triple-quote-safe: strip any literal '"""' from the lessons file
  # so it can't prematurely close the SYSTEM block.
  sed 's/"""/'"'"''"'"''"'"'/g' "$LESSONS_FILE"
  echo '"""'
} > "$MODELFILE"

echo "Modelfile generado en $MODELFILE (base: $BASE_MODEL → nuevo tag: $NEW_TAG)"
echo "--- primeras líneas ---"
head -5 "$MODELFILE"
echo "..."
echo

ollama create "$NEW_TAG" -f "$MODELFILE"

echo
echo "Listo. Modelo horneado como '$NEW_TAG'."
echo "Para probarlo:"
echo "  ollama run $NEW_TAG \"¿Qué hace requireRole y qué NO recibe como argumento?\""
echo
echo "Para usarlo vía la API OpenAI-compatible (/v1/chat/completions), usa"
echo "\"model\": \"$NEW_TAG\" en vez de \"$BASE_MODEL\" — el SYSTEM prompt ya"
echo "va incluido automáticamente en cada llamada, no hace falta mandarlo tú."
echo
echo "Cada vez que .claude/qwen-lessons.md crezca con una lección nueva,"
echo "vuelve a correr este script para re-hornear el modelo con la versión"
echo "actualizada (ollama create sobrescribe el tag existente)."
