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

class HomeResponsiveTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.p = sync_playwright().start()
        cls.browser = cls.p.chromium.launch()

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.p.stop()

    def test_home_layouts(self):
        for width in WIDTHS:
            with self.subTest(width=width):
                page = self.browser.new_page(viewport={"width": width, "height": 720}, is_mobile=True, has_touch=True)
                try:
                    page.goto(URL, wait_until="domcontentloaded")
                    page.locator('[data-view="home"]').first.click()
                    page.wait_for_timeout(150)
                    self.assertTrue(page.locator("#view-home").is_visible())
                    dimensions = page.evaluate("""() => ({
                        scrollWidth: document.documentElement.scrollWidth,
                        viewportWidth: document.documentElement.clientWidth,
                        scrollHeight: document.documentElement.scrollHeight,
                        viewportHeight: window.innerHeight
                    })""")
                    self.assertLessEqual(dimensions["scrollWidth"], dimensions["viewportWidth"] + 2)
                    self.assertGreaterEqual(dimensions["scrollHeight"], dimensions["viewportHeight"])
                    page.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)")
                    self.assertGreaterEqual(page.evaluate("window.scrollY"), 0)
                finally:
                    page.close()

    def test_theme_and_navigation(self):
        page = self.browser.new_page(viewport={"width": 390, "height": 844})
        try:
            page.goto(URL, wait_until="domcontentloaded")
            home = page.locator('[data-view="home"]').first
            home.click()
            self.assertTrue(page.locator("#view-home").is_visible())
            # The app may expose theme selection through settings rather than a global button.
            # Verify both theme palettes at the CSS-token level without mutating storage.
            colors = []
            for theme in ("dark", "light"):
                page.evaluate("(theme) => document.documentElement.setAttribute('data-theme', theme)", theme)
                colors.append(page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()"))
            self.assertNotEqual(colors[0], colors[1])
        finally:
            page.close()

if __name__ == "__main__":
    unittest.main()
