#!/usr/bin/env bash
# Nieuwe versie uitbrengen.
#   1. Zet een regel "- X.Y.Z: ..." bovenaan "## Wijzigingen" in README.md en commit je werk.
#   2. scripts/release.sh X.Y.Z
# Het script zet het versienummer in manifest.json, commit en pusht naar main. GitHub Actions
# ziet het nieuwe versienummer en maakt zelf de tag, de zip en de release.
# Geïnstalleerde extensies zien de update binnen 6 uur.
set -euo pipefail
cd "$(dirname "$0")/.."

V="${1:?Gebruik: scripts/release.sh X.Y.Z}"
[[ "$V" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "Ongeldige versie: $V (verwacht X.Y.Z)"; exit 1; }
[ "$(git rev-parse --abbrev-ref HEAD)" = "main" ] || { echo "Breng een release uit vanaf main."; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "Er zijn niet-gecommitte wijzigingen. Commit die eerst."; exit 1; }
grep -qE "^- ${V//./\\.}:" README.md || { echo "Voeg eerst een regel '- $V: ...' toe onder '## Wijzigingen' in README.md."; exit 1; }

# sed -i.bak werkt op macOS en Linux.
sed -i.bak -E "s/\"version\": \"[0-9.]+\"/\"version\": \"$V\"/" manifest.json && rm manifest.json.bak

git add manifest.json
git commit -q -m "Versie $V" || { echo "manifest.json stond al op $V; er wordt alleen gepusht."; }
git push -q origin main
echo "Gepusht. GitHub Actions maakt release v$V: https://github.com/mark-jg/simulise-docent/actions"
