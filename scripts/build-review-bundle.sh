#!/usr/bin/env bash
# Builds docs/REVIEW_BUNDLE.md — a single self-contained file for handing to an
# outside model when you can only upload one attachment. It inlines the review
# brief plus every file the brief references, separated by plain-text FILE
# markers (no markdown fences, so embedded ``` blocks in the .md files survive).
# Re-run after changes:  bash scripts/build-review-bundle.sh
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="docs/REVIEW_BUNDLE.md"

# Order: brief, orientation docs, presentation + screens, motion, verification,
# then the engine last (context only). If a model truncates, the UX-critical
# material is up top.
FILES=(
  "docs/GRIDIRON_HANDOFF.md"
  "docs/PROJECT_MAP.md"
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
  echo "# Gridiron — single-file review bundle"
  echo
  echo "_Generated $(date -u +%Y-%m-%dT%H:%MZ) by scripts/build-review-bundle.sh. This ONE file is self-contained: the review brief is first, then every referenced source file inline under \`===== FILE: <path> =====\` markers. You do not need the repo to review._"
  echo
  echo "---"
  echo
  echo "# PART 1 — REVIEW BRIEF (read this first; it is your prompt)"
  echo
  cat "docs/REVIEW_BRIEF_2.md"
  echo
  echo "---"
  echo
  echo "# PART 2 — SOURCE (every file referenced above, inline)"
  echo
  echo "> The brief's \"Files to attach\" list is satisfied below — each file appears between \`===== FILE: <path> =====\` and \`===== END FILE =====\` markers, in priority order (UX-critical first, engine last)."
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
