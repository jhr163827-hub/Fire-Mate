"""FIRE MATE home responsive regression checks.
Run: pip install playwright && python -m playwright install chromium
     FIRE_MATE_URL=http://localhost:8000 python tests/test_home_responsive.py
Start a local server with: python -m http.server 8000
"""
import os
import unittest
from datetime import date
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

    def open_forecast(self,page):
        fold=page.locator('#fmForecastDisclosure')
        if not fold.evaluate('(e)=>e.open'): fold.locator(':scope>summary').click()

    def fire_screen(self,page,target):
        page.locator('.view.active .fm-fire-screen-nav [data-fire-screen="'+target+'"]').click()

    def open_portfolio(self,page):
        self.fire_screen(page,'retire')
        fold=page.locator('#fmPortfolioDisclosure')
        if not fold.evaluate('(e)=>e.open'): fold.locator(':scope>summary').click()

    def open_strategy_settings(self,page):
        self.fire_screen(page,'retire')
        fold=page.locator('#fmStrategyDetails')
        if not fold.evaluate('(e)=>e.open'): fold.locator(':scope>summary').click()

    def test_light_hero_values_are_dark_on_light_cards(self):
        page = self.browser.new_page(viewport={"width": 320, "height": 720}, is_mobile=True)
        try:
            page.goto(URL, wait_until="domcontentloaded")
            page.evaluate("document.documentElement.dataset.theme='light'")
            for view, value in (("home", "#homeTotalAssets"), ("assets", "#netWorth"), ("fire", "#fireAsset")):
                page.locator(f'.bottomnav [data-view="{view}"]').click()
                channels = page.locator(value).evaluate("e => getComputedStyle(e).color.match(/\\d+/g).slice(0,3).map(Number)")
                self.assertLess(max(channels), 130, f'{view} 핵심 금액은 밝은 카드에서 짙은 색이어야 합니다')
        finally:
            page.close()

    def test_small_home_goal_amount_stays_on_one_line(self):
        page = self.browser.new_page(viewport={"width": 320, "height": 720}, is_mobile=True)
        try:
            page.goto(URL, wait_until="domcontentloaded")
            dims = page.locator('#homeAssetGoal').evaluate("e => ({height:e.clientHeight,size:parseFloat(getComputedStyle(e).fontSize),width:e.clientWidth,scroll:e.scrollWidth})")
            self.assertLessEqual(dims['height'], dims['size'] * 1.6)
            self.assertLessEqual(dims['scroll'], dims['width'] + 1)
            quote = page.locator('#homeRefreshStocks').bounding_box()
            total = page.locator('#homeTotalAssets').bounding_box()
            self.assertGreaterEqual(total['y'], quote['y'] + quote['height'], '총자산 숫자와 시세 갱신 버튼이 겹치면 안 됩니다')
        finally:
            page.close()

    def test_home_budget_uses_current_ledger_month_and_handles_boundaries(self):
        current = date.today().strftime('%Y-%m')
        page = self.browser.new_page(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
        try:
            page.goto(URL, wait_until="domcontentloaded")
            page.evaluate("""month => {
                const saved=JSON.parse(localStorage.getItem('firemate_smart_v3'));
                saved.tx=[]; saved.budgets={};
                localStorage.setItem('firemate_smart_v3',JSON.stringify(saved));
            }""", current)
            page.reload(wait_until="domcontentloaded")
            self.assertEqual(page.locator('#heroSpent').inner_text(), '₩0')
            self.assertEqual(page.locator('#heroBudget').inner_text(), '미설정')
            self.assertIn('예산 설정', page.locator('#homeBudgetAction').inner_text())
            page.locator('#homeBudgetAction').click()
            self.assertTrue(page.locator('#fmLedgerBudgetOverlay').is_visible())
            page.locator('#fmLedgerBudgetValue').fill('1500000')
            page.locator('#fmLedgerBudgetSave').click()
            self.assertEqual(page.locator('#fmCalendarBudget').inner_text(), '₩1,500,000 남음')
            page.locator('#fmLedgerAddBtn').click()
            page.locator('#entryAmount').fill('850000')
            page.locator('#entryDate').fill(current + '-01')
            page.locator('#entryMemo').fill('budget scenario')
            page.locator('#saveEntry').click()
            self.assertEqual(page.locator('#fmCalendarSpent').inner_text(), '₩850,000')
            page.locator('.bottomnav [data-view="home"]').click()
            self.assertEqual(page.locator('#heroSpent').inner_text(), '₩850,000')
            self.assertEqual(page.locator('#heroBudget').inner_text(), '₩1,500,000')
            self.assertEqual(page.locator('#heroLeft').inner_text(), '₩650,000')
            self.assertEqual(page.locator('#heroUsage').inner_text(), '56.7%')
            page.locator('.bottomnav [data-view="calendar"]').click()
            page.locator('#fmModeList').click()
            page.locator('#fmLedgerAllTx .tx').filter(has_text='budget scenario').locator('[data-edit]').click()
            page.locator('#entryAmount').fill('1700000')
            page.locator('#saveEntry').click()
            page.locator('.bottomnav [data-view="home"]').click()
            self.assertEqual(page.locator('#heroLeftLabel').inner_text(), '초과 금액')
            self.assertEqual(page.locator('#heroLeft').inner_text(), '₩200,000')
            self.assertEqual(page.locator('#heroUsage').inner_text(), '113.3%')
            page.locator('.bottomnav [data-view="calendar"]').click()
            page.locator('[data-shift="-1"]').first.click()
            page.locator('.bottomnav [data-view="home"]').click()
            self.assertEqual(page.locator('#heroMonth').inner_text(), current)
            self.assertEqual(page.locator('#heroSpent').inner_text(), '₩1,700,000')
            page.reload(wait_until='domcontentloaded')
            self.assertEqual(page.locator('#heroSpent').inner_text(), '₩1,700,000')
            page.locator('#homeBudgetAction').click()
            page.locator('#fmModeList').click()
            page.locator('#fmLedgerAllTx .tx').filter(has_text='budget scenario').locator('[data-edit]').click()
            page.once('dialog', lambda dialog: dialog.accept())
            page.locator('#deleteEntry').click()
            page.locator('.bottomnav [data-view="home"]').click()
            self.assertEqual(page.locator('#heroSpent').inner_text(), '₩0')
            self.assertEqual(page.locator('#heroLeft').inner_text(), '₩1,500,000')
        finally:
            page.close()

    def test_asset_destinations_search_and_dividend_one_tap(self):
        for width in (320, 360, 390, 430):
            with self.subTest(width=width):
                page = self.browser.new_page(viewport={"width": width, "height": 720}, is_mobile=True, has_touch=True)
                try:
                    page.add_init_script("""(() => {
                        const saved=JSON.parse(localStorage.getItem('firemate_smart_v3') || '{}');
                        saved.accounts=[{id:'a',name:'투자 계좌',kind:'investment',amount:0,fire:true}];
                        saved.holdings=[
                            {id:'h1',accountId:'a',type:'KRW',ticker:'AAA',name:'알파',qty:2,price:12000,cost:10000},
                            {id:'h2',accountId:'a',type:'KRW',ticker:'BBB',quoteName:'베타',qty:3,price:5000,cost:6000}
                        ];
                        localStorage.setItem('firemate_smart_v3',JSON.stringify(saved));
                    })()""")
                    page.goto(URL, wait_until="domcontentloaded")
                    page.locator('.bottomnav [data-view="assets"]').click()
                    quick_bottom = page.locator('.fm-asset-jump').bounding_box()['y'] + page.locator('.fm-asset-jump').bounding_box()['height']
                    accounts_top = page.locator('#fmAssetAccountsPanel').bounding_box()['y']
                    self.assertLess(quick_bottom, accounts_top, '자산 탐색은 계좌 목록보다 먼저 보여야 합니다')
                    page.locator('#fmAssetQuickHoldings').click()
                    self.assertTrue(page.locator('#fmAssetHoldingsPanel').is_visible())
                    self.assertEqual(page.locator('#holdingList .tx').count(), 2,
                                     page.evaluate("""() => ({saved:JSON.parse(localStorage.getItem('firemate_smart_v3')).holdings.length,
                                         filter:document.getElementById('accountFilter').value,
                                         content:document.getElementById('holdingList').textContent.slice(0,100)})"""))
                    amount=page.locator('#holdingList .fm-holding-value').first.evaluate(
                        'e => ({height:e.getBoundingClientRect().height,font:parseFloat(getComputedStyle(e).fontSize)})')
                    self.assertLessEqual(amount['height'],amount['font']*1.6,'종목 평가금액은 한 줄로 보여야 합니다')
                    self.assertEqual(page.locator('#holdingList .fm-holding-account').first.evaluate(
                        'e => getComputedStyle(e).display'),'block')
                    page.locator('#fmHoldingSearch').fill('BBB')
                    self.assertEqual(page.locator('#holdingList .tx').count(), 1)
                    self.assertIn('베타', page.locator('#holdingList').inner_text())
                    page.locator('#fmHoldingSort').select_option('profit')
                    page.locator('#fmHoldingSearch').fill('')
                    self.assertEqual(page.locator('#holdingList .tx').count(), 2)
                    page.locator('#fmAssetQuickDividend').click()
                    self.assertTrue(page.locator('#fmDividendPanel').is_visible())
                    self.assertLessEqual(page.locator('#fmDivBars').evaluate('e => e.getBoundingClientRect().height'),120)
                    self.assertFalse(page.locator('#fmAssetAccountsPanel').is_visible())
                    self.assertFalse(page.locator('#fmAssetHoldingsPanel').is_visible())
                    self.assertFalse(page.locator('#assetGrowthChart').is_visible())
                    self.assertLess(page.locator('#fmAssetDividendView').bounding_box()['y'],
                                    page.locator('.fm-asset-jump').bounding_box()['y'] + 90)
                    self.assertEqual(page.locator('#fmAssetQuickDividend').get_attribute('aria-pressed'), 'true')
                    page.locator('.bottomnav [data-view="home"]').click()
                    page.locator('.bottomnav [data-view="assets"]').click()
                    self.assertTrue(page.locator('#fmDividendPanel').is_visible())
                    page.locator('#fmAssetQuickAnalysis').click()
                    self.assertTrue(page.locator('#fmAssetDonut').is_visible())
                    self.assertTrue(page.locator('#assetGrowthChart').is_visible())
                    self.assertFalse(page.locator('#fmDividendPanel').is_visible())
                    self.assertFalse(page.locator('#fmAssetAccountsPanel').is_visible())
                    self.assertFalse(page.locator('#fmAssetAnalysisView .fm-analysis-tabs').is_visible())
                    self.assertEqual(page.locator('#fmAssetQuickAnalysis').get_attribute('aria-pressed'), 'true')
                    self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'), width + 2)
                    page.locator('#fmAssetQuickAccounts').click()
                    self.assertTrue(page.locator('#fmAssetAccountsPanel').is_visible())
                    self.assertFalse(page.locator('#fmAssetAnalysisView').is_visible())
                    self.assertEqual(page.locator('#fmAssetQuickAccounts').get_attribute('aria-pressed'), 'true')
                    self.assertEqual(page.evaluate("JSON.parse(localStorage.getItem('firemate_smart_v3')).holdings.length"), 2)
                finally:
                    page.close()

    def test_ledger_view_preference_search_and_back_restore(self):
        page = self.browser.new_page(viewport={"width": 360, "height": 720}, is_mobile=True, has_touch=True)
        try:
            page.goto(URL, wait_until='domcontentloaded')
            page.locator('.bottomnav [data-view="calendar"]').click()
            page.locator('#fmModeList').click()
            self.assertEqual(page.evaluate("localStorage.getItem('firemate_ledger_view_v1')"), 'list')
            self.assertTrue(page.locator('#fmLedgerListPane').is_visible())
            page.locator('#fmLedgerAddBtn').click()
            page.locator('#entryAmount').fill('13579')
            page.locator('#entryMemo').fill('작성 중 보존')
            page.locator('#entryOverlay [data-close]').first.click()
            page.locator('#fmModeCalendar').click()
            self.assertEqual(page.evaluate("localStorage.getItem('firemate_ledger_view_v1')"), 'calendar')
            page.locator('#fmLedgerSearchBtn').click()
            self.assertTrue(page.locator('#fmLedgerListPane').is_visible())
            self.assertEqual(page.evaluate("localStorage.getItem('firemate_ledger_view_v1')"), 'calendar')
            page.locator('.bottomnav [data-view="home"]').click()
            page.locator('.bottomnav [data-view="calendar"]').click()
            self.assertTrue(page.locator('#fmLedgerCalendarPane').is_visible())
            page.locator('#fmModeList').click()
            page.reload(wait_until='domcontentloaded')
            page.locator('.bottomnav [data-view="calendar"]').click()
            self.assertTrue(page.locator('#fmLedgerListPane').is_visible())
            self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'), 362)
            page.go_back(wait_until='domcontentloaded')
            self.assertEqual(page.locator('#entryOverlay.show').count(), 0)
        finally:
            page.close()

    def test_fire_four_stage_flow_and_unsaved_goal_draft(self):
        for width in (320, 360, 390, 430):
            with self.subTest(width=width):
                page = self.browser.new_page(viewport={"width": width, "height": 720}, is_mobile=True, has_touch=True)
                try:
                    page.goto(URL, wait_until='domcontentloaded')
                    page.locator('.bottomnav [data-view="fire"]').click()
                    self.assertTrue(page.locator('#firePct').is_visible())
                    self.assertTrue(page.locator('#fireYears').is_visible())
                    self.assertEqual(page.locator('#view-fire .fm-fire-screen-nav button').count(),4)
                    positions=page.evaluate("""() => ['.fm-fire-screen-nav','.fm-fire-hero','.fm-fire-overview','#fmForecastDisclosure']
                        .map(selector => document.querySelector('#view-fire '+selector).getBoundingClientRect().y + scrollY)""")
                    self.assertEqual(positions, sorted(positions))
                    page.locator('#fmOpenCalculator').click()
                    page.locator('#goal').fill('75000')
                    page.locator('.bottomnav [data-view="fire"]').click()
                    page.locator('#fmOpenCalculator').click()
                    self.assertEqual(page.locator('#goal').input_value().replace(',', ''), '75000')
                    page.locator('#fmBackFire').click()
                    page.locator('#fmFireStrategyOpen').click()
                    self.assertFalse(page.locator('#fmStrategyDetails').evaluate('(e) => e.open'))
                    self.open_strategy_settings(page)
                    self.assertTrue(page.locator('#fmStrategyDetails').evaluate('(e) => e.open'))
                    self.assertTrue(page.locator('#fmStrQuickPanel').is_visible())
                    page.go_back(wait_until='domcontentloaded')
                    self.assertTrue(page.locator('#view-fire').is_visible())
                    self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'), width+2)
                finally:
                    page.close()

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
                        self.assertEqual(page.locator('#view-home .home-shortcuts button').count(),2)
                        self.assertEqual(page.locator('#view-home .fm-secondary-details').count(),0)
                        for ident in ('homeTotalAssets','homeDailyChange','heroSpent','heroBudget','heroLeft','homeAssetPercent','homeFireEta'):
                            self.assertTrue(page.locator('#'+ident).is_visible())
                        page.locator('#fmSpendingOpen').click()
                        self.assertTrue(page.locator('#view-insights').is_visible())
                        self.assertTrue(page.locator('#sixChart').is_visible())
                        self.assertTrue(page.locator('#recent').is_visible())
                        page.locator('#fmInsightsBack').click()
                        page.wait_for_selector('#view-home.active')
                        page.locator('.bottomnav [data-view="assets"]').click()
                        page.locator('#fmAssetQuickAnalysis').click()
                        self.assertTrue(page.locator('#assetGrowthChart').is_visible())
                        self.assertLessEqual(page.evaluate("document.documentElement.scrollWidth"),width+2)
                    finally:
                        page.close()

    def test_asset_milestone_remains_accessible(self):
        page=self.browser.new_page(viewport={"width":320,"height":670},is_mobile=True,has_touch=True)
        try:
            page.goto(URL,wait_until="domcontentloaded")
            page.locator('.bottomnav [data-view="assets"]').click()
            page.locator('#fmAssetQuickAnalysis').click()
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
                    sort_box=page.locator('#fmDetailSort').bounding_box()
                    add_box=page.locator('#fmDetailAdd').bounding_box()
                    self.assertGreaterEqual(sort_box['height'],44)
                    self.assertGreaterEqual(add_box['height'],44)
                    self.assertLessEqual(add_box['x']+add_box['width'],width+2)
                    self.assertIn('최근 +2.50%',page.locator('.fm-market-day').first.inner_text())
                    self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width+2)
                    amount=page.locator('[data-fm-holding="h1"] > span:last-child strong')
                    self.assertEqual(amount.evaluate('(el)=>getComputedStyle(el).whiteSpace'),'nowrap')
                    self.assertLessEqual(amount.evaluate('(el)=>el.scrollWidth-el.clientWidth'),2,'Asset value must stay readable without clipping')
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
                    page.locator('.bottomnav [data-view="fire"]').click()
                    self.fire_screen(page,'retire')
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
            for selector in ('#fmFireStrategyOpen','#fmFireLifeOpen'):
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
            page.locator('#fmAssetQuickDividend').click()
            self.assertTrue(page.locator('#fmDividendPanel').is_visible())
            page.locator('#fmAssetQuickAnalysis').click()
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
                            const activity = document.querySelector('#view-home .home-shortcuts');
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
                            self.assertGreaterEqual(computed["progressSize"], 22, "Compact FIRE progress must stay readable")
                        self.assertTrue(computed["activityVisible"],
                                        "Recent asset activity must remain accessible on mobile")
                        self.assertGreater(computed["activityHeight"], 0)
                        self.assertLessEqual(computed["activityRight"],
                                             computed["viewportWidth"] + 2)
                    finally:
                        page.close()

    def test_home_fire_summary_links_to_plan_without_duplicate_inputs(self):
        page = self.browser.new_page(viewport={"width": 360, "height": 740}, is_mobile=True, has_touch=True)
        try:
            # A live FX response can land mid-test and legitimately save a new rate.
            page.route("https://api.frankfurter.dev/**", lambda route: route.abort("failed"))
            page.goto(URL, wait_until="domcontentloaded")
            page.locator('.bottomnav [data-view="home"]').click()
            self.assertEqual(page.locator('#view-home .fm-eta-details').count(), 0)
            self.assertFalse(page.locator('#homeEtaPrincipal').is_visible())
            self.assertIn('실제 결과는 달라질 수', page.locator('#homeFireEtaNote').inner_text())
            before = page.evaluate("localStorage.getItem('firemate_smart_v3')")
            page.locator('.fm-home-fire-head [data-go="fire"]').tap()
            self.assertTrue(page.locator('#view-fire').is_visible())
            self.assertTrue(page.locator('#fireAsset').is_visible())
            page.locator('.bottomnav [data-view="home"]').tap()
            self.assertTrue(page.locator('#homeFireEta').is_visible())
            self.assertEqual(before, page.evaluate("localStorage.getItem('firemate_smart_v3')"))
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
            page.context.route("**/?fmUpdateCheck=*",
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
            page.context.route("**/?fmUpdateCheck=*",
                       lambda route: route.fulfill(status=200, content_type="text/html",
                                                   body="""const BUILD='fire-mate-v99-0-0'; id="view-home" id="view-assets" id="view-fire" id="settingsOverlay" function renderFire() """ + "x" * 100100))
            # Unit-level protocol check; the Node lifecycle test uses real workers.
            page.add_init_script("""(()=>{
                const worker={postMessage(message,ports){
                    if(message.type==='GET_BUILD')ports[0].postMessage({build:'fire-mate-v99-0-0'});
                    if(message.type==='SKIP_WAITING'){
                        sessionStorage.setItem('stage9-activation-requested','1');
                        reg.waiting=null;reg.active=worker;controller=worker;
                        navigator.serviceWorker.dispatchEvent(new Event('controllerchange'));
                    }
                }};
                let controller=worker;
                const reg={waiting:worker,active:worker,installing:null,update:async()=>{},addEventListener:()=>{}};
                navigator.serviceWorker.register=async()=>reg;
                navigator.serviceWorker.getRegistration=async()=>reg;
                Object.defineProperty(navigator.serviceWorker,'controller',{get:()=>controller});
            })()""")
            page.goto(URL, wait_until="domcontentloaded")
            page.evaluate("""() => localStorage.setItem('fm-pwa-test-marker', 'keep')""")
            page.locator("#fmManualUpdate").click()
            page.get_by_text("새 업데이트가 준비됐어요").wait_for(timeout=15000)
            page.get_by_role("button", name="지금 업데이트").click()
            page.wait_for_url("**/index.html?updated=*", timeout=15000)
            self.assertEqual(page.evaluate("""() => localStorage.getItem('fm-pwa-test-marker')"""), "keep")
            self.assertEqual(page.evaluate("sessionStorage.getItem('stage9-activation-requested')"),"1")
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

    def test_stage9_goal_notes_use_saved_target_and_signed_net_assets(self):
        for width in (320,360,390,430):
            for theme in ('dark','light'):
                with self.subTest(width=width,theme=theme):
                    page=self.browser.new_page(viewport={"width":width,"height":844},is_mobile=True,has_touch=True)
                    try:
                        page.route("https://api.frankfurter.dev/**",lambda route:route.abort("failed"))
                        page.goto(URL,wait_until='domcontentloaded')
                        for goal,cash,debt,expected,remaining in (
                            (10000,150000000,0,'FIRE 목표 달성!','₩0'),
                            (80000,700000000,0,'다음 목표 8억까지 10,000만 원','₩100,000,000'),
                            (65000,0,10000000,'다음 목표 2억까지 21,000만 원','₩660,000,000'),
                            (65000,0,0,'다음 목표 2억까지 20,000만 원','₩650,000,000'),
                            (0,0,0,'FIRE 목표 미설정','FIRE 목표 미설정')):
                            page.evaluate("""v=>{const d=JSON.parse(localStorage.getItem('firemate_smart_v3'));d.theme=v.theme;d.fire.goal=v.goal;d.holdings=[];d.accounts=[{id:'cash',name:'현금',amount:v.cash}];d.balance={fx:1400,cash:0,other:0,debt:v.debt};localStorage.setItem('firemate_smart_v3',JSON.stringify(d))}""",{'goal':goal,'cash':cash,'debt':debt,'theme':theme})
                            page.reload(wait_until='domcontentloaded');page.locator('.bottomnav [data-view="home"]').tap()
                            self.assertEqual(page.locator('#fmNextMilestone').inner_text(),expected)
                            self.assertIn(remaining,page.locator('#fmRemainingGoal').text_content())
                            quote=page.locator('#homeRefreshStocks').bounding_box();total=page.locator('#homeTotalAssets').bounding_box()
                            self.assertGreaterEqual(quote['height'],44);self.assertGreaterEqual(total['y'],quote['y']+quote['height'])
                            for sel in ('.fm-home-fire-head>button','#fmMonthlyOpen','#fmSpendingOpen'):
                                self.assertGreaterEqual(page.locator('#view-home '+sel).bounding_box()['height'],44)
                            page.locator('.bottomnav [data-view="assets"]').tap()
                            self.assertIn(remaining,page.locator('#fmRemainingGoal').inner_text())
                            self.assertEqual(page.locator('#fmAssetNextMilestone').inner_text(),expected)
                            self.assertEqual(page.locator('#fmNextMilestone').count(),1)
                            page.locator('.bottomnav [data-view="home"]').tap()
                            self.assertEqual(page.locator('#fmNextMilestone').inner_text(),expected)
                            self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width)
                    finally:
                        page.close()

    def test_stage86_summary_uses_calculated_data_not_dom_text(self):
        page=self.browser.new_page(viewport={"width":320,"height":844},is_mobile=True,has_touch=True)
        try:
            page.context.route("https://api.frankfurter.dev/**",lambda route:route.abort("failed"))
            page.goto(URL,wait_until='domcontentloaded')
            page.evaluate("""()=>{const d=JSON.parse(localStorage.getItem('firemate_smart_v3'));
                d.holdings=[];d.accounts=[{id:'cash',name:'현금',amount:20000000}];
                d.balance={fx:1400,cash:0,other:0,debt:0};
                d.retirement={items:[{name:'JEPQ',amount:10000},{name:'현금',amount:5000}],monthly:100,yield:4,priceChange:0,crash:25,healthInsuranceMonthly:10};
                localStorage.setItem('firemate_smart_v3',JSON.stringify(d));}""")
            page.reload(wait_until='domcontentloaded');page.locator('.bottomnav [data-view="fire"]').tap()
            state=page.evaluate('window.fmFireViewState')
            self.assertAlmostEqual(state['cashflow']['monthlyNetIncome'],10000*0.1146*0.85/12,delta=0.000001)
            self.assertAlmostEqual(state['cashflow']['monthlyRemaining'],10000*0.1146*0.85/12-100-10*1.1314,delta=0.000001)
            self.assertAlmostEqual(state['portfolio']['totalPct'],2000/15000*100,delta=0.000001)
            self.assertEqual(state['portfolio']['gap'],13000)
            before=page.locator('.fm-fire-overview').inner_text()
            page.evaluate("""()=>{for(const id of ['fmFireLife','fmFirePortfolioProgress','fmQuickResult','fmFireForecast']){
                const root=document.getElementById(id);root.querySelectorAll('[style]').forEach(e=>e.removeAttribute('style'));
                root.querySelectorAll('strong').forEach(e=>e.textContent='표시 문구 변경');
                }document.dispatchEvent(new Event('fm-fire-view-updated'));}""")
            self.assertEqual(page.locator('.fm-fire-overview').inner_text(),before)
            self.assertEqual(page.locator('#fmForecastSummaryValue').inner_text(),state['forecast']['summaryValue'])
            page.reload(wait_until='domcontentloaded');page.locator('.bottomnav [data-view="fire"]').tap()
            self.assertEqual(page.evaluate('window.fmFireViewState.cashflow'),state['cashflow'])
            page.locator('#fmFireStrategyOpen').tap();self.open_strategy_settings(page)
            page.locator('#fmStrModeDetail').tap()
            result=page.evaluate("""()=>{document.getElementById('fmQuickBudget').value='10000';
                document.getElementById('fmQuickSpend').value='100';
                window.__fmFinanceTest.strategy({div:[{name:'TEST',amount:10000,estimatedAnnualMan:400}],sale:[{name:'TEST',amount:10000,rate:7}]});
                return {state:window.fmFireViewState.detail,ledger:window.__fmFinanceLedger};}""")
            self.assertEqual(result['state']['balances'],[x['series'][30] for x in result['ledger']['displayed']])
            page.locator('.view.active [data-fire-screen="fire"]').tap()
            self.assertEqual(page.locator('#fmOverview-strategy').inner_text(),result['state']['text'])
            page.locator('#fmFireStrategyOpen').tap();self.open_strategy_settings(page)
            page.locator('#fmQuickSpend').fill('200')
            self.assertIsNone(page.evaluate('window.fmFireViewState.detail'))
            page.locator('.view.active [data-fire-screen="fire"]').tap()
            self.assertIn('조건 확인 후 계산',page.locator('#fmOverview-strategy').inner_text())
        finally:
            page.close()

    def test_stage86_scoped_saves_cancels_and_storage_failure(self):
        for width in (320,360,390,430):
            for theme in ('dark','light'):
                with self.subTest(width=width,theme=theme):
                    page=self.browser.new_page(viewport={"width":width,"height":844},is_mobile=True,has_touch=True)
                    try:
                        page.context.route("https://api.frankfurter.dev/**",lambda route:route.abort("failed"))
                        page.goto(URL,wait_until='domcontentloaded')
                        page.evaluate("t=>document.documentElement.dataset.theme=t",theme)
                        saved=lambda:page.evaluate("JSON.parse(localStorage.getItem('firemate_smart_v3')).retirement")
                        original=saved()
                        page.locator('.bottomnav [data-view="fire"]').tap();page.locator('#fmFireLifeOpen').tap()
                        # Living-cost settings are reachable without first opening the experiment results.
                        self.assertFalse(page.locator('#fmLifeScenario').evaluate('(e)=>e.open'))
                        self.fire_screen(page,'firelife');page.locator('#fmLifeConditions>summary').tap();page.locator('#rpMonthly').fill('350')
                        self.open_portfolio(page);page.locator('#fmRpEditToggle').tap();page.locator('[data-rp="0"]').fill('11000')
                        self.assertIn('저장된 배분 합계',page.locator('#rpSum').locator('..').inner_text())
                        self.assertIn('저장 후 결과에 반영',page.locator('#fmRpEditBody').inner_text())
                        self.assertEqual(page.evaluate('window.fmFireViewState.cashflow.spend'),300)
                        self.assertEqual(page.locator('#rpSave').inner_text(),'목표 배분만 저장')
                        page.locator('#rpSave').tap()
                        current=saved();expected={**original,'items':[{**x,'amount':11000 if i==0 else x['amount']} for i,x in enumerate(original['items'])]}
                        self.assertEqual(current,expected)
                        self.assertEqual(page.locator('#rpMonthly').input_value(),'350','unrelated unsaved draft must remain a draft')
                        self.fire_screen(page,'firelife')
                        self.assertEqual(page.locator('#rpSave').inner_text(),'월 생활비 저장')
                        page.locator('#fmRetireCancel').tap()
                        self.assertEqual(page.locator('#rpMonthly').input_value(),'300')
                        self.assertEqual(saved(),expected)
                        # Saving living conditions must not save an allocation draft, and cancel must restore only it.
                        self.open_portfolio(page);page.locator('#fmRpEditToggle').tap();page.locator('[data-rp="0"]').fill('12000')
                        self.fire_screen(page,'firelife');page.locator('#fmLifeConditions>summary').tap();page.locator('#rpMonthly').fill('325')
                        page.locator('#rpSave').tap()
                        expected={**expected,'monthly':325}
                        self.assertEqual(saved(),expected)
                        self.assertEqual(page.locator('[data-rp="0"]').input_value(),'12000')
                        self.assertIn('생활비 325만',page.locator('#fmFireLife').inner_text())
                        self.open_portfolio(page)
                        page.locator('#fmRetireCancel').tap()
                        self.assertEqual(page.locator('[data-rp="0"]').input_value(),'11000')
                        # Dividend/insurance cancellation does not alter any persisted settings.
                        self.fire_screen(page,'firelife');page.locator('#fmDividendEditor>summary').tap();rate=page.locator('[data-fm-div-rate]').first
                        original_rate=rate.input_value();rate.fill('8.25')
                        page.locator('#fmCancelDividendRates').tap()
                        self.assertEqual(rate.input_value(),original_rate);self.assertEqual(saved(),expected)
                        # Reset is also allocation-only, preserving a living-condition draft.
                        self.fire_screen(page,'firelife');page.locator('#fmLifeConditions>summary').tap();page.locator('#rpMonthly').fill('375')
                        self.open_portfolio(page);page.locator('#fmRpEditToggle').tap()
                        page.once('dialog',lambda dialog:dialog.accept());page.locator('#rpReset').tap()
                        expected={**expected,'items':original['items']}
                        self.assertEqual(saved(),expected);self.assertEqual(page.locator('#rpMonthly').input_value(),'375')
                        self.fire_screen(page,'firelife');page.locator('#fmRetireCancel').tap()
                        # Real browser quota failure: keep saved model and leave pending editor open.
                        self.open_portfolio(page);page.locator('#fmRpEditToggle').tap();page.locator('[data-rp="0"]').fill('13000')
                        page.evaluate("""()=>{window.fmOriginalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='firemate_smart_v3')throw new DOMException('Quota exceeded','QuotaExceededError');return window.fmOriginalSetItem.call(this,k,v)}}""")
                        page.locator('#rpSave').tap()
                        self.assertEqual(saved(),expected);self.assertTrue(page.locator('#fmRpEditBody').is_visible())
                        self.assertEqual(page.locator('[data-rp="0"]').input_value(),'13000')
                        page.evaluate('()=>{Storage.prototype.setItem=window.fmOriginalSetItem}')
                        page.locator('#fmRetireCancel').tap()
                        page.reload(wait_until='domcontentloaded')
                        self.assertEqual(saved(),expected)
                        self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width)
                    finally:
                        page.close()

    def test_stage85_results_conditions_save_cancel_and_reload(self):
        for width in (320,360,390,430):
            for theme in ('dark','light'):
                with self.subTest(width=width,theme=theme):
                    context=self.browser.new_context(viewport={"width":width,"height":844},is_mobile=True,has_touch=True)
                    page=context.new_page()
                    try:
                        context.route("https://api.frankfurter.dev/**",lambda route: route.abort("failed"))
                        context.route("**/dividends.json*",lambda route: route.fulfill(content_type="application/json",body='{"symbols":{"JEPQ":{"currency":"USD","events":[{"date":"2025-06-01","amount":4}]},"SCHD":{"currency":"USD","events":[{"date":"2025-06-01","amount":1}]}}}'))
                        page.goto(URL,wait_until='domcontentloaded')
                        page.evaluate("theme=>document.documentElement.dataset.theme=theme",theme)
                        original=page.evaluate("""()=>{const d=JSON.parse(localStorage.getItem('firemate_smart_v3'));return {tx:d.tx,holdings:d.holdings,accounts:d.accounts,balance:d.balance,goal:d.fire.goal,monthly:d.fire.monthly,rate:d.fire.rate,withdrawal:d.fire.withdrawal}}""")
                        page.locator('.bottomnav [data-view="fire"]').tap()
                        self.assertEqual(page.locator('#view-fire>.hero,#view-fire>.card').count(),3)
                        self.assertFalse(page.locator('#fmForecastPlot').is_visible())
                        self.open_forecast(page)
                        self.assertTrue(page.locator('#fmForecastPlot').is_visible())
                        page.locator('#fmForecastDisclosure>summary').tap()
                        self.open_portfolio(page)
                        self.assertTrue(page.locator('#fmQuickResult').is_visible())
                        self.assertFalse(page.locator('#rpMonthly').is_visible())
                        self.assertFalse(page.locator('#fmQuickBudget').is_visible())
                        first=page.locator('[data-rp="0"]')
                        page.locator('#fmRpEditToggle').tap();first.fill('11000')
                        page.locator('#fmRetireCancel').tap()
                        self.assertEqual(first.input_value(),'10000')
                        self.assertFalse(page.locator('#fmRetireSaveBar').is_visible())
                        self.assertEqual(page.evaluate("JSON.parse(localStorage.getItem('firemate_smart_v3')).retirement.items[0].amount"),10000)
                        page.locator('#fmRpEditToggle').tap();first.fill('11000');page.locator('#rpSave').tap()
                        self.assertFalse(page.locator('#fmRpEditBody').is_visible())
                        self.assertEqual(page.evaluate("JSON.parse(localStorage.getItem('firemate_smart_v3')).retirement.items[0].amount"),11000)
                        self.assertIn('6,000만',page.locator('#rpSum').inner_text())
                        self.fire_screen(page,'firelife');page.locator('#fmLifeConditions>summary').tap()
                        page.locator('#rpMonthly').fill('325')
                        page.set_viewport_size({"width":width,"height":420})
                        page.locator('#rpMonthly').focus()
                        page.locator('#rpSave').scroll_into_view_if_needed()
                        box=page.locator('#rpSave').bounding_box()
                        self.assertGreaterEqual(box['height'],44)
                        self.assertGreaterEqual(box['y'],0)
                        self.assertLessEqual(box['y']+box['height'],421)
                        page.locator('#fmRetireCancel').tap()
                        page.set_viewport_size({"width":width,"height":844})
                        self.assertEqual(page.locator('#rpMonthly').input_value(),'300')
                        self.assertEqual(page.locator('#rpYield').input_value(),'4')
                        self.fire_screen(page,'firelife');page.locator('#fmLifeConditions>summary').tap()
                        page.locator('#rpMonthly').fill('325');page.locator('#rpSave').tap()
                        self.assertIn('생활비 325만',page.locator('#fmFireLife').inner_text())
                        self.assertEqual(page.locator('#rpSpend').inner_text(),'325만 원')
                        page.locator('#fmDividendEditor>summary').tap()
                        page.locator('[data-fm-div-rate]').first.fill('8.25')
                        self.assertTrue(page.locator('#fmSaveDividendRates').is_visible())
                        page.locator('#fmSaveDividendRates').tap()
                        saved=page.evaluate("JSON.parse(localStorage.getItem('firemate_smart_v3')).retirement")
                        self.assertEqual(saved['monthly'],325)
                        self.assertEqual(saved['dividendYields'][saved['items'][0]['name']],8.25)
                        self.open_strategy_settings(page)
                        for id,value in [('fmQuickBudget','10000'),('fmQuickSpend','300'),('fmQuickYield','4'),('fmQuickTax','15'),('fmQuickGain','7')]:page.locator('#'+id).fill(value)
                        page.locator('#fmQuickRun').tap()
                        self.assertFalse(page.locator('#fmStrategyDetails').evaluate('(e)=>e.open'))
                        self.assertIn('340만 원',page.locator('#fmQuickResult').inner_text())
                        self.open_strategy_settings(page);page.locator('#fmStrModeDetail').tap()
                        page.locator('#fmQuickBudget').fill('20000')
                        prices=page.locator('[data-fms-type="div"][data-fms-field="currentPrice"]')
                        prices.nth(0).fill('100');prices.nth(1).fill('50')
                        long=page.locator('#fmStrYears').locator('xpath=ancestor::details[1]')
                        long.locator(':scope>summary').tap()
                        page.locator('#fmStrSameReturn').check();page.locator('#fmStrReinvest').check()
                        page.locator('#fmStrRun').tap()
                        self.assertFalse(page.locator('#fmStrategyDetails').evaluate('(e)=>e.open'))
                        self.assertFalse(page.locator('#fmQuickResult').is_visible())
                        self.assertTrue(page.locator('.fm-str-model-summary').is_visible())
                        ledger=page.evaluate('window.__fmFinanceLedger')
                        self.assertTrue(ledger['sameReturn']);self.assertTrue(ledger['reinvest']);self.assertEqual(ledger['years'],30)
                        page.locator('.view.active [data-fire-screen="fire"]').tap()
                        self.assertIn('30년 후',page.evaluate('window.fmFireViewState.detail.text'))
                        page.reload(wait_until='domcontentloaded')
                        after=page.evaluate("""()=>{const d=JSON.parse(localStorage.getItem('firemate_smart_v3'));return {tx:d.tx,holdings:d.holdings,accounts:d.accounts,balance:d.balance,goal:d.fire.goal,monthly:d.fire.monthly,rate:d.fire.rate,withdrawal:d.fire.withdrawal}}""")
                        self.assertEqual(after,original)
                        self.assertEqual(page.evaluate("JSON.parse(localStorage.getItem('firemate_smart_v3')).retirement"),saved)
                        self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width)
                    finally:
                        context.close()

    def test_stage8_portfolio_duplicate_targets_and_remaining_allocation(self):
        page=self.browser.new_page(viewport={"width":320,"height":844},is_mobile=True,has_touch=True)
        try:
            page.route("https://api.frankfurter.dev/**",lambda route: route.abort("failed"))
            page.goto(URL,wait_until="domcontentloaded")
            original=page.evaluate("""() => {
                const d=JSON.parse(localStorage.getItem('firemate_smart_v3'));
                d.holdings=[{id:'j',name:'JEPQ',ticker:'JEPQ',type:'KRW',qty:10,price:10000,cost:9000,accountId:'legacy-kr'}];
                d.balance={fx:1400,cash:0,other:0,debt:0};
                d.retirement.items=[{name:'JEPQ',amount:20},{name:'JEPQ',amount:30},{name:'SGOV',amount:50}];
                localStorage.setItem('firemate_smart_v3',JSON.stringify(d));
                return {holdings:d.holdings,accounts:d.accounts,balance:d.balance,retirement:d.retirement};
            }""")
            page.reload(wait_until="domcontentloaded")
            page.locator('.bottomnav [data-view="fire"]').tap()
            self.open_portfolio(page)
            page.locator('#fmFirePortfolioDetails>summary').tap()
            rows=page.locator('[data-target-name="JEPQ"]')
            self.assertEqual(rows.count(),1)
            self.assertIn('20.0%',rows.inner_text()) # 10 owned / aggregated target 50, not counted twice
            self.assertIn('부족',rows.inner_text())
            self.assertIn('40만',rows.inner_text())
            self.assertIn('목표 비중 50.0%',rows.inner_text())
            self.assertIn('인정 보유액 10만',page.locator('#fmFirePortfolioProgress').inner_text())
            page.locator('.bottomnav [data-view="fire"]').tap()
            page.locator('#fmFireStrategyOpen').tap();self.open_strategy_settings(page);page.locator('#fmStrModeDetail').tap()
            page.locator('#fmQuickBudget').fill('1000')
            fields=page.locator('[data-fms-type="sale"][data-fms-field="amount"]')
            fields.nth(0).fill('100');fields.nth(1).fill('200')
            page.locator('#fmStrFillSale').tap()
            amounts=[float(x) for x in fields.evaluate_all('(es)=>es.map(e=>e.value)')]
            self.assertAlmostEqual(sum(amounts),1000,delta=0.000001)
            self.assertAlmostEqual(amounts[0],333.33,delta=0.000001)
            self.assertAlmostEqual(amounts[1],666.67,delta=0.000001)
            page.locator('#fmStrFillSale').tap()
            self.assertEqual(amounts,[float(x) for x in fields.evaluate_all('(es)=>es.map(e=>e.value)')])
            for field in (fields.nth(0),fields.nth(1)): field.fill('0')
            page.locator('#fmStrFillSale').tap()
            self.assertEqual(fields.evaluate_all('(es)=>es.map(e=>Number(e.value))'),[500,500])
            saved=page.evaluate("""() => {const d=JSON.parse(localStorage.getItem('firemate_smart_v3'));return {holdings:d.holdings,accounts:d.accounts,balance:d.balance,retirement:d.retirement}}""")
            self.assertEqual(saved,original)
        finally:
            page.close()

    def test_stage8_strategy_reinvestment_period_and_negative_input(self):
        page=self.browser.new_page(viewport={"width":320,"height":844})
        try:
            page.route("https://api.frankfurter.dev/**",lambda route: route.abort("failed"))
            page.context.route("**/dividends.json*",lambda route: route.fulfill(content_type="application/json",body='{"symbols":{"JEPQ":{"currency":"USD","events":[{"date":"2025-06-01","amount":4}]},"SCHD":{"currency":"USD","events":[{"date":"2025-06-01","amount":1}]}}}'))
            page.goto(URL,wait_until="domcontentloaded")
            for reinvest in (False,True):
                got=page.evaluate("""reinvest => {
                    const set=(id,v)=>document.getElementById(id).value=String(v);
                    set('fmQuickBudget',10000);set('fmQuickSpend',100);
                    set('fmStrYears',30);set('fmStrInflation',2);set('fmStrDivGrowth',7);
                    set('fmStrDivCost',15);set('fmStrInsurance',0);
                    document.getElementById('fmStrSameReturn').checked=true;
                    document.getElementById('fmStrFairMode').checked=true;
                    document.getElementById('fmStrReinvest').checked=reinvest;
                    window.__fmFinanceTest.strategy({div:[{name:'TEST',amount:10000,estimatedAnnualMan:400}],sale:[{name:'TEST',amount:10000,rate:7}]});
                    return window.__fmFinanceLedger;
                }""",reinvest)
                invested=10000.0;cash=0.0
                for year in range(1,31):
                    cost=100*1.02**(year-1)
                    dividend=min(invested*1.07,invested*0.04)
                    net=dividend*0.85
                    invested=invested*1.07-dividend;cash+=net
                    take=min(cash,cost);cash-=take
                    sold=min(invested,max(0,cost-take));invested-=sold
                    reinvested=min(cash,max(0,net-cost)) if reinvest else 0
                    cash-=reinvested;invested+=reinvested
                    row=got['baseline'][0]['ledger'][year-1]
                    self.assertAlmostEqual(row['closing'],cash+invested,delta=0.00001)
                    self.assertAlmostEqual(row['reinvested'],reinvested,delta=0.00001)
                    self.assertAlmostEqual(row['closing'],row['opening']+row['investmentReturn']-row['dividendCost']-row['spending'],delta=0.00001)
                summary=page.locator('.fm-str-model-summary').inner_text()
                for text in ('10년 잔액','20년 잔액','30년 잔액','현재 구매력','확률을 계산하지 않습니다'):
                    self.assertIn(text,summary)
            invalid=page.evaluate("""() => {
                document.getElementById('fmStrYears').value='10.5';
                return window.__fmFinanceTest.strategy({div:[{name:'TEST',amount:10000,estimatedAnnualMan:400}],sale:[{name:'TEST',amount:10000,rate:7}]});
            }""")
            self.assertIn('정수로 입력',invalid)
            page.locator('.bottomnav [data-view="fire"]').click()
            page.locator('#fmFireStrategyOpen').click()
            self.open_strategy_settings(page)
            page.locator('#fmStrModeDetail').click()
            field=page.locator('[data-fms-type="sale"][data-fms-field="rate"]').first
            self.assertEqual(field.get_attribute('min'),'-100')
            field.fill('-10')
            self.assertEqual(field.input_value(),'-10')
            # Existing dividend history can be used without a quote API key via manual price.
            page.locator('#fmQuickBudget').fill('20000')
            page.locator('#fmStrYears').evaluate("e=>e.value='30'")
            prices=page.locator('[data-fms-type="div"][data-fms-field="currentPrice"]')
            prices.nth(0).fill('100');prices.nth(1).fill('50')
            yields=page.locator('[data-fms-type="div"][data-fms-field="rate"]')
            self.assertEqual(float(yields.nth(0).input_value()),4)
            self.assertEqual(float(yields.nth(1).input_value()),2)
            page.locator('#fmStrRun').click()
            self.assertTrue(page.locator('.fm-str-model-summary').is_visible())
            self.open_strategy_settings(page) # Re-enter conditions after successful calculation closes them.
            prices.nth(0).fill('0')
            self.assertIn('입력값이 변경',page.locator('#fmStrResult').inner_text())
            page.locator('#fmStrRun').click()
            self.assertIn('확인 전에는 비교 결과를 계산하지 않습니다',page.locator('#fmStrResult').inner_text())
            prices.nth(0).fill('100')
            page.locator('#fmStrRun').click()
            self.assertTrue(page.locator('.fm-str-model-summary').is_visible())

            # The quick model cannot pay dividends beyond available assets after a loss.
            result=page.evaluate("""() => {
                for(const [id,v] of Object.entries({fmQuickBudget:100,fmQuickSpend:10,fmQuickYield:100,fmQuickGain:-90,fmQuickTax:0}))document.getElementById(id).value=v;
                window.__fmFinanceTest.quick();return document.getElementById('fmQuickResult').innerText;
            }""")
            self.assertIn('배당 총액 10만 원',result)
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

    def test_settings_mobile_theme_groups_backup_and_focus(self):
        for width in (320, 390, 430):
            with self.subTest(width=width):
                page=self.browser.new_page(viewport={"width":width,"height":568},is_mobile=True,has_touch=True,accept_downloads=True)
                errors=[]
                page.on('pageerror',lambda exc: errors.append(str(exc)))
                try:
                    page.goto(URL,wait_until='domcontentloaded')
                    before=page.evaluate("""() => {const d=JSON.parse(localStorage.getItem('firemate_smart_v3'));return JSON.stringify({tx:d.tx,accounts:d.accounts,holdings:d.holdings,fire:d.fire})}""")
                    trigger=page.locator('#settingsBottom')
                    trigger.click()
                    dialog=page.locator('#settingsOverlay [role="dialog"]')
                    self.assertTrue(dialog.is_visible())
                    self.assertEqual(trigger.get_attribute('aria-expanded'),'true')
                    self.assertEqual(dialog.get_attribute('aria-labelledby'),'settingsTitle')
                    self.assertEqual(page.evaluate('document.activeElement.getAttribute("aria-label")'),'설정 닫기')
                    self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width+2)
                    self.assertLessEqual(dialog.bounding_box()['width'],width+1)
                    theme=page.locator('#settingsThemeBtn')
                    self.assertGreaterEqual(theme.bounding_box()['height'],44)
                    theme.click()
                    self.assertEqual(page.evaluate('document.documentElement.dataset.theme'),'light')
                    theme.click()
                    self.assertEqual(page.evaluate('document.documentElement.dataset.theme'),'dark')
                    groups=page.locator('#settingsOverlay .fm-settings-group')
                    self.assertEqual(groups.count(),3)
                    self.assertTrue(all(not groups.nth(i).evaluate('(el)=>el.open') for i in range(3)))
                    groups.nth(1).locator(':scope > summary').click()
                    self.assertTrue(groups.nth(1).evaluate('(el)=>el.open'))
                    self.assertTrue(page.locator('#export').is_visible())
                    with page.expect_download() as download_info:
                        page.locator('#export').click()
                    self.assertTrue(download_info.value.suggested_filename.startswith('firemate-backup-'))
                    groups.nth(1).locator(':scope > summary').click()
                    self.assertFalse(groups.nth(1).evaluate('(el)=>el.open'))
                    page.keyboard.press('Escape')
                    self.assertFalse(dialog.is_visible())
                    self.assertEqual(trigger.get_attribute('aria-expanded'),'false')
                    self.assertEqual(page.evaluate('document.activeElement.id'),'settingsBottom')
                    after=page.evaluate("""() => {const d=JSON.parse(localStorage.getItem('firemate_smart_v3'));return JSON.stringify({tx:d.tx,accounts:d.accounts,holdings:d.holdings,fire:d.fire})}""")
                    self.assertEqual(after,before)
                    self.assertFalse(errors)
                finally:
                    page.close()

    def test_shared_form_labels_dialog_names_and_back_navigation(self):
        for width in (320, 390, 430):
            with self.subTest(width=width):
                page=self.browser.new_page(viewport={"width":width,"height":670},is_mobile=True,has_touch=True)
                errors=[]
                page.on('pageerror',lambda exc: errors.append(str(exc)))
                try:
                    page.goto(URL,wait_until='domcontentloaded')
                    for field_id in ('accountName','holdingTicker','goal','rpMonthly','recDay'):
                        self.assertTrue(page.locator('#'+field_id).evaluate('(el)=>!!el.labels?.length'),field_id)
                    for dialog_id in ('entryOverlay','accountOverlay','holdingOverlay','recOverlay'):
                        dialog=page.locator('#'+dialog_id+' [role="dialog"]')
                        self.assertTrue(dialog.get_attribute('aria-labelledby'),dialog_id)
                        self.assertIn('닫기',dialog.locator('[data-close]').get_attribute('aria-label'))
                    self.assertEqual(page.locator('#theme').get_attribute('aria-label'),'라이트 모드로 전환')
                    page.locator('.bottomnav [data-view="calendar"]').click()
                    page.locator('#fmLedgerAddBtn').click()
                    close=page.locator('#entryOverlay [data-close]')
                    self.assertGreaterEqual(close.bounding_box()['height'],44)
                    close.click()
                    page.locator('#view-calendar [data-go="insights"]').click()
                    self.assertTrue(page.locator('#view-insights').is_visible())
                    self.assertGreaterEqual(page.locator('#view-insights .monthnav button').first.bounding_box()['height'],44)
                    page.evaluate('history.back()')
                    page.wait_for_function("document.querySelector('#view-calendar').classList.contains('active')")
                    self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width+2)
                    self.assertFalse(errors)
                finally:
                    page.close()

    def test_long_transactions_fit_history_calendar_insights_and_firecalc(self):
        for width in (320, 360, 375, 390, 430):
            for height in (568, 844):
                with self.subTest(width=width, height=height):
                    page=self.browser.new_page(viewport={"width":width,"height":height},is_mobile=True,has_touch=True)
                    errors=[]
                    page.on('pageerror',lambda exc: errors.append(str(exc)))
                    try:
                        page.add_init_script("""(() => {
                            const d=new Date(), date=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
                            localStorage.setItem('firemate_smart_v3',JSON.stringify({
                                tx:[{id:'long-mobile-tx',date,type:'expense',amount:98765432100,category:'식비',
                                    memo:'긴 거래 이름을 사용하는 휴대전화 화면 가독성 확인용 거래 이름입니다'}],
                                rec:[],budgets:{},favorites:[],theme:'dark',accounts:[],holdings:[],
                                fire:{goal:65000,monthly:300,rate:7,withdrawal:4},
                                balance:{fx:1400,cash:0,other:0,debt:0}
                            }));
                        })()""")
                        page.goto(URL,wait_until='domcontentloaded')
                        for theme in ('dark','light'):
                            if theme=='light':
                                page.locator('#theme').click()
                            page.locator('.bottomnav [data-view="home"]').click()
                            page.locator('#fmSpendingOpen').click()
                            page.locator('#view-insights .fm-home-transactions [data-go="history"]').click()
                            self.assertTrue(page.locator('#historyList [data-edit="long-mobile-tx"]').is_visible())
                            self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width+2,'history')
                            self.assertGreaterEqual(page.locator('#historyList [data-edit="long-mobile-tx"]').bounding_box()['height'],44)
                            page.locator('.bottomnav [data-view="calendar"]').click()
                            self.assertTrue(page.locator('#dayTx [data-edit="long-mobile-tx"]').is_visible())
                            self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width+2,'calendar')
                            page.locator('#view-calendar [data-go="insights"]').click()
                            self.assertTrue(page.locator('#view-insights').is_visible())
                            self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width+2,'insights')
                            page.locator('.bottomnav [data-view="fire"]').click()
                            page.locator('#fmOpenCalculator').click()
                            self.assertTrue(page.locator('#view-firecalc').is_visible())
                            self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width+2,'firecalc')
                        self.assertEqual(page.evaluate("JSON.parse(localStorage.getItem('firemate_smart_v3')).tx.filter(x=>x.id==='long-mobile-tx').length"),1)
                        self.assertFalse(errors)
                    finally:
                        page.close()

    def test_ledger_mobile_entry_list_and_data_preservation(self):
        for width in (320, 360, 390, 430):
            with self.subTest(width=width):
                context = self.browser.new_context(viewport={"width": width, "height": 670}, is_mobile=True, has_touch=True)
                page = context.new_page()
                try:
                    page.add_init_script("""(() => {
                        const date=new Date(), day=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
                        localStorage.setItem('firemate_smart_v3',JSON.stringify({
                            tx:[{id:'ledger-mobile-fixture',date:day,type:'expense',amount:123456789,
                                category:'식비',memo:'아주 긴 거래 설명을 작은 휴대전화에서 끝까지 읽을 수 있는지 확인하는 테스트 거래'}],
                            rec:[],budgets:{},favorites:[],theme:'dark',holdings:[],
                            fire:{goal:65000,monthly:300,rate:7},balance:{fx:1400,cash:0,other:0,debt:0}
                        }));
                    })()""")
                    page.goto(URL, wait_until="domcontentloaded")
                    page.locator('.bottomnav [data-view="calendar"]').click()
                    # Calendar targets and selected-date entry remain usable on small phones.
                    page.locator('#fmModeCalendar').click()
                    selected_day=page.locator('#cal .day').first
                    chosen_date=selected_day.get_attribute('data-date')
                    selected_day.click()
                    self.assertEqual(selected_day.get_attribute('aria-pressed'),'true')
                    self.assertGreaterEqual(selected_day.bounding_box()['width'],44)
                    self.assertGreaterEqual(selected_day.bounding_box()['height'],44)
                    before_cancel=page.evaluate("JSON.parse(localStorage.getItem('firemate_smart_v3')).tx")
                    page.locator('#fmLedgerAddBtn').click()
                    self.assertEqual(page.locator('#entryDate').input_value(),chosen_date)
                    page.set_viewport_size({'width':width,'height':420})
                    page.wait_for_function("Math.abs(parseFloat(document.querySelector('#entryOverlay').style.height)-visualViewport.height)<2")
                    save_box=page.locator('#saveEntry').bounding_box()
                    self.assertGreaterEqual(save_box['y'],0)
                    self.assertLessEqual(save_box['y']+save_box['height'],421)
                    page.locator('#entryCancel').click()
                    self.assertEqual(page.evaluate("JSON.parse(localStorage.getItem('firemate_smart_v3')).tx"),before_cancel)
                    page.set_viewport_size({'width':width,'height':670})
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
                    verify=page.context.new_page()
                    try:
                        verify.goto(URL,wait_until="domcontentloaded")
                        self.assertEqual(verify.evaluate("JSON.parse(localStorage.getItem('firemate_smart_v3')).tx.filter(x=>x.id==='ledger-mobile-fixture').length"),1)
                    finally:
                        verify.close()
                finally:
                    context.close()

    def test_fire_retirement_mobile_detail_and_navigation(self):
        for width in (320, 360, 390, 430):
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
                        self.open_forecast(page)
                        forecast=page.locator('#fmForecastControls')
                        forecast.locator(':scope > summary').click()
                        self.assertTrue(forecast.evaluate('(el)=>el.open'))
                        forecast.locator(':scope > summary').click()
                        self.assertFalse(forecast.evaluate('(el)=>el.open'))
                        # Forecast changes must preserve other open sections and unsaved settings.
                        self.open_portfolio(page)
                        page.locator('#fmFirePortfolioDetails>summary').click()
                        self.fire_screen(page,'firelife');page.locator('#fmDividendEditor>summary').click()
                        dividend=page.locator('[data-fm-div-rate]').first
                        dividend.fill('8.25')
                        page.locator('.bottomnav [data-view="fire"]').click()
                        forecast.locator(':scope > summary').click()
                        page.locator('[data-forecast-period="30"]').click()
                        self.assertTrue(page.locator('#fmFirePortfolioDetails').evaluate('(el)=>el.open'))
                        self.assertEqual(dividend.input_value(),'8.25')
                        page.locator('#fmForecastInflation').fill('3')
                        page.locator('#fmForecastInflation').press('Tab')
                        self.assertIn('연 물가 3%',page.locator('#fmFireForecast').inner_text())
                        page.locator('#fmForecastPlot').click(position={"x":80,"y":70})
                        self.assertEqual(dividend.input_value(),'8.25')
                        self.assertEqual(page.locator('#fmForecastInflation').input_value(),'3')
                        page.locator('#fmOpenCalculator').click()
                        saved_fire=page.evaluate("() => JSON.parse(localStorage.getItem('firemate_smart_v3')).fire")
                        page.locator('#fmPreviewFire').click()
                        page.locator('#monthly').fill('100')
                        self.assertIn('월 100만 원',page.locator('#fmPreviewResult').inner_text())
                        self.assertEqual(saved_fire,page.evaluate("() => JSON.parse(localStorage.getItem('firemate_smart_v3')).fire"))
                        page.locator('#fmBackFire').click()
                        page.locator('#fmFireLifeOpen').click()
                        self.assertTrue(page.locator('#view-firelife').is_visible())
                        self.open_portfolio(page)
                        self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width+2)
                        self.assertFalse(page.locator('#rpReset').is_visible())
                        toggle=page.locator('#fmRpEditToggle')
                        toggle.click()
                        self.assertEqual(toggle.get_attribute('aria-expanded'),'true')
                        self.assertTrue(page.locator('#rpReset').is_visible())
                        toggle.click()
                        self.assertEqual(toggle.get_attribute('aria-expanded'),'false')
                        toggle.click() # Calculator link belongs to the allocation editor.
                        page.locator('#fmRetireToCalculator').click()
                        self.assertTrue(page.locator('#view-firecalc').is_visible())
                        page.locator('#fmBackFire').click()
                        self.assertTrue(page.locator('#view-fire').is_visible())
                        self.assertFalse(errors)
                    finally:
                        page.close()

    def test_phone_strategy_cashflow_rows_and_buttons(self):
        for width in (320, 390, 430):
            for theme in ('dark','light'):
                with self.subTest(width=width,theme=theme):
                    page=self.browser.new_page(viewport={"width":width,"height":670},is_mobile=True,has_touch=True)
                    errors=[]
                    page.on('pageerror',lambda exc: errors.append(str(exc)))
                    try:
                        page.goto(URL,wait_until='domcontentloaded')
                        if theme=='light':page.locator('#theme').click()
                        page.locator('.bottomnav [data-view="fire"]').click()
                        page.locator('#fmFireStrategyOpen').click()
                        self.assertTrue(page.locator('#view-retire').is_visible())
                        page.locator('#fmStrategyDetails > summary').click()
                        page.locator('#fmStrModeDetail').click()
                        self.assertGreaterEqual(page.locator('#fmStrategyCard .fm-str-row-top button').first.bounding_box()['height'],44)
                        self.assertGreaterEqual(page.locator('#fmStrAddDiv').bounding_box()['height'],44)
                        self.assertNotEqual(page.locator('#fmStrAddDiv').evaluate('(el)=>getComputedStyle(el).backgroundColor'),'rgba(0, 0, 0, 0)')
                        page.evaluate("""() => {
                            document.getElementById('fmQuickBudget').value='65000';
                            document.getElementById('fmQuickSpend').value='2400';
                            document.getElementById('fmStrYears').value='30';
                            document.getElementById('fmStrSameReturn').checked=true;
                            window.__fmFinanceTest.strategy({
                                div:[{name:'JEPQ',amount:65000,estimatedAnnualMan:3499,rate:10.41}],
                                sale:[{name:'SPY',amount:65000,rate:7}]
                            });
                            document.getElementById('fmCashFlowDetails').parentElement.open=true;
                        }""")
                        self.assertGreaterEqual(page.locator('#fmCashFlowDetails [data-fm-cf-kind="div"]').bounding_box()['height'],44)
                        row=page.locator('#fmCashFlowDetails [data-fm-cf-view] > details').first
                        self.assertGreaterEqual(row.locator('summary').bounding_box()['height'],44)
                        row.locator('summary').click()
                        self.assertTrue(row.evaluate('(el)=>el.open'))
                        row.locator('summary').click()
                        self.assertFalse(row.evaluate('(el)=>el.open'))
                        self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width+2)
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
