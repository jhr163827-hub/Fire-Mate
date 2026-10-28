const { test, expect } = require("@playwright/test");
// The scheduled backup quote file is live on GitHub; keep these fixtures' prices fixed.
test.beforeEach(async({page})=>{await page.route('**/chart-data/live-quotes.json*',r=>r.fulfill({status:404,body:''}));await page.route('https://polling.finance.naver.com/**',r=>r.abort())});
async function seed(page) {
  await page.route("https://api.frankfurter.dev/**", (r) => r.abort());
  await page.goto("/index.html");
  await page.evaluate(() => {
    const k = "firemate_smart_v3",
      d = JSON.parse(localStorage.getItem(k));
    d.accounts = [{ id: "cash", amount: 150000000, fire: true }];
    d.holdings = [];
    d.balance = { fx: 1400, cash: 0, other: 0, debt: 0 };
    d.fire = {
      asset: 15000,
      goal: 65000,
      monthly: 300,
      rate: 7,
      withdrawal: 4,
    };
    d.retirement = {
      items: [{ name: "JEPQ", amount: 65000 }],
      monthly: 300,
      yield: 4,
      taxRate: 20,
      priceChange: 0,
      crash: 25,
    };
    localStorage.setItem(k, JSON.stringify(d));
    localStorage.setItem(
      "firemate_arcade_watermelon_state_v1",
      "game-preserve",
    );
  });
  await page.reload();
}
test("decision overview links exact saved baselines, portfolio and independent stress without writes", async ({
  page,
}) => {
  await seed(page);
  const before = await page.evaluate(() =>
    localStorage.getItem("firemate_smart_v3"),
  );
  await page.locator('.bottomnav [data-view="fire"]').click();
  // FIRE keeps one main screen; the rest opens from 🧪 FIRE 실험실.
  await expect(page.locator('#view-fire .fm-fire-screen-nav')).toHaveCount(0);
  const state = await page.evaluate(() => window.fmFireViewState);
  const months = state.forecast.baselineMonthsToGoal,
    date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  await expect(page.locator("#fmRetirementETA")).toContainText(
    date.getFullYear() + "년 " + (date.getMonth() + 1) + "월",
  );
  await expect(page.locator("#fireYears")).toHaveText("8년 2개월");
  await page.locator("#fmLabOpen").click();
  await expect(page.locator("#view-firelab")).toBeVisible();
  await expect(page.locator("#fmFirePortfolioOpen")).toBeVisible();
  await expect(page.locator("#fmCashflowLimits")).toContainText("보험료 미입력 · 차감 전");
  await expect(page.locator("#fmOverview-cashflow")).toContainText("(가정)");
  expect(await page.locator("#fmOverview-cashflow").evaluate(el=>!!el.closest("button"))).toBe(false);
  expect(await page.locator("#fmOverview-portfolio").evaluate(el=>!!el.closest("button"))).toBe(false);
  await page.locator("#fmFirePortfolioOpen").click();
  await expect(page.locator("#fmPortfolioDisclosure")).toHaveAttribute(
    "open",
    "",
  );
  await expect(page.locator("#fmRetirePortfolio")).toBeVisible();
  await page.goBack();
  await expect(page.locator("#view-firelab")).toBeVisible();
  await page.locator("#fmFireRiskOpen").click();
  await expect(page.locator("#fmLifeScenario")).toHaveAttribute("open", "");
  await expect(page.locator("#fmStressBasis")).toContainText("연 분배율 4%");
  await expect(page.locator("#fmStressBasis")).toContainText("세금 부담률 20%");
  const risk = await page.evaluate(() => window.fmFireViewState.stress);
  expect(risk).toMatchObject({
    total: 65000,
    afterCrash: 48750,
    monthlyBefore: ((65000 * 0.04) / 12) * 0.8,
    monthlyAfter: 130,
    monthlyGap: -170,
  });
  await page.locator("#fmUniformExperimentInputs>summary").click();
  await page.locator("#rpAdvancedSettings>summary").click();
  await expect(page.locator("#view-retire")).toBeVisible();
  await expect(page.locator("#rpCrash")).toBeVisible();
  await expect(page.locator("#fmModelValues")).toContainText("생활비 화면");
  expect(
    await page.evaluate(() => localStorage.getItem("firemate_smart_v3")),
  ).toBe(before);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("firemate_arcade_watermelon_state_v1"),
    ),
  ).toBe("game-preserve");
});
test("comparison mode and applied assumptions are visible before editing and do not change saved plan", async ({
  page,
}) => {
  await seed(page);
  await page.locator('.bottomnav [data-view="fire"]').click();
  await page.locator("#fmLabOpen").click();
  await page.locator('[data-lab="retire"]').click();
  const raw = await page.evaluate(() =>
    localStorage.getItem("firemate_smart_v3"),
  );
  await expect(page.locator("#fmStrategyDetails")).not.toHaveAttribute(
    "open",
    "",
  );
  await expect(page.locator("#fmStrModeDetail")).toBeVisible();
  await expect(page.locator("#fmComparisonBasis")).toContainText(
    "임시 · 1년 비교",
  );
  await page.locator("#fmStrModeDetail").click();
  await expect(page.locator("#fmComparisonBasis")).toContainText("장기 비교");
  await expect(page.locator("#fmQuickResult")).toBeHidden();
  await page.evaluate(() => {
    for (const [id, v] of Object.entries({
      fmStrYears: 30,
      fmStrInflation: 3,
      fmStrDivGrowth: 5,
      fmStrSameReturn: true,
      fmStrFairMode: true,
      fmStrReinvest: false,
      fmStrTaxApply: false,
      fmStrDivCost: 20,
      fmStrInsurance: 0,
    })) {
      const el = document.getElementById(id);
      if (el.type === "checkbox") el.checked = v;
      else el.value = v;
    }
    __fmFinanceTest.strategy({
      div: [{ name: "TEST", amount: 65000, estimatedAnnualMan: 2600 }],
      sale: [{ name: "TEST", amount: 65000, rate: 5 }],
    });
  });
  await expect(page.locator("#fmComparisonBasis")).toContainText(
    "30년 · 물가 3.0%",
  );
  await page.locator("#fmStrModeQuick").click();
  await expect(page.locator("#fmComparisonBasis")).toContainText(
    "물가·매도세·보험료 미반영",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("firemate_smart_v3")),
  ).toBe(raw);
});
test("compact dashboard keeps all seven metrics and exposes report shortcuts on a standard mobile screen", async ({
  page,
}) => {
  await seed(page);
  for (const [width, height] of [
    [390, 844],
    [320, 568],
  ])
    for (const theme of ["dark", "light"]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(
        (t) => (document.documentElement.dataset.theme = t),
        theme,
      );
      for (const id of [
        "homeTotalAssets",
        "homeDailyChange",
        "heroSpent",
        "heroBudget",
        "heroLeft",
        "homeAssetPercent",
        "homeFireEta",
      ])
        await expect(page.locator("#" + id)).toBeVisible();
      if (height === 844) {
        const nav = await page.locator(".bottomnav").boundingBox();
        for (const id of ["fmMonthlyOpen", "fmSpendingOpen"]) {
          const b = await page.locator("#" + id).boundingBox();
          expect(b.y + b.height).toBeLessThanOrEqual(nav.y);
        }
      }
      const nav = await page.locator('.bottom-item').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));
      for(const item of nav){expect(item.height).toBe(52);expect(item.y).toBe(nav[0].y);expect(Math.abs(item.width-nav[0].width)).toBeLessThan(0.1);}
      await expect(page.locator("#view-home .fm-eta-details")).toHaveCount(0);
      await expect(page.locator("#homeEtaPrincipal")).toHaveCount(0);
      await expect(page.locator("#homeFireEtaNote")).toContainText("기본 예시 목표");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBe(0);
    }
});
test("the asset card has no exchange-rate row and asset keyboard tabs expose exactly one panel", async ({
  page,
}) => {
  await seed(page);
  await page.setViewportSize({ width: 320, height: 670 });
  await page.locator('.bottomnav [data-view="assets"]').click();
  await expect(page.locator("#fmAssetQuoteContext")).toBeHidden();
  await expect(page.locator("#stockStatus")).toHaveCount(1);
  await page.evaluate(
    () =>
      (document.getElementById("fxStatus").textContent =
        "환율 조회 실패 · 기존 환율 유지"),
  );
  await expect(page.locator("#fmAssetFxStatus")).toContainText("조회 실패");
  const tabs = page.locator('.fm-asset-jump [role="tab"]');
  await tabs.first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#fmAssetQuickHoldings")).toBeFocused();
  await expect(page.locator("#fmAssetQuickHoldings")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator("#fmAssetHoldingsPanel")).toBeVisible();
  await expect(page.locator("#fmAssetAccountsPanel")).toBeHidden();
  await page.keyboard.press("End");
  await expect(page.locator("#fmAssetMarketView")).toBeVisible();
  await expect(page.locator("#fmAssetDividendView")).toBeHidden();
  await page.keyboard.press("Home");
  await expect(page.locator("#fmAssetAccountsPanel")).toBeVisible();
  expect(
    await page.locator('.fm-asset-jump [aria-selected="true"]').count(),
  ).toBe(1);
});
test("selected-day transactions are reachable, calendar returns and backup remains complete", async ({
  page,
}) => {
  const fs = require("node:fs");
  await seed(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.evaluate(() => {
    const k = "firemate_smart_v3",
      d = JSON.parse(localStorage.getItem(k)),
      day = new Date().toLocaleDateString("sv-SE");
    d.tx = [
      {
        id: "daily-test",
        date: day,
        type: "expense",
        amount: 12345,
        category: "식비",
        memo: "선택일 테스트",
      },
    ];
    d.budgets[day.slice(0, 7)] = 100000;
    d.compatibilitySentinel = { keep: true };
    localStorage.setItem(k, JSON.stringify(d));
  });
  await page.reload();
  const raw = await page.evaluate(() =>
    localStorage.getItem("firemate_smart_v3"),
  );
  await page.locator('.bottomnav [data-view="calendar"]').click();
  const todayCell = page.locator('#cal [aria-current="date"]');
  await todayCell.scrollIntoViewIfNeeded();
  const yBefore = await page.evaluate(() => scrollY);
  await todayCell.dispatchEvent("click");
  // Picking a date never moves the page.
  expect(await page.evaluate(() => scrollY)).toBe(yBefore);
  await expect(page.locator("#dayTx")).toContainText("12,345");
  await page.locator("#fmBackToCalendar").click();
  await expect(page.locator('#cal [aria-pressed="true"]')).toBeFocused();
  await page.locator("#settingsBottom").click();
  await expect(page.locator(".fm-device-storage #export")).toBeHidden();
  await page.locator("#fmStorage>summary").click();
  await expect(page.locator(".fm-device-storage #export")).toBeVisible();
  const downloaded = page.waitForEvent("download");
  await page.locator("#export").click();
  const download = await downloaded;
  const content = JSON.parse(fs.readFileSync(await download.path(), "utf8"));
  expect(content.app).toBe("FIRE MATE");
  expect(content.data.compatibilitySentinel).toEqual({ keep: true });
  const before = JSON.parse(raw);
  for (const key of [
    "tx",
    "accounts",
    "holdings",
    "budgets",
    "balance",
    "fire",
    "retirement",
  ])
    expect(content.data[key]).toEqual(before[key]);
  expect(
    await page.evaluate(() => localStorage.getItem("firemate_smart_v3")),
  ).toBe(raw);
});

test("browser back closes financial dialogs before changing the underlying screen", async ({
  page,
}) => {
  await seed(page);
  const raw = await page.evaluate(() =>
    localStorage.getItem("firemate_smart_v3"),
  );
  await page.locator('.bottomnav [data-view="assets"]').click();
  await page.locator("#settingsBottom").click();
  await page.goBack();
  await expect(page.locator("#settingsOverlay")).not.toHaveClass(/show/);
  await expect(page.locator("#view-assets")).toBeVisible();
  await page.locator('.bottomnav [data-view="calendar"]').click();
  await page.locator("#fmLedgerAddBtn").click();
  await page.locator("#entryAmount").fill("12345");
  await page.goBack();
  await expect(page.locator("#entryOverlay")).not.toHaveClass(/show/);
  await expect(page.locator("#view-calendar")).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("firemate_smart_v3")),
  ).toBe(raw);
  await page.goForward();
  await expect(page.locator("#entryOverlay")).toHaveClass(/show/);
  await page.locator("#entryCancel").click();
  await page.goBack();
  await expect(page.locator("#view-assets")).toBeVisible();
});
