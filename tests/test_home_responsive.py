"""FIRE MATE home responsive regression checks.
Run: pip install playwright && python -m playwright install chromium
     FIRE_MATE_URL=http://localhost:8000 python tests/test_home_responsive.py
Start a local server with: python -m http.server 8000
"""
import os
import unittest
from playwright.sync_api import sync_playwright

URL = os.environ.get("FIRE_MATE_URL", "http://localhost:8000")
WIDTHS = [320, 360, 375, 390, 430, 768, 1024]
HEIGHTS = [568, 670, 720, 844]

class HomeResponsiveTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.p = sync_playwright().start()
        chromium_path = os.environ.get("PLAYWRIGHT_CHROMIUM_PATH")
        cls.browser = cls.p.chromium.launch(
            executable_path=chromium_path if chromium_path else None
        )

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.p.stop()

    def test_home_layouts(self):
        for width in WIDTHS:
            for height in HEIGHTS:
                with self.subTest(width=width, height=height):
                    page = self.browser.new_page(viewport={"width": width, "height": height}, is_mobile=True, has_touch=True)
                    try:
                        page.goto(URL, wait_until="domcontentloaded")
                        page.locator('.bottomnav [data-view="home"]').click()
                        page.wait_for_timeout(150)
                        self.assertTrue(page.locator("#view-home").is_visible())
                        nav = page.locator(".bottomnav")
                        self.assertTrue(nav.is_visible())
                        self.assertLessEqual(nav.bounding_box()["y"] + nav.bounding_box()["height"], height + 2)
                        self.assertGreaterEqual(nav.bounding_box()["y"], -2)
                        hero = page.locator("#homeAssetHero")
                        self.assertLessEqual(hero.bounding_box()["x"] + hero.bounding_box()["width"], width + 2)

                        dimensions = page.evaluate("""() => ({
                            scrollWidth: document.documentElement.scrollWidth,
                            viewportWidth: document.documentElement.clientWidth,
                            scrollHeight: document.documentElement.scrollHeight,
                            viewportHeight: window.innerHeight
                        })""")
                        self.assertLessEqual(dimensions["scrollWidth"], dimensions["viewportWidth"] + 2)
                        self.assertGreaterEqual(dimensions["scrollHeight"], dimensions["viewportHeight"])
                        page.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)")
                        if dimensions["scrollHeight"] > dimensions["viewportHeight"] + 4:
                            self.assertGreater(page.evaluate("window.scrollY"), 0,
                                               "Page has content below fold but cannot scroll")
                    finally:
                        page.close()

    def test_home_progress_and_activity_computed_styles(self):
        # Check the actual cascade across narrow mobile widths and short/tall heights.
        for width in [320, 360, 375, 390, 430]:
            for height in HEIGHTS:
                with self.subTest(width=width, height=height):
                    page = self.browser.new_page(viewport={"width": width, "height": height},
                                                 is_mobile=True, has_touch=True)
                    try:
                        page.goto(URL, wait_until="domcontentloaded")
                        page.locator('.bottomnav [data-view="home"]').click()
                        page.wait_for_timeout(100)
                        computed = page.evaluate("""() => {
                            const progress = document.querySelector('#homeAssetPercent');
                            const activity = document.querySelector('#fmHomeActivity');
                            const pct = getComputedStyle(progress);
                            const act = getComputedStyle(activity);
                            const box = activity.getBoundingClientRect();
                            return {
                                progressSize: parseFloat(pct.fontSize),
                                progressVisible: pct.display !== 'none' && pct.visibility !== 'hidden',
                                activityDisplay: act.display,
                                activityVisible: act.display !== 'none' && act.visibility !== 'hidden',
                                activityHeight: box.height,
                                activityRight: box.right,
                                viewportWidth: document.documentElement.clientWidth
                            };
                        }""")
                        self.assertTrue(computed["progressVisible"])
                        self.assertGreater(computed["progressSize"], 0)
                        if width <= 375:
                            self.assertAlmostEqual(computed["progressSize"], 27, delta=0.5)
                        self.assertTrue(computed["activityVisible"],
                                        "Recent asset activity must remain accessible on mobile")
                        self.assertGreater(computed["activityHeight"], 0)
                        self.assertLessEqual(computed["activityRight"],
                                             computed["viewportWidth"] + 2)
                    finally:
                        page.close()

    def test_home_details_expand_and_collapse(self):
        page = self.browser.new_page(viewport={"width": 360, "height": 740}, is_mobile=True, has_touch=True)
        try:
            page.goto(URL, wait_until="domcontentloaded")
            page.locator('.bottomnav [data-view="home"]').click()
            details = page.locator("#view-home details:visible").first
            if details.count() == 0:
                self.skipTest("No visible native details control on home")
            initial = details.evaluate("(el) => el.open")
            details.locator("summary").click()
            self.assertNotEqual(initial, details.evaluate("(el) => el.open"))
            details.locator("summary").click()
            self.assertEqual(initial, details.evaluate("(el) => el.open"))
        finally:
            page.close()

    def test_asset_totals_and_fire_goal_survive_reload(self):
        # Deterministic mixed-currency fixture: no external quote API needed.
        page = self.browser.new_page(viewport={"width": 390, "height": 844})
        try:
            page.route("https://api.frankfurter.dev/**",
                       lambda route: route.fulfill(status=200, content_type="application/json",
                                                   body='{"date":"2026-10-16","rates":{"KRW":1400}}'))
            page.add_init_script("""(() => {
                const fixture = {
                    tx: [], rec: [], budgets: {}, favorites: [], theme: 'dark',
                    fire: {asset: 0, goal: 100, monthly: 0, rate: 0, withdrawal: 4},
                    holdings: [
                        {type: 'USD', qty: 2, price: 100, cost: 80, accountId: 'a'},
                        {type: 'KRW', qty: 3, price: 10000, cost: 9000, accountId: 'b'}
                    ],
                    accounts: [
                        {id: 'a', name: 'US', kind: 'investment', amount: 5000, fire: true},
                        {id: 'b', name: 'KR', kind: 'investment', amount: 0, fire: false,
                         items: [{amount: 7000}]}
                    ],
                    balance: {fx: 1400, cash: 10000, other: 2000, debt: 3000}
                };
                localStorage.setItem('firemate_smart_v3', JSON.stringify(fixture));
            })()""")
            expected_net = 2 * 100 * 1400 + 3 * 10000 + 5000 + 7000 + 10000 + 2000 - 3000
            expected_pct = expected_net / (100 * 10000) * 100
            for attempt in range(2):
                page.goto(URL, wait_until="load")
                page.locator('.bottomnav [data-view="home"]').click()
                page.wait_for_function("""() => document.querySelector('#homeTotalAssets')?.textContent?.trim() !== '₩0'""",
                                       timeout=10000)
                actual = page.locator("#homeTotalAssets").inner_text()
                digits = int("".join(ch for ch in actual if ch.isdigit()))
                snapshot = page.evaluate("""() => JSON.parse(localStorage.getItem('firemate_smart_v3'))""")
                self.assertEqual(digits, expected_net,
                                 f"Attempt {attempt}: incorrect net assets; balance={snapshot.get('balance')}; holdings={snapshot.get('holdings')}")
                self.assertEqual(page.locator("#homeAssetPercent").inner_text(),
                                 f"{expected_pct:.1f}%")
                page.locator('.bottomnav [data-view="fire"]').click()
                self.assertEqual(page.locator("#firePct").inner_text(), f"{expected_pct:.1f}%")
                saved = page.evaluate("""() => JSON.parse(localStorage.getItem('firemate_smart_v3'))""")
                self.assertEqual(saved["holdings"][0]["qty"], 2)
                self.assertEqual(saved["balance"]["fx"], 1400)
        finally:
            page.close()

    def test_ledger_crud_persists_after_reload(self):
        page = self.browser.new_page(viewport={"width": 390, "height": 844})
        try:
            page.route("https://api.frankfurter.dev/**",
                       lambda route: route.abort("failed"))
            page.goto(URL, wait_until="domcontentloaded")
            page.locator('.bottomnav [data-view="calendar"]').click()
            page.locator("#fmLedgerAddBtn").click()
            page.locator("#entryAmount").fill("12345")
            page.locator("#entryDate").fill("2026-10-17")
            page.locator("#entryMemo").fill("Playwright ledger regression")
            page.locator("#saveEntry").click()
            self.assertEqual(page.locator("#entryOverlay.show").count(), 0)
            def entries():
                return page.evaluate("""() => JSON.parse(localStorage.getItem('firemate_smart_v3')).tx
                    .filter(t => t.memo === 'Playwright ledger regression')""")
            self.assertEqual(len(entries()), 1)
            self.assertEqual(entries()[0]["amount"], 12345)
            page.reload(wait_until="domcontentloaded")
            self.assertEqual(len(entries()), 1)
            page.locator('.bottomnav [data-view="calendar"]').click()
            page.locator("#fmModeList").click()
            page.locator('#fmLedgerAllTx .tx').filter(has_text="Playwright ledger regression").locator('[data-edit]').click()
            page.locator("#entryAmount").fill("23456")
            page.locator("#saveEntry").click()
            self.assertEqual(entries()[0]["amount"], 23456)
            page.reload(wait_until="domcontentloaded")
            self.assertEqual(entries()[0]["amount"], 23456)
            page.locator('.bottomnav [data-view="calendar"]').click()
            page.locator("#fmModeList").click()
            page.locator('#fmLedgerAllTx .tx').filter(has_text="Playwright ledger regression").locator('[data-edit]').click()
            page.once("dialog", lambda dialog: dialog.accept())
            page.locator("#deleteEntry").click()
            self.assertEqual(entries(), [])
            page.reload(wait_until="domcontentloaded")
            self.assertEqual(entries(), [])
        finally:
            page.close()

    def test_ledger_save_failure_does_not_fake_success(self):
        page = self.browser.new_page(viewport={"width": 390, "height": 844})
        try:
            page.goto(URL, wait_until="domcontentloaded")
            page.locator('.bottomnav [data-view="calendar"]').click()
            page.locator("#fmLedgerAddBtn").click()
            page.locator("#entryAmount").fill("9876")
            page.locator("#entryMemo").fill("unsaved transaction")
            before = page.evaluate("""() => JSON.parse(localStorage.getItem('firemate_smart_v3')).tx""")
            page.evaluate("""() => {
                const original = Storage.prototype.setItem;
                Storage.prototype.setItem = function(key, value) {
                    if (key === 'firemate_smart_v3') throw new DOMException('Quota exceeded', 'QuotaExceededError');
                    return original.call(this, key, value);
                };
            }""")
            page.locator("#saveEntry").click()
            self.assertEqual(page.locator("#entryOverlay.show").count(), 1)
            after = page.evaluate("""() => JSON.parse(localStorage.getItem('firemate_smart_v3')).tx""")
            self.assertEqual(before, after)
            page.reload(wait_until="domcontentloaded")
            self.assertEqual(page.evaluate("""() => JSON.parse(localStorage.getItem('firemate_smart_v3')).tx"""), before)
        finally:
            page.close()

    def test_quote_http_429_preserves_holdings(self):
        page = self.browser.new_page(viewport={"width": 390, "height": 844})
        try:
            page.route("https://api.frankfurter.dev/**", lambda route: route.abort("failed"))
            page.route("https://api.twelvedata.com/**",
                       lambda route: route.fulfill(status=429, content_type="application/json",
                                                   headers={"retry-after": "60"},
                                                   body='{"status":"error","message":"API credits exhausted","code":429}'))
            page.add_init_script("""(() => {
                localStorage.setItem('firemate_td_key_v1', 'playwright-test-key');
                localStorage.setItem('firemate_smart_v3', JSON.stringify({
                    holdings:[{type:'USD',ticker:'AAPL',qty:3,price:180,cost:150,accountId:'legacy-us'}],
                    accounts:[{id:'legacy-us',name:'US',kind:'investment',amount:0,fire:true}],
                    balance:{fx:1400,cash:0,other:0,debt:0,fxCheckedAt:new Date().toISOString().slice(0,10)}
                }));
            })()""")
            page.goto(URL, wait_until="domcontentloaded")
            page.locator('.bottomnav [data-view="assets"]').click()
            page.once("dialog", lambda dialog: dialog.accept())
            page.locator("#refreshStocks").click()
            page.wait_for_function("""() => Number(localStorage.getItem('firemate_quote_cooldown_v1') || 0) > Date.now()""",
                                   timeout=15000)
            saved = page.evaluate("""() => JSON.parse(localStorage.getItem('firemate_smart_v3')).holdings[0]""")
            self.assertEqual(saved["price"], 180)
            self.assertEqual(saved["qty"], 3)
            page.reload(wait_until="domcontentloaded")
            saved = page.evaluate("""() => JSON.parse(localStorage.getItem('firemate_smart_v3')).holdings[0]""")
            self.assertEqual((saved["price"], saved["qty"]), (180, 3))
        finally:
            page.close()

    def test_quote_api_success_and_invalid_responses_preserve_user_fields(self):
        for scenario in ("success", "network", "invalid"):
            with self.subTest(scenario=scenario):
                page = self.browser.new_page(viewport={"width": 390, "height": 844})
                try:
                    page.route("https://api.frankfurter.dev/**", lambda route: route.abort("failed"))
                    def quote_route(route):
                        if scenario == "network":
                            route.abort("failed")
                        elif scenario == "invalid":
                            route.fulfill(status=200, content_type="application/json",
                                          body='{"close":"-1","previous_close":"170"}')
                        else:
                            route.fulfill(status=200, content_type="application/json",
                                          body='{"close":"200","previous_close":"180"}')
                    page.route("https://api.twelvedata.com/**", quote_route)
                    page.add_init_script("""(() => {
                        localStorage.setItem('firemate_td_key_v1','playwright-test-key');
                        localStorage.setItem('firemate_smart_v3',JSON.stringify({
                            tx:[{id:'ledger-fixture',type:'expense',amount:3456,date:'2026-10-17',category:'식비',memo:'keep me'}],
                            holdings:[{id:'holding-fixture',type:'USD',ticker:'AAPL',qty:3,price:180,cost:150,accountId:'legacy-us',memo:'keep holding'}],
                            accounts:[{id:'legacy-us',name:'Test account',kind:'investment',amount:1234,fire:true}],
                            balance:{fx:1400,cash:4321,other:0,debt:0,fxCheckedAt:new Date().toISOString().slice(0,10)}
                        }));
                    })()""")
                    page.goto(URL, wait_until="domcontentloaded")
                    page.locator('.bottomnav [data-view="assets"]').click()
                    page.once("dialog", lambda dialog: dialog.accept())
                    page.locator("#refreshStocks").click()
                    page.wait_for_function("""() => !document.querySelector('#refreshStocks').disabled && document.querySelector('#quoteProgressText')?.textContent?.includes('완료')""", timeout=20000)
                    saved = page.evaluate("""() => JSON.parse(localStorage.getItem('firemate_smart_v3'))""")
                    holding = saved["holdings"][0]
                    self.assertEqual(holding["price"], 200 if scenario == "success" else 180)
                    self.assertEqual(holding["qty"], 3)
                    self.assertEqual(holding["accountId"], "legacy-us")
                    self.assertEqual(holding["memo"], "keep holding")
                    self.assertEqual(saved["accounts"][0]["amount"], 1234)
                    self.assertEqual(saved["balance"]["cash"], 4321)
                    self.assertEqual(saved["tx"][0]["memo"], "keep me")
                finally:
                    page.close()

    def test_pwa_update_decline_preserves_data(self):
        page = self.browser.new_page(viewport={"width": 390, "height": 844})
        try:
            page.route("https://api.frankfurter.dev/**", lambda route: route.abort("failed"))
            page.route("https://raw.githubusercontent.com/jhr163827-hub/Fire-Mate/main/index.html?check=*",
                       lambda route: route.fulfill(status=200, content_type="text/html",
                                                   body="""const BUILD='fire-mate-v3-4-2'; id="view-home" id="view-assets" id="view-fire" id="settingsOverlay" function renderFire() """ + "x" * 100100))
            page.goto(URL, wait_until="domcontentloaded")
            before = page.evaluate("""() => localStorage.getItem('firemate_smart_v3')""")
            page.locator("#fmManualUpdate").click()
            page.get_by_text("새 업데이트가 준비됐어요").wait_for(timeout=15000)
            page.get_by_role("button", name="나중에").click()
            self.assertEqual(page.evaluate("""() => localStorage.getItem('firemate_smart_v3')"""), before)
            self.assertEqual(page.locator("#fmManualUpdate").count(), 1)
        finally:
            page.close()

    def test_theme_save_failure_keeps_previous_setting(self):
        page = self.browser.new_page(viewport={"width": 390, "height": 844})
        try:
            page.goto(URL, wait_until="domcontentloaded")
            page.locator('.bottomnav [data-view="home"]').click()
            previous = page.evaluate("""() => ({
                theme: document.documentElement.dataset.theme,
                stored: JSON.parse(localStorage.getItem('firemate_smart_v3')).theme
            })""")
            page.evaluate("""() => {
                const original = Storage.prototype.setItem;
                Storage.prototype.setItem = function(key, value) {
                    if (key === 'firemate_smart_v3') throw new DOMException('Quota exceeded', 'QuotaExceededError');
                    return original.call(this, key, value);
                };
            }""")
            page.locator("#theme").click()
            actual = page.evaluate("""() => ({
                theme: document.documentElement.dataset.theme,
                stored: JSON.parse(localStorage.getItem('firemate_smart_v3')).theme
            })""")
            self.assertEqual(actual, previous)
        finally:
            page.close()

    def test_saved_theme_survives_reload_and_navigation(self):
        # Real UI writes to the app's persisted data; no mocked storage.
        page = self.browser.new_page(viewport={"width": 390, "height": 844})
        try:
            page.goto(URL, wait_until="domcontentloaded")
            page.locator('.bottomnav [data-view="home"]').click()
            key = "firemate_smart_v3"
            before = page.evaluate("""key => JSON.parse(localStorage.getItem(key) || '{}').theme""", key)
            page.locator("#theme").click()
            saved = page.evaluate("""key => JSON.parse(localStorage.getItem(key) || '{}').theme""", key)
            self.assertIn(saved, ("light", "dark"))
            self.assertNotEqual(before, saved)
            page.reload(wait_until="domcontentloaded")
            after = page.evaluate("""key => JSON.parse(localStorage.getItem(key) || '{}').theme""", key)
            self.assertEqual(after, saved)
            page.locator('.bottomnav [data-view="fire"]').click()
            self.assertTrue(page.locator("#view-fire").is_visible())
            page.locator('.bottomnav [data-view="assets"]').click()
            self.assertTrue(page.locator("#view-assets").is_visible())
            page.locator('.bottomnav [data-view="home"]').click()
            self.assertTrue(page.locator("#view-home").is_visible())
            self.assertEqual(page.evaluate("""key => JSON.parse(localStorage.getItem(key) || '{}').theme""", key), saved)
        finally:
            page.close()

    def test_theme_and_navigation(self):
        page = self.browser.new_page(viewport={"width": 390, "height": 844})
        try:
            page.goto(URL, wait_until="domcontentloaded")
            home = page.locator('.bottomnav [data-view="home"]')
            home.click()
            self.assertTrue(page.locator("#view-home").is_visible())
            # Exercise the real theme toggle, not an artificial DOM attribute change.
            theme_button = page.locator("#theme")
            self.assertTrue(theme_button.is_visible())
            initial = page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()")
            theme_button.click()
            changed = page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()")
            self.assertNotEqual(initial, changed)
            theme_button.click()
            restored = page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()")
            self.assertEqual(initial, restored)

            # Exercise bottom navigation and return to home.
            page.locator('.bottomnav [data-view="assets"]').click()
            self.assertTrue(page.locator("#view-assets").is_visible())
            home.click()
            self.assertTrue(page.locator("#view-home").is_visible())
        finally:
            page.close()

if __name__ == "__main__":
    unittest.main()
