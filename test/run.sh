#!/bin/bash
# ARMP headless test runner — uses system JavaScriptCore (no Node required).
# Usage:
#   bash test/run.sh                 # run every test/*.js (except harness/_appbundle)
#   bash test/run.sh phase2_2B       # run a single test by name
set -e
JSC="${JSC:-/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc}"
cd "$(dirname "$0")/.."   # project root (so app.html resolves)

if [ ! -x "$JSC" ]; then echo "jsc not found at $JSC"; exit 1; fi

run_one() {
  local f="$1"
  echo "════════════════════════════════════════════════════════════"
  echo "▶ $f"
  "$JSC" test/harness.js "$f" 2>&1 | grep -v "armpCfgLoad\|^AR Match Pro v"
}

if [ -n "$1" ]; then
  run_one "test/$1.js"
else
  for f in test/smoke.js test/phase2_2B.js $(ls test/phase3*.js 2>/dev/null); do
    run_one "$f"
  done
fi
