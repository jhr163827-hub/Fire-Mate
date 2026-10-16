#!/usr/bin/env python3
"""Read-only regression guard for the static FIRE MATE PWA."""
from pathlib import Path
import re

html = Path("index.html").read_text(encoding="utf-8")
sw = Path("sw.js").read_text(encoding="utf-8")
def require(condition, message):
    if not condition:
        raise SystemExit("FAIL: " + message)
    print("PASS:", message)

match = re.search(r"const BUILD='(fire-mate-v[0-9-]+)',VERSION='([0-9.]+)'", html)
cache = re.search(r"const CACHE='(fire-mate-v[0-9-]+)'", sw)
require(bool(match and cache), "PWA build/version/cache markers exist")
require(match.group(1) == cache.group(1), "App build and SW cache match")
require(match.group(1).removeprefix("fire-mate-v").replace("-", ".") == match.group(2), "Visible version matches build")
for identifier in ["view-home", "view-assets", "view-fire", "settingsOverlay", "fmDividendPanel", "fmManualUpdate"]:
    require(identifier in html, "UI marker " + identifier)
for marker in ["function persist()", "function fmValidateBackup(", "function fmBackupSelfTest()", "fmValidateBackup(JSON.parse(content))", "function renderAssets()", "function renderFire()", "localStorage.setItem(K,JSON.stringify(data))"]:
    require(marker in html, "Storage/function guard " + marker)
require("keys.filter(key=>key.startsWith('fire-mate-v')&&key!==CACHE)" in sw, "Old PWA caches are cleaned")
require("caches.match(req)" in sw, "Offline resource fallback remains")
require("id=\"fmCompositionMore\"" in html and "id=\"fmCompositionMoreList\"" in html, "Composition detail elements remain available")
require("표시돼요.</div>'const more=" not in html, "Known broken composition JavaScript cannot return")
require(len(html) > 100000, "Main app file has expected size")
print("PASS: static regression checks completed (not a browser end-to-end test)")
