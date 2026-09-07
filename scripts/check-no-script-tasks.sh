#!/usr/bin/env bash
set -euo pipefail

# PROMPT 1.5: Briany never executes arbitrary code supplied through a process model. Script
# tasks and shell tasks are excluded at the product level, not by configuration, so there
# must be no authoring surface for either one anywhere in the source.
#
# Two files are allowed to name them, because naming them is their job:
#   - modeling/bpmn/constants.ts  the product invariant itself
#   - modeling/bpmn/lint/         the rules that flag an imported model containing one
#
# Test fixtures and their suites are allowed too: proving that such a model round-trips and
# lints is exactly what they are for.

PATTERN='scriptTask|ScriptTask|scriptFormat|"shell"|'"'"'shell'"'"''

matches=$(grep -rEn "$PATTERN" src \
  --include='*.ts' --include='*.tsx' \
  | grep -v '^src/modeling/bpmn/constants.ts:' \
  | grep -v '^src/modeling/bpmn/lint/' \
  | grep -v '\.test\.ts' \
  | grep -v '^src/api/generated/' \
  || true)

if [ -n "$matches" ]; then
  echo "A script or shell task authoring surface was found outside the files allowed to name one:"
  echo "$matches"
  echo
  echo "See PROMPT.md section 1.5 and src/modeling/bpmn/constants.ts."
  exit 1
fi

echo "No script or shell task authoring surface found."
