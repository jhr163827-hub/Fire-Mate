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
HEIGHTS = [568, 720, 844]

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
