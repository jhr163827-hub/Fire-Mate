#!/usr/bin/env python3
"""Read-only regression guard for the static FIRE MATE PWA."""
from pathlib import Path
import re

page = Path("index.html").read_text(encoding="utf-8")
# Local ./js files are part of the app; markers may live in either.
html = re.sub(r'<script src="\./(js/[\w-]+\.js)\?v=[\d.]+"></script>', lambda m: "<script>" + Path(m.group(1)).read_text(encoding="utf-8") + "</script>", page)
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
require(page.rstrip().endswith("</body></html>"), "HTML ends cleanly without trailing code")
require(html.count("</body></html>") == 1, "Only one HTML document exists")
require(html.count('<script id="fm-pwa-updates">') == 1, "Only one PWA update handler exists")
require(html.count("// ===== fm-layout ") == 1, "Only one layout script exists")
require(len(re.findall(r"<script\b", html)) == len(re.findall(r"</script>", html)), "Script tags are balanced")
require(len(re.findall(r"<style\b", html)) == len(re.findall(r"</style>", html)), "Style tags are balanced")
require("const fmtUnitPrice=n=>" in html and "const metrics=[['보유 수량'" in html, "Holding price metrics are intact")
require(len(page) > 100000, "Main app file has expected size (the worker rejects smaller pages)")
# Styles live in app.css; the link and the worker's precache must name the same build.
version = re.search(r"VERSION='([0-9.]+)'", html).group(1)
sw = (ROOT / "sw.js").read_text(encoding="utf-8") if "ROOT" in globals() else open("sw.js", encoding="utf-8").read()
require(html.count('<link rel="stylesheet" href="./app.css?v=' + version + '">') == 1, "app.css link carries the app version")
require("'./app.css?v=" + version + "'" in sw, "Service worker precaches the same app.css")
for js in re.findall(r'<script src="\./(js/[\w-]+\.js)\?v=([\d.]+)"></script>', page):
    require(js[1] == version and "'./" + js[0] + "?v=" + version + "'" in sw, js[0] + " carries the app version and is precached")
css = open("app.css", encoding="utf-8").read()
require(css.count("{") == css.count("}") and len(css) > 100000, "app.css is complete")
# Ratchet: the app must not grow new add-on blocks (see CLAUDE.md).
import json
budget = json.load(open("scripts/code_budget.json", encoding="utf-8"))
scripts_n, styles_n = len(re.findall(r"<script\b", page)), len(re.findall(r"<style\b", page))
size = len(page.encode("utf-8"))
js_size = sum(p.stat().st_size for p in Path("js").glob("*.js"))
blocks_n = Path("js/features.js").read_text(encoding="utf-8").count("\n// ===== ")
require(blocks_n <= budget["feature_blocks"], f"js/features.js blocks {blocks_n} <= {budget['feature_blocks']}")
require(js_size <= budget["js_bytes"], f"js/*.js size {js_size} <= {budget['js_bytes']} bytes")
important_n = css.count("!important")
require(scripts_n <= budget["index_script_blocks"], f"index.html script blocks {scripts_n} <= {budget['index_script_blocks']}")
require(styles_n <= budget["index_style_blocks"], f"index.html style blocks {styles_n} <= {budget['index_style_blocks']}")
require(size + js_size <= budget["app_code_bytes"], f"index.html + js size {size + js_size} <= {budget['app_code_bytes']} bytes")
require(important_n <= budget["app_css_important"], f"app.css !important {important_n} <= {budget['app_css_important']}")
print("PASS: static regression checks completed (not a browser end-to-end test)")
