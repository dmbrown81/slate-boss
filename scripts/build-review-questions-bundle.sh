#!/usr/bin/env bash
# Builds docs/REVIEW_3_QUESTIONS_BUNDLE.md - a single self-contained file for
# handing to another model after the round-2 UX updates. It inlines the focused
# question brief plus every referenced source file under plain FILE markers.
# Re-run after changes: bash scripts/build-review-questions-bundle.sh
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="docs/REVIEW_3_QUESTIONS_BUNDLE.md"
BRIEF="docs/REVIEW_BRIEF_3_QUESTIONS.md"

# Order: focused brief, orientation docs, implementation handoff, current UI,
# persistence/theme, verification, then engine context last.
FILES=(
  "docs/GRIDIRON_HANDOFF.md"
  "docs/PROJECT_MAP.md"
  "docs/REVIEW_3_CODEX_HANDOFF.md"
  "README.md"
  "src/components/footballStyles.ts"
  "src/components/teamIdentity.ts"
  "src/components/coachIdentity.tsx"
  "src/components/FootballHome.tsx"
  "src/components/FootballTeamSelect.tsx"
  "src/components/FootballSeason.tsx"
  "src/components/FootballMatch.tsx"
  "src/components/FootballReward.tsx"
  "src/components/FootballRunSummary.tsx"
  "src/components/FootballHelpModal.tsx"
  "src/index.css"
  "src/lib/gridironStorage.ts"
  "src/lib/gridironEconomy.ts"
  "src/lib/gridironCalibration.ts"
  "scripts/gridironSmoke.tsx"
  "scripts/gridironBalance.ts"
  "src/lib/footballRun.ts"
  "src/lib/footballRogue.ts"
)

{
  echo "# Gridiron - post-update questions review bundle"
  echo
  echo "_Generated $(date -u +%Y-%m-%dT%H:%MZ) by scripts/build-review-questions-bundle.sh. This ONE file is self-contained: the focused review brief is first, then every referenced source file inline under \`===== FILE: <path> =====\` markers. You do not need the repo to review._"
  echo
  echo "---"
  echo
  echo "# PART 1 - REVIEW BRIEF (read this first; it is your prompt)"
  echo
  cat "$BRIEF"
  echo
  echo "---"
  echo
  echo "# PART 2 - SOURCE (every file referenced above, inline)"
  echo
  echo "> The brief's file list is satisfied below. Each file appears between \`===== FILE: <path> =====\` and \`===== END FILE =====\` markers, in priority order."
  echo
  for f in "${FILES[@]}"; do
    echo "===== FILE: ${f} ====="
    cat "$f"
    echo
    echo "===== END FILE: ${f} ====="
    echo
  done
} > "$OUT"

WORDS=$(wc -w < "$OUT" | tr -d ' ')
BYTES=$(wc -c < "$OUT" | tr -d ' ')
echo "Wrote $OUT  (${BYTES} bytes, ~${WORDS} words, ~$((WORDS * 4 / 3)) tokens rough)"
