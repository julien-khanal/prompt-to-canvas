#!/usr/bin/env bash
# Sync prompt-canvas Cowork skill files from this repo into Claude Cowork's
# skills-plugin directory. Idempotent. Cleans up the common drag-and-drop
# mistake where SKILL-ops.md ends up inside prompt-canvas-control/.
#
# Usage:
#   ./scripts/sync-cowork-skills.sh
#
# Run after editing cowork-skill/SKILL.md or cowork-skill/SKILL-ops.md.
# After running, restart any active Cowork session to pick up the changes.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_BRIDGE="$REPO_ROOT/cowork-skill/SKILL.md"
SRC_OPS="$REPO_ROOT/cowork-skill/SKILL-ops.md"
COWORK_BASE="$HOME/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin"

if [ ! -f "$SRC_BRIDGE" ] || [ ! -f "$SRC_OPS" ]; then
  echo "✗ Source files missing. Run from repo root or check cowork-skill/."
  exit 1
fi

if [ ! -d "$COWORK_BASE" ]; then
  echo "✗ Cowork skills-plugin directory not found:"
  echo "  $COWORK_BASE"
  echo "  Has Cowork ever been opened on this Mac with skills installed?"
  exit 1
fi

# Find every prompt-canvas-control / prompt-canvas-ops folder beneath the
# skills-plugin tree. There can be multiple if the user has more than one
# Cowork install (rare, but harmless to handle). Portable: macOS ships bash
# 3.2 without `mapfile`, so we use a NUL-delimited while-read loop.

UPDATED=0

while IFS= read -r -d '' dir; do
  cp "$SRC_BRIDGE" "$dir/SKILL.md"
  echo "✓ $dir/SKILL.md ($(wc -l <"$dir/SKILL.md" | tr -d ' ') lines)"
  if [ -f "$dir/SKILL-ops.md" ]; then
    rm "$dir/SKILL-ops.md"
    echo "  · removed misplaced SKILL-ops.md"
  fi
  UPDATED=$((UPDATED + 1))
done < <(find "$COWORK_BASE" -type d -name prompt-canvas-control -print0 2>/dev/null)

while IFS= read -r -d '' dir; do
  cp "$SRC_OPS" "$dir/SKILL.md"
  echo "✓ $dir/SKILL.md ($(wc -l <"$dir/SKILL.md" | tr -d ' ') lines)"
  UPDATED=$((UPDATED + 1))
done < <(find "$COWORK_BASE" -type d -name prompt-canvas-ops -print0 2>/dev/null)

if [ "$UPDATED" -eq 0 ]; then
  echo "✗ No prompt-canvas-* skill folders found under:"
  echo "  $COWORK_BASE"
  echo "  Drag SKILL.md / SKILL-ops.md into Cowork's Skills UI once first."
  exit 1
fi

echo
echo "Done — $UPDATED Cowork skill file(s) synced."
echo "If a Cowork session is open, start a new chat to load the updates."
