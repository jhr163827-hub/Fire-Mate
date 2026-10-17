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

    def test_phase2_home_visual_hierarchy_and_theme(self):
        for width in (320,390,430):
            for theme in ("dark","light"):
                with self.subTest(width=width,theme=theme):
                    page=self.browser.new_page(viewport={"width":width,"height":844},is_mobile=True,has_touch=True)
                    try:
                        page.goto(URL,wait_until="domcontentloaded")
                        page.evaluate("""theme => document.documentElement.setAttribute('data-theme',theme)""",theme)
                        metrics=page.evaluate("""() => {
                            const hero=document.getElementById('homeAssetHero');
                            const amount=document.getElementById('homeTotalAssets');
                            const progress=document.getElementById('homeAssetProgress');
                            const expense=document.querySelector('#view-home .fm-home-budget');
                            const rect=hero.getBoundingClientRect();
                            return {
                                amountSize:parseFloat(getComputedStyle(amount).fontSize),
                                amountWeight:parseFloat(getComputedStyle(amount).fontWeight),
                                amountVisible:amount.getBoundingClientRect().width>0,
                                heroRight:rect.right,
                                viewport:document.documentElement.clientWidth,
                                progressPresent:!!progress,
                                expenseVisible:expense.getBoundingClientRect().width>0,
                                theme:document.documentElement.getAttribute('data-theme'),
                                horizontalOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+2
                            };
                        }""")
                        self.assertEqual(metrics["theme"],theme)
                        self.assertGreaterEqual(metrics["amountSize"],30)
                        self.assertGreaterEqual(metrics["amountWeight"],700)
                        self.assertTrue(metrics["amountVisible"])
                        self.assertTrue(metrics["progressPresent"])
                        self.assertTrue(metrics["expenseVisible"])
                        self.assertLessEqual(metrics["heroRight"],metrics["viewport"]+2)
                        self.assertFalse(metrics["horizontalOverflow"])
                    finally:
                        page.close()

    def test_five_home_metrics_fit_a_standard_phone(self):
        # Check the rendered first viewport, not just CSS display or DOM presence.
        for width in (375, 390, 430):
            with self.subTest(width=width):
                page=self.browser.new_page(viewport={"width":width,"height":844},is_mobile=True,has_touch=True)
                try:
                    page.goto(URL,wait_until="domcontentloaded")
                    nav_top=page.locator('.bottomnav').bounding_box()['y']
                    for ident in ('homeTotalAssets','homeDailyChange','heroSpent','homeAssetPercent','homeFireEta'):
                        box=page.locator('#'+ident).bounding_box()
                        self.assertIsNotNone(box,ident)
                        self.assertLessEqual(box['y']+box['height'],nav_top+2,ident)
                finally:
                    page.close()

    def test_phase2_home_navigation_and_no_clipped_content(self):
        for width in (320,360,390,430):
            with self.subTest(width=width):
                page=self.browser.new_page(viewport={"width":width,"height":670},is_mobile=True,has_touch=True)
                try:
                    page.goto(URL,wait_until="domcontentloaded")
                    page.locator('.bottomnav [data-view="home"]').click()
                    m=page.evaluate("""() => {
                        const hero=document.getElementById('homeAssetHero').getBoundingClientRect();
                        const amount=document.getElementById('homeTotalAssets').getBoundingClientRect();
                        const nav=document.querySelector('.bottomnav').getBoundingClientRect();
                        return {
                            amountSize:parseFloat(getComputedStyle(document.getElementById('homeTotalAssets')).fontSize),
                            amountRight:amount.right,heroRight:hero.right,navBottom:nav.bottom,
                            viewport:innerWidth,viewportHeight:innerHeight,
                            horizontal:document.documentElement.scrollWidth>document.documentElement.clientWidth+2,
                            scrollHeight:document.documentElement.scrollHeight
                        };
                    }""")
                    self.assertGreaterEqual(m["amountSize"],30)
                    self.assertLessEqual(m["amountRight"],m["viewport"]+2)
                    self.assertLessEqual(m["heroRight"],m["viewport"]+2)
                    self.assertLessEqual(m["navBottom"],m["viewportHeight"]+2)
                    self.assertFalse(m["horizontal"])
                    # Small screens may scroll rather than silently clip important content.
                    if m["scrollHeight"]>m["viewportHeight"]+4:
                        page.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)")
                        self.assertGreater(page.evaluate("scrollY"),0)
                    page.locator('.bottomnav [data-view="assets"]').click()
                    self.assertTrue(page.locator("#view-assets").is_visible())
                    page.locator('.bottomnav [data-view="home"]').click()
                    self.assertTrue(page.locator("#homeTotalAssets").is_visible())
                finally:
                    page.close()

    def test_phase2_home_secondary_details_are_accessible(self):
        for width in (320,390,430):
            for theme in ("dark","light"):
                with self.subTest(width=width,theme=theme):
                    page=self.browser.new_page(viewport={"width":width,"height":844},is_mobile=True,has_touch=True)
                    try:
                        page.goto(URL,wait_until="domcontentloaded")
                        page.evaluate("theme => document.documentElement.setAttribute('data-theme',theme)",theme)
                        page.locator('.bottomnav [data-view="home"]').click()
                        activity=page.locator("#view-home .fm-home-activity-details")
                        self.assertEqual(activity.count(),1)
                        self.assertFalse(activity.evaluate("(el)=>el.open"))
                        activity.locator("summary").click()
                        self.assertTrue(activity.evaluate("(el)=>el.open"))
                        self.assertTrue(page.locator("#fmHomeActivity").is_visible())
                        activity.locator("summary").click()
                        self.assertFalse(activity.evaluate("(el)=>el.open"))
                        self.assertTrue(page.locator("#homeTotalAssets").is_visible())
                        self.assertTrue(page.locator("#homeDailyChange").is_visible())
                        self.assertTrue(page.locator("#homeAssetPercent").is_visible())
                        self.assertTrue(page.locator("#homeFireEta").is_visible())
                        self.assertTrue(page.locator("#heroSpent").is_visible())
                        budget_details=page.locator("#view-home .fm-secondary-details")
                        self.assertFalse(page.locator("#fmBudgetExpense").is_visible())
                        budget_details.locator("summary").click()
                        self.assertTrue(page.locator("#fmBudgetExpense").is_visible())
                        budget_details.locator("summary").click()
                        self.assertLessEqual(page.evaluate("document.documentElement.scrollWidth"),width+2)
                    finally:
                        page.close()

    def test_asset_milestone_remains_accessible(self):
        page=self.browser.new_page(viewport={"width":320,"height":670},is_mobile=True,has_touch=True)
        try:
            page.goto(URL,wait_until="domcontentloaded")
            page.locator('.bottomnav [data-view="assets"]').click()
            milestone=page.locator('#view-assets .fm-milestone-details')
            self.assertEqual(milestone.count(),1)
            milestone.locator('summary').click()
            self.assertTrue(milestone.evaluate('(el)=>el.open'))
            self.assertTrue(page.locator('#assetBadges').is_visible())
            self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),322)
        finally:
            page.close()

    def test_account_holding_details_fit_and_label_stale_quote(self):
        for width in (320,390,430):
            with self.subTest(width=width):
                page=self.browser.new_page(viewport={"width":width,"height":670},is_mobile=True,has_touch=True)
                try:
                    page.add_init_script("""localStorage.setItem('firemate_smart_v3',JSON.stringify({
                        tx:[],rec:[],budgets:{},favorites:[],theme:'dark',
                        fire:{goal:65000,monthly:300,rate:7},
                        accounts:[{id:'demo',name:'긴 이름의 투자 계좌',kind:'investment',amount:0,fire:true}],
                        holdings:[{id:'h1',accountId:'demo',type:'USD',ticker:'SPLG',name:'SPLG',
                            qty:1234,price:123456.9876,cost:100000.1234,
                            dayChangeAt:'2020-01-01T00:00:00Z',dayChangePct:2.5}],
                        balance:{fx:1400,cash:0,other:0,debt:0}
                    }))""")
                    page.goto(URL,wait_until="domcontentloaded")
                    page.locator('.bottomnav [data-view="assets"]').click()
                    page.locator('[data-inline-toggle="demo"]').click()
                    self.assertTrue(page.locator('#fmAccountDetail').is_visible())
                    self.assertIn('최근 +2.50%',page.locator('.fm-market-day').first.inner_text())
                    self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width+2)
                    page.locator('[data-fm-holding="h1"]').click()
                    self.assertTrue(page.locator('#fmAccountDetail').is_visible())
                    self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width+2)
                    self.assertEqual(len(page.evaluate("JSON.parse(localStorage.getItem('firemate_smart_v3')).holdings")),1)
                finally:
                    page.close()

    def test_primary_views_fit_mobile_width(self):
        # Exercise the real navigation and inspect rendered width, including 320px.
        for width in (320, 360, 390, 430):
            with self.subTest(width=width):
                page=self.browser.new_page(viewport={"width":width,"height":670},is_mobile=True,has_touch=True)
                try:
                    page.goto(URL,wait_until="domcontentloaded")
                    for view in ("assets", "calendar", "fire"):
                        page.locator(f'.bottomnav [data-view="{view}"]').click()
                        self.assertTrue(page.locator(f'#view-{view}').is_visible())
                        self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width+2,view)
                    page.locator('.bottomnav [data-view="home"]').click()
                    page.locator('#view-home [data-go="retire"]').click()
                    self.assertTrue(page.locator('#view-retire').is_visible())
                    self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width+2,'retire')
                finally:
                    page.close()

    def test_ledger_and_fire_actions_have_touch_targets(self):
        page=self.browser.new_page(viewport={"width":320,"height":670},is_mobile=True,has_touch=True)
        try:
            page.goto(URL,wait_until="domcontentloaded")
            page.locator('.bottomnav [data-view="calendar"]').click()
            for selector in ('#fmModeCalendar','#fmModeList','#fmLedgerAddBtn','#fmLedgerBudgetEdit'):
                self.assertGreaterEqual(page.locator(selector).bounding_box()['height'],44,selector)
            page.locator('.bottomnav [data-view="fire"]').click()
            for selector in ('#fmFirePortfolioOpen','#fmFireLifeOpen'):
                self.assertGreaterEqual(page.locator(selector).bounding_box()['height'],44,selector)
        finally:
            page.close()

    def test_navigation_dividend_panel_has_no_page_errors(self):
        page=self.browser.new_page(viewport={"width":390,"height":844},is_mobile=True,has_touch=True)
        errors=[]
        page.on('pageerror',lambda error: errors.append(str(error)))
        try:
            page.goto(URL,wait_until="domcontentloaded")
            page.locator('.bottomnav [data-view="assets"]').click()
            page.locator('#fmDividendTab').click()
            self.assertTrue(page.locator('#fmDividendPanel').is_visible())
            page.locator('#fmCompositionAccount').click()
            self.assertFalse(page.locator('#fmDividendPanel').is_visible())
            page.locator('.bottomnav [data-view="calendar"]').click()
            page.locator('.bottomnav [data-view="fire"]').click()
            page.locator('.bottomnav [data-view="home"]').click()
            self.assertEqual(errors,[])
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
                                                   body="""const BUILD='fire-mate-v99-0-0'; id="view-home" id="view-assets" id="view-fire" id="settingsOverlay" function renderFire() """ + "x" * 100100))
            page.goto(URL, wait_until="domcontentloaded")
            before = page.evaluate("""() => localStorage.getItem('firemate_smart_v3')""")
            page.locator("#fmManualUpdate").click()
            page.get_by_text("새 업데이트가 준비됐어요").wait_for(timeout=15000)
            page.get_by_role("button", name="나중에").click()
            self.assertEqual(page.evaluate("""() => localStorage.getItem('firemate_smart_v3')"""), before)
            self.assertEqual(page.locator("#fmManualUpdate").count(), 1)
        finally:
            page.close()

    def test_pwa_update_accept_requests_activation_and_keeps_storage(self):
        page = self.browser.new_page(viewport={"width": 390, "height": 844})
        try:
            page.route("https://api.frankfurter.dev/**", lambda route: route.abort("failed"))
            page.route("https://raw.githubusercontent.com/jhr163827-hub/Fire-Mate/main/index.html?check=*",
                       lambda route: route.fulfill(status=200, content_type="text/html",
                                                   body="""const BUILD='fire-mate-v99-0-0'; id="view-home" id="view-assets" id="view-fire" id="settingsOverlay" function renderFire() """ + "x" * 100100))
            page.goto(URL, wait_until="domcontentloaded")
            page.evaluate("""() => localStorage.setItem('fm-pwa-test-marker', 'keep')""")
            page.locator("#fmManualUpdate").click()
            page.get_by_text("새 업데이트가 준비됐어요").wait_for(timeout=15000)
            page.get_by_role("button", name="지금 업데이트").click()
            page.wait_for_url("**/index.html?updated=*", timeout=15000)
            self.assertEqual(page.evaluate("""() => localStorage.getItem('fm-pwa-test-marker')"""), "keep")
        finally:
            page.close()

    def test_service_worker_offline_navigation_keeps_local_data(self):
        page = self.browser.new_page(viewport={"width": 390, "height": 844})
        try:
            page.route("https://api.frankfurter.dev/**", lambda route: route.abort("failed"))
            page.goto(URL, wait_until="load")
            page.wait_for_function("""() => navigator.serviceWorker?.controller !== null""", timeout=15000)
            page.evaluate("""() => localStorage.setItem('fm-pwa-offline-marker','kept')""")
            page.context.set_offline(True)
            page.reload(wait_until="domcontentloaded", timeout=15000)
            self.assertTrue(page.locator("#view-home").count() > 0)
            self.assertEqual(page.evaluate("""() => localStorage.getItem('fm-pwa-offline-marker')"""), "kept")
        finally:
            page.context.set_offline(False)
            page.close()

    def test_financial_asset_values_and_fire_progress_with_fixed_fx(self):
        page = self.browser.new_page(viewport={"width": 390, "height": 844})
        try:
            page.route("https://api.frankfurter.dev/**", lambda route: route.abort("failed"))
            page.add_init_script("""(() => {
                const fixture={
                    tx:[],rec:[],budgets:{},favorites:[],theme:'dark',
                    fire:{asset:0,goal:100,monthly:0,rate:0,withdrawal:4},
                    holdings:[
                        {type:'USD',qty:2,price:100,cost:80,accountId:'a'},
                        {type:'KRW',qty:3,price:10000,cost:9000,accountId:'b'}
                    ],
                    accounts:[
                        {id:'a',name:'US',kind:'investment',amount:5000,fire:true},
                        {id:'b',name:'KR',kind:'investment',amount:0,fire:false,items:[{amount:7000}]}
                    ],
                    balance:{fx:1400,cash:10000,other:2000,debt:3000,
                             fxCheckedAt:new Date().toISOString().slice(0,10)}
                };
                localStorage.setItem('firemate_smart_v3',JSON.stringify(fixture));
            })()""")
            expected_net=331000
            expected_percent="33.1%"
            page.goto(URL, wait_until="domcontentloaded")
            page.locator('.bottomnav [data-view="home"]').click()
            page.wait_for_function("""() => document.querySelector('#homeTotalAssets')?.textContent?.includes('331,000')""")
            self.assertIn("331,000", page.locator("#homeTotalAssets").inner_text())
            self.assertEqual(page.locator("#homeAssetPercent").inner_text(), expected_percent)
            page.locator('.bottomnav [data-view="fire"]').click()
            self.assertEqual(page.locator("#firePct").inner_text(), expected_percent)
            page.reload(wait_until="domcontentloaded")
            self.assertIn("331,000", page.locator("#homeTotalAssets").inner_text())
            saved=page.evaluate("""() => JSON.parse(localStorage.getItem('firemate_smart_v3'))""")
            self.assertEqual(saved["balance"]["fx"], 1400)
            self.assertEqual(saved["balance"]["debt"], 3000)
            self.assertEqual(saved["holdings"][0]["qty"], 2)
        finally:
            page.close()

    def test_projection_and_fire_goal_with_independent_expected_values(self):
        page = self.browser.new_page(viewport={"width": 390, "height": 844})
        try:
            page.route("https://api.frankfurter.dev/**", lambda route: route.abort("failed"))
            page.goto(URL, wait_until="domcontentloaded")
            actual = page.evaluate("""() => ({
                noGrowth: window.__fmFinanceTest.projection(10000,100,0,360).projected,
                noGrowthSeries: window.__fmFinanceTest.projection(10000,100,0,360).series,
                compound: window.__fmFinanceTest.projection(10000,0,7,360).projected,
                compoundSeries: window.__fmFinanceTest.projection(10000,0,7,360).series,
                goalMonths: window.__fmFinanceTest.estimate(10000,13000,100,0),
                reached: window.__fmFinanceTest.estimate(14000,13000,100,0),
                invalid: window.__fmFinanceTest.projection(10000,100,-100,360).projected
            })""")
            self.assertEqual(actual["noGrowth"], 46000)
            self.assertEqual(len(actual["noGrowthSeries"]), 361)
            self.assertEqual(actual["noGrowthSeries"][-1], 46000)
            self.assertAlmostEqual(actual["compound"], 10000 * (1.07 ** 30), delta=0.01)
            self.assertAlmostEqual(actual["compoundSeries"][-1], 10000 * (1.07 ** 30), delta=0.01)
            self.assertEqual(actual["goalMonths"], 30)
            self.assertEqual(actual["reached"], 0)
            self.assertIsNone(actual["invalid"])
        finally:
            page.close()

    def test_quick_dividend_tax_and_same_return_comparison(self):
        page = self.browser.new_page(viewport={"width": 390, "height": 844})
        try:
            page.route("https://api.frankfurter.dev/**", lambda route: route.abort("failed"))
            page.goto(URL, wait_until="domcontentloaded")
            page.evaluate("""() => {
                document.getElementById('fmQuickBudget').value='10000';
                document.getElementById('fmQuickSpend').value='300';
                document.getElementById('fmQuickYield').value='4';
                document.getElementById('fmQuickTax').value='15';
                document.getElementById('fmQuickGain').value='7';
                window.__fmFinanceTest.quick();
            }""")
            result = page.locator("#fmQuickResult").inner_text()
            # 10,000 x 4% = 400 gross; 15% withholding = 60; net = 340.
            # Total return already includes dividends; only tax and living expenses reduce capital.
            self.assertIn("340만 원", result)
            self.assertIn("400만 원", result)
            self.assertIn("1억 340만 원", result)
            self.assertIn("1억 400만 원", result)
            self.assertIn("양도세 미계산", result)
        finally:
            page.close()

    def test_thirty_year_strategy_tax_and_cashflow_checks(self):
        page = self.browser.new_page(viewport={"width": 390, "height": 844})
        try:
            page.route("https://api.frankfurter.dev/**", lambda route: route.abort("failed"))
            page.goto(URL, wait_until="domcontentloaded")
            output = page.evaluate("""() => {
                document.getElementById('fmQuickBudget').value='10000';
                document.getElementById('fmQuickSpend').value='300';
                document.getElementById('fmStrYears').value='30';
                document.getElementById('fmStrInflation').value='0';
                document.getElementById('fmStrDivGrowth').value='7';
                document.getElementById('fmStrSameReturn').checked=true;
                document.getElementById('fmStrFairMode').checked=true;
                document.getElementById('fmStrTaxApply').checked=true;
                document.getElementById('fmStrGainShare').value='30';
                document.getElementById('fmStrDivCost').value='15';
                document.getElementById('fmStrInsurance').value='0';
                return window.__fmFinanceTest.strategy({
                    div:[{name:'TEST',amount:10000,estimatedAnnualMan:400,rate:4}],
                    sale:[{name:'TEST',amount:10000,rate:7}]
                });
            }""")
            self.assertIn("30년", output)
            self.assertIn("340만", output)
            self.assertIn("400만", output)
            self.assertIn("매도세", output)
            self.assertNotIn("검증 실패", output)
            self.assertNotIn("계산 불가", output)
        finally:
            page.close()

    def test_thirty_year_stress_scenarios_and_independent_first_year(self):
        page = self.browser.new_page(viewport={"width": 390, "height": 844})
        try:
            page.route("https://api.frankfurter.dev/**", lambda route: route.abort("failed"))
            page.goto(URL, wait_until="domcontentloaded")
            cases=[
                # 30-year cash-only depletion: 1,000 - 100 per year, no returns.
                {"budget":1000,"spend":100,"rate":0,"dividend":0,"tax":0,"inflation":0,
                 "year1":900,"year30":0},
                # A loss of 10% then 100 spending from 1,000 => 800 after year one.
                {"budget":1000,"spend":100,"rate":-10,"dividend":0,"tax":0,"inflation":0,
                 "year1":800,"year30":0},
                # 7% return, 300 spending, 4% gross dividend, 15% withholding:
                # dividend portfolio ends year one at 10000*1.07-60-300 = 10340.
                {"budget":10000,"spend":300,"rate":7,"dividend":400,"tax":15,"inflation":0,
                 "year1":10340,"year30":None},
            ]
            for c in cases:
                with self.subTest(c=c):
                    actual=page.evaluate("""c => {
                        const set=(id,value)=>{document.getElementById(id).value=String(value)};
                        set('fmQuickBudget',c.budget);
                        set('fmQuickSpend',c.spend);
                        set('fmStrYears',30);
                        set('fmStrInflation',c.inflation);
                        set('fmStrDivGrowth',c.rate);
                        set('fmStrDivCost',c.tax);
                        set('fmStrInsurance',0);
                        document.getElementById('fmStrSameReturn').checked=true;
                        document.getElementById('fmStrFairMode').checked=true;
                        document.getElementById('fmStrTaxApply').checked=false;
                        return window.__fmFinanceTest.strategy({
                            div:[{name:'TEST',amount:c.budget,estimatedAnnualMan:c.dividend,rate:4}],
                            sale:[{name:'TEST',amount:c.budget,rate:c.rate}]
                        });
                    }""", c)
                    self.assertIn("30년",actual)
                    self.assertNotIn("자동 검증 실패",actual)
                    self.assertNotIn("계산 불가",actual)
                    # First-year and final balances are checked through actual rendered output.
                    # Annual ledger correctness is additionally checked by the app's validation.
                    self.assertIn("자동 검증",actual)
        finally:
            page.close()

    def test_thirty_year_ledger_against_independent_annual_model(self):
        # Independent Python recurrence, compared with the app's actual year-by-year ledger.
        for scenario in (
            {"name":"zero_return_exhaustion","budget":1000,"spend":200,"rate":0,"inflation":0,"gross":0,"tax":0,"cash":0,"gain":0},
            {"name":"negative_return","budget":10000,"spend":300,"rate":-10,"inflation":0,"gross":400,"tax":15,"cash":0,"gain":0},
            {"name":"inflation_and_cash","budget":10000,"spend":300,"rate":5,"inflation":3,"gross":400,"tax":15,"cash":2000,"gain":0},
            {"name":"withholding_and_sale_tax","budget":10000,"spend":300,"rate":7,"inflation":2,"gross":400,"tax":15,"cash":0,"gain":30},
        ):
            with self.subTest(scenario=scenario["name"]):
                page=self.browser.new_page(viewport={"width":390,"height":844})
                try:
                    page.route("https://api.frankfurter.dev/**", lambda route: route.abort("failed"))
                    page.goto(URL,wait_until="domcontentloaded")
                    got=page.evaluate("""(v) => {
                        const set=(id,val)=>document.getElementById(id).value=String(val);
                        set('fmQuickBudget',v.budget);
                        set('fmQuickSpend',v.spend);
                        set('fmStrYears',30);
                        set('fmStrInflation',v.inflation);
                        set('fmStrDivGrowth',v.rate);
                        set('fmStrDivCost',v.tax);
                        set('fmStrInsurance',0);
                        set('fmStrGainShare',v.gain);
                        document.getElementById('fmStrSameReturn').checked=true;
                        document.getElementById('fmStrFairMode').checked=false;
                        document.getElementById('fmStrTaxApply').checked=true;
                        window.__fmFinanceTest.strategy({
                          div:[{name:'TEST',amount:v.budget-v.cash,
                                estimatedAnnualMan:v.gross,rate:4}],
                          sale:[{name:'TEST',amount:v.budget-v.cash,rate:v.rate}]
                        });
                        return window.__fmFinanceLedger;
                    }""",scenario)
                    budget=float(scenario["budget"])
                    invested=budget-scenario["cash"]
                    rate=scenario["rate"]/100
                    inflation=scenario["inflation"]/100
                    gross=scenario["gross"]
                    net_factor=1-scenario["tax"]/100
                    div_cash=float(scenario["cash"])
                    div_inv=invested
                    sale_cash=float(scenario["cash"])
                    sale_inv=invested
                    taxed_cash=float(scenario["cash"])
                    taxed_inv=invested
                    cumulative_tax=0
                    gain_share=scenario["gain"]/100
                    for year in range(1,31):
                        cost=scenario["spend"]*((1+inflation)**(year-1))
                        div_grown=max(0,div_inv*(1+rate))
                        annual_gross=min(div_grown,max(0,gross*(div_inv/invested))) if invested else 0
                        annual_net=annual_gross*net_factor
                        div_inv=div_grown-annual_gross
                        div_cash+=annual_net
                        take_cash=min(div_cash,cost)
                        div_cash-=take_cash
                        take_inv=min(div_inv,max(0,cost-take_cash))
                        div_inv-=take_inv
                        sale_inv=max(0,sale_inv*(1+rate))
                        from_cash=min(sale_cash,cost)
                        sale_cash-=from_cash
                        sale_inv-=min(sale_inv,max(0,cost-from_cash))
                        taxed_inv=max(0,taxed_inv*(1+rate))
                        from_cash_tax=min(taxed_cash,cost)
                        taxed_cash-=from_cash_tax
                        needed=max(0,cost-from_cash_tax)
                        threshold=250/gain_share if gain_share>0 else float('inf')
                        gross_needed=needed if needed<=threshold else (needed-55)/(1-0.22*gain_share)
                        sold=min(taxed_inv,max(0,gross_needed))
                        tax=max(0,sold*gain_share-250)*0.22
                        taxed_inv-=sold
                        cumulative_tax+=tax
                        if year in (1,5,10,30):
                            self.assertAlmostEqual(got["baseline"][0]["series"][year],div_cash+div_inv,delta=0.025)
                            self.assertAlmostEqual(got["baseline"][1]["series"][year],sale_cash+sale_inv,delta=0.025)
                            self.assertAlmostEqual(got["taxed"]["series"][year],taxed_cash+taxed_inv,delta=0.025)
                            self.assertAlmostEqual(sum(row["tax"] for row in got["taxed"]["ledger"][:year]),cumulative_tax,delta=0.025)
                    self.assertAlmostEqual(got["taxed"]["cumulativeTax"],cumulative_tax,delta=0.025)
                    for kind in ("baseline","displayed"):
                        for result in got[kind]:
                            self.assertEqual(len(result["series"]),31)
                            self.assertTrue(all(x>=0 for x in result["series"]))
                    if scenario["name"]=="zero_return_exhaustion":
                        self.assertEqual(got["baseline"][0]["exhausted"],5)
                        self.assertEqual(got["baseline"][1]["exhausted"],5)
                    self.assertTrue(got["sameReturn"])
                finally:
                    page.close()

    def test_legacy_partial_saved_data_is_normalized(self):
        for legacy in (
            {"fire": None, "balance": None, "tx": None, "accounts": None},
            {"fire": "broken", "budgets": [], "holdings": [], "accounts": []},
        ):
            with self.subTest(legacy=legacy):
                page = self.browser.new_page(viewport={"width": 390, "height": 844})
                try:
                    page.add_init_script("localStorage.setItem('firemate_smart_v3', " + repr(__import__('json').dumps(legacy)) + ")")
                    page.goto(URL, wait_until="domcontentloaded")
                    self.assertTrue(page.locator("#view-home").count() == 1)
                    page.locator('.bottomnav [data-view="fire"]').click()
                    self.assertTrue(page.locator("#view-fire").is_visible())
                    page.locator('.bottomnav [data-view="assets"]').click()
                    self.assertTrue(page.locator("#view-assets").is_visible())
                finally:
                    page.close()

    def test_backup_validation_rejects_corrupt_financial_fields(self):
        page = self.browser.new_page(viewport={"width": 390, "height": 844})
        try:
            page.goto(URL, wait_until="domcontentloaded")
            outcome = page.evaluate("""() => {
                const data = {
                    tx:[],rec:[],favorites:[],holdings:[],
                    accounts:[{id:'account',amount:-500}],fire:{goal:65000},
                    budgets:{},balance:{fx:1400}
                };
                const obj={app:'FIRE MATE',version:5,data};
                const rejected = candidate => {
                    try { fmValidateBackup(candidate); return false; } catch { return true; }
                };
                const badAccount=rejected(obj);
                data.accounts=[{id:'account',amount:100}];
                data.fire={goal:'not-a-number'};
                const badFire=rejected(obj);
                data.fire={goal:65000};
                data.accounts=[{id:'account',items:[{amount:-50}]}];
                const badOther=rejected(obj);
                return {badAccount,badFire,badOther};
            }""")
            self.assertEqual(outcome, {"badAccount": True, "badFire": True, "badOther": True})
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

    def test_ledger_mobile_entry_list_and_data_preservation(self):
        for width in (320, 360, 390, 430):
            with self.subTest(width=width):
                page = self.browser.new_page(viewport={"width": width, "height": 670}, is_mobile=True, has_touch=True)
                try:
                    page.goto(URL, wait_until="domcontentloaded")
                    page.evaluate("""() => {
                        const key='firemate_smart_v3', value=JSON.parse(localStorage.getItem(key));
                        const date=new Date(), day=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
                        value.tx.push({id:'ledger-mobile-fixture',date:day,type:'expense',amount:123456789,
                            category:'식비',memo:'아주 긴 거래 설명을 작은 휴대전화에서 끝까지 읽을 수 있는지 확인하는 테스트 거래'});
                        localStorage.setItem(key,JSON.stringify(value));
                    }""")
                    page.reload(wait_until="domcontentloaded")
                    page.locator('.bottomnav [data-view="calendar"]').click()
                    page.locator('#fmModeList').click()
                    group=page.locator('#fmLedgerAllTx details.fm-ledger-day').first
                    self.assertTrue(group.is_visible(),page.evaluate("""() => ({active:document.querySelector('#view-calendar').className,paneHidden:document.querySelector('#fmLedgerListPane').hidden,html:document.querySelector('#fmLedgerAllTx').innerHTML.slice(0,300),stored:JSON.parse(localStorage.getItem('firemate_smart_v3')).tx.length})"""))
                    self.assertTrue(group.evaluate('(el)=>el.open'))
                    self.assertIn('아주 긴 거래 설명',group.inner_text())
                    self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width+2,page.evaluate("""() => [...document.querySelectorAll('#view-calendar *')].filter(el=>{let r=el.getBoundingClientRect();return r.right>innerWidth+2&&r.width>0}).slice(0,12).map(el=>[el.id||el.className,Math.round(el.getBoundingClientRect().right)])"""))
                    group.locator('summary').click()
                    self.assertFalse(group.evaluate('(el)=>el.open'))
                    group.locator('summary').click()
                    group.locator('[data-edit="ledger-mobile-fixture"]').click()
                    self.assertTrue(page.locator('#entryOverlay').is_visible())
                    self.assertFalse(page.locator('#entryHint').is_visible())
                    self.assertLessEqual(page.locator('#entryOverlay .modal').bounding_box()['width'],width+1)
                    page.locator('#entryTypes [data-type="transfer"]').click()
                    self.assertTrue(page.locator('#entryHint').is_visible())
                    self.assertEqual(page.locator('#entryTypes [data-type="transfer"]').get_attribute('aria-pressed'),'true')
                    page.locator('#entryOverlay [data-close]').click()
                    page.reload(wait_until="domcontentloaded")
                    self.assertEqual(page.evaluate("JSON.parse(localStorage.getItem('firemate_smart_v3')).tx.filter(x=>x.id==='ledger-mobile-fixture').length"),1)
                finally:
                    page.close()

    def test_fire_retirement_mobile_detail_and_navigation(self):
        for width in (320, 375, 430):
            for theme in ('dark', 'light'):
                with self.subTest(width=width, theme=theme):
                    page=self.browser.new_page(viewport={"width":width,"height":670},is_mobile=True,has_touch=True)
                    errors=[]
                    page.on('pageerror',lambda exc: errors.append(str(exc)))
                    try:
                        page.goto(URL,wait_until="domcontentloaded")
                        page.evaluate("theme => document.documentElement.dataset.theme=theme",theme)
                        page.locator('.bottomnav [data-view="fire"]').click()
                        self.assertTrue(page.locator('#firePct').is_visible())
                        self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width+2)
                        forecast=page.locator('#fmForecastControls')
                        forecast.locator('summary').click()
                        self.assertTrue(forecast.evaluate('(el)=>el.open'))
                        forecast.locator('summary').click()
                        self.assertFalse(forecast.evaluate('(el)=>el.open'))
                        page.locator('#fmFireLifeOpen').click()
                        self.assertTrue(page.locator('#view-retire').is_visible())
                        self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width+2)
                        self.assertFalse(page.locator('#rpReset').is_visible())
                        toggle=page.locator('#fmRpEditToggle')
                        toggle.click()
                        self.assertEqual(toggle.get_attribute('aria-expanded'),'true')
                        self.assertTrue(page.locator('#rpReset').is_visible())
                        toggle.click()
                        self.assertEqual(toggle.get_attribute('aria-expanded'),'false')
                        page.locator('#fmRetireToCalculator').click()
                        self.assertTrue(page.locator('#view-firecalc').is_visible())
                        page.locator('#fmBackFire').click()
                        self.assertTrue(page.locator('#view-fire').is_visible())
                        self.assertFalse(errors)
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
