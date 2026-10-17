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
            page.add_init_script("""() => {
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
            }""")
            expected_net = 2 * 100 * 1400 + 3 * 10000 + 5000 + 7000 + 10000 + 2000 - 3000
            expected_pct = expected_net / (100 * 10000) * 100
            for attempt in range(2):
                page.goto(URL, wait_until="domcontentloaded")
                page.locator('.bottomnav [data-view="home"]').click()
                page.wait_for_timeout(120)
                actual = page.locator("#homeTotalAssets").inner_text()
                digits = int("".join(ch for ch in actual if ch.isdigit()))
                self.assertEqual(digits, expected_net, f"Attempt {attempt}: incorrect net assets")
                self.assertEqual(page.locator("#homeAssetPercent").inner_text(),
                                 f"{expected_pct:.1f}%")
                page.locator('.bottomnav [data-view="fire"]').click()
                self.assertEqual(page.locator("#firePct").inner_text(), f"{expected_pct:.1f}%")
                saved = page.evaluate("""() => JSON.parse(localStorage.getItem('firemate_smart_v3'))""")
                self.assertEqual(saved["holdings"][0]["qty"], 2)
                self.assertEqual(saved["balance"]["fx"], 1400)
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
