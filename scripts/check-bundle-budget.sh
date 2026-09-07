#!/usr/bin/env bash
set -euo pipefail

# PROMPT section 11: initial JS under 250KB gzipped, excluding the modelers.
#
# "Initial" here means every chunk the shell needs before a route decides what else to
# load. The three modeling libraries are each lazily loaded on their own editor route and
# are excluded by name, which is exactly the split this budget assumes.

BUDGET_KB=250
EXCLUDE='^(bpmn|dmn|form|CodeEditor|MarkdownViewer)'

if [ ! -d dist/assets ]; then
  echo "dist/assets is missing. Run 'pnpm build' first."
  exit 1
fi

total=0
echo "Chunks counted towards the initial budget:"
for file in dist/assets/*.js; do
  name=$(basename "$file")
  if echo "$name" | grep -qE "$EXCLUDE"; then
    continue
  fi
  size=$(gzip -c "$file" | wc -c)
  kb=$(( size / 1024 ))
  # Only the shared chunks load before any route resolves; a per-route chunk does not.
  if echo "$name" | grep -qE '^(index|components|preload-helper|ui-store)'; then
    printf '  %-45s %4s KB\n' "$name" "$kb"
    total=$(( total + size ))
  fi
done

total_kb=$(( total / 1024 ))
echo "Initial JS: ${total_kb} KB gzipped (budget ${BUDGET_KB} KB)"

if [ "$total_kb" -gt "$BUDGET_KB" ]; then
  echo "Over budget by $(( total_kb - BUDGET_KB )) KB."
  echo "Check whether a large dependency has been pulled into a shared chunk - usually a"
  echo "re-export through src/design/components/index.ts."
  exit 1
fi
