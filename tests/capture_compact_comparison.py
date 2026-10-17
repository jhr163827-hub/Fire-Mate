"""Capture equal mobile viewports and measurable section heights for the compact pass.

The baseline is the immutable v3.5.6 commit, served separately in CI. Screenshots
use the same sample data on both origins and block network price requests.
"""
import json
import os
from datetime import date
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw

OUT = Path(os.environ.get("COMPACT_CAPTURE_DIR", "compact-comparison"))
BASELINE = os.environ.get("COMPACT_BASELINE_URL", "http://127.0.0.1:8001")
CURRENT = os.environ.get("FIRE_MATE_URL", "http://127.0.0.1:8000")
WIDTHS = (320, 360, 390, 430)
VIEWS = {"home": ("#homeAssetHero", ".fm-home-budget", ".fm-home-fire"),
         "assets": ("#view-assets>.hero", ".fm-asset-jump", "#fmAssetAccountsPanel"),
         "fire": ("#view-fire>.fm-fire-hero", ".fm-fire-calc-card", ".fm-fire-life-card")}
INIT = """(() => {
  const month = new Date().toLocaleDateString('sv-SE').slice(0,7);
  const saved = JSON.parse(localStorage.getItem('firemate_smart_v3') || '{}');
  saved.accounts = [{id:'sample',name:'투자 계좌',kind:'investment',amount:0,fire:true}];
  saved.holdings = [{id:'h1',accountId:'sample',type:'KRW',ticker:'AAA',name:'장기 투자',qty:10,price:120000,cost:100000}];
  saved.budgets = {[month]:1500000};
  saved.tx = [{id:'sample-tx',date:month+'-01',type:'expense',category:'식비',memo:'이번 달 식비',amount:850000}];
  localStorage.setItem('firemate_smart_v3', JSON.stringify(saved));
})()"""

def main():
    OUT.mkdir(exist_ok=True)
    measurements = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for theme in ("dark", "light"):
            for width in WIDTHS:
                for version, base in (("before", BASELINE), ("after", CURRENT)):
                    context = browser.new_context(viewport={"width": width, "height": 844},
                                                  is_mobile=True, has_touch=True,
                                                  service_workers="block")
                    context.route("**/*", lambda route: route.abort() if not route.request.url.startswith((BASELINE, CURRENT)) else route.continue_())
                    page = context.new_page()
                    page.add_init_script(INIT)
                    page.goto(base + "/index.html", wait_until="domcontentloaded")
                    page.evaluate("theme => { document.documentElement.dataset.theme=theme; localStorage.setItem('firemate_theme',theme) }", theme)
                    for view, sections in VIEWS.items():
                        if view != "home":
                            page.locator(f'.bottomnav [data-view="{view}"]').click()
                        page.wait_for_timeout(150)
                        metrics = page.evaluate("""({view,selectors}) => {
                            const root=document.getElementById('view-'+view),box=root.getBoundingClientRect();
                            return {contentHeight:Math.round(box.height), scrollHeight:document.documentElement.scrollHeight,
                              overflowX:document.documentElement.scrollWidth>innerWidth,
                              sections:selectors.map(selector=>{const e=document.querySelector(selector),r=e?.getBoundingClientRect();
                                return {selector,height:r?Math.round(r.height):null,bottom:r?Math.round(r.bottom):null}})};
                        }""", {"view":view,"selectors":sections})
                        filename=f"{view}-{width}-{theme}-{version}.png"
                        page.screenshot(path=str(OUT / filename), full_page=False)
                        measurements.append({"view":view,"width":width,"theme":theme,"version":version,
                                             "image":filename,**metrics})
                        if view == "assets" and version == "after":
                            for pane, button in (("holdings", "#fmAssetQuickHoldings"),
                                                 ("dividend", "#fmAssetQuickDividend"),
                                                 ("analysis", "#fmAssetQuickAnalysis")):
                                page.locator(button).click()
                                page.screenshot(path=str(OUT / f"assets-{pane}-{width}-{theme}.png"), full_page=False)
                            page.locator('#fmAssetQuickAccounts').click()
                    context.close()
        browser.close()
    (OUT / "measurements.json").write_text(json.dumps(measurements,ensure_ascii=False,indent=2))
    for theme in ("dark", "light"):
        for width in WIDTHS:
            for view in VIEWS:
                before=Image.open(OUT / f"{view}-{width}-{theme}-before.png").convert("RGB")
                after=Image.open(OUT / f"{view}-{width}-{theme}-after.png").convert("RGB")
                pair=Image.new("RGB",(width*2, before.height+28),"#202a30")
                pair.paste(before,(0,28));pair.paste(after,(width,28))
                labels=ImageDraw.Draw(pair)
                labels.text((8,7),"BEFORE  v3.5.6",fill="white")
                labels.text((width+8,7),"AFTER  compact",fill="white")
                pair.save(OUT / f"compare-{view}-{width}-{theme}.png")
    for view in VIEWS:
        for width in WIDTHS:
            old=next(x for x in measurements if (x['view'],x['width'],x['theme'],x['version'])==(view,width,'dark','before'))
            new=next(x for x in measurements if (x['view'],x['width'],x['theme'],x['version'])==(view,width,'dark','after'))
            print(f"{view} {width}px: content {old['contentHeight']} → {new['contentHeight']} px ({old['contentHeight']-new['contentHeight']:+} saved), horizontal overflow {new['overflowX']}")

if __name__ == "__main__":
    main()
