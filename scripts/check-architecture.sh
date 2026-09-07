#!/usr/bin/env bash
set -euo pipefail

# Architectural boundaries the README promises, checked rather than merely written down.

fail=0

report() {
  echo "$1"
  echo "$2"
  echo
  fail=1
}

# 1. Nothing outside src/api imports the generated client directly. Feature code imports
#    from src/api, which re-exports, so a contract reshape has one place to be absorbed.
generated=$(grep -rEn "from '[^']*api/generated" src \
  --include='*.ts' --include='*.tsx' \
  | grep -v '^src/api/' \
  || true)
if [ -n "$generated" ]; then
  report "Direct imports from src/api/generated outside src/api:" "$generated"
fi

# 2. No fetch outside src/api. Every request goes through the configured client, which is
#    where auth, problem+json and the 401/503 handling live.
fetches=$(grep -rEn '\b(fetch|XMLHttpRequest)\s*\(' src \
  --include='*.ts' --include='*.tsx' \
  | grep -v '^src/api/' \
  | grep -v '^src/lib/runtime-config.ts:' \
  | grep -v 'prefetch\|refetch' \
  || true)
if [ -n "$fetches" ]; then
  report "Network calls outside src/api (runtime-config.ts is allowed - it loads config.json before the client exists):" "$fetches"
fi

# 3. No hardcoded colours outside the token file. Tailwind utilities resolve to tokens, so
#    a literal here means a colour that will not follow the theme.
colours=$(grep -rEn '#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(' src \
  --include='*.tsx' --include='*.ts' \
  | grep -v '^src/api/generated/' \
  | grep -v '\.test\.' \
  || true)
if [ -n "$colours" ]; then
  report "Hardcoded colours outside src/design/tokens.css:" "$colours"
fi

if [ "$fail" -eq 0 ]; then
  echo "Architectural boundaries hold."
fi
exit "$fail"
