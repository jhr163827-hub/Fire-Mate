// Exercises the unchanged shared SW with the real arcade menu and game assets.
const { chromium } = require("playwright"),
  http = require("http"),
  fs = require("fs"),
  path = require("path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../../..");
const mime = {
  ".html": "text/html",
  ".mjs": "text/javascript",
  ".js": "text/javascript",
  ".css": "text/css",
  ".webp": "image/webp",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
};
const server = http.createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  if (p.endsWith("/")) p += "index.html";
  if (!p.startsWith(root + path.sep)) {
    res.writeHead(403);
    return res.end();
  }
  fs.readFile(p, (e, d) => {
    if (e) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.setHeader(
      "Content-Type",
      mime[path.extname(p)] || "application/octet-stream",
    );
    res.end(d);
  });
});
let browser;
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  let origin = "http://127.0.0.1:" + server.address().port;
  browser = await chromium.launch({
    headless: true,
    ...(process.env.MOONWARD_CHROMIUM
      ? { executablePath: process.env.MOONWARD_CHROMIUM }
      : {}),
    args: ["--no-sandbox"],
  });
  let context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(origin + "/arcade/index.html");
  const priorLinks = await page
    .locator("a.game:not(#moonwardOpen)")
    .evaluateAll((a) => a.map((e) => e.getAttribute("href")));
  assert.deepEqual(priorLinks, [
    "./watermelon.html",
    "./restaurant.html",
    "./sudoku.html",
    "./nightfall.html",
  ]);
  await page.evaluate(async () => {
    localStorage.setItem("firemate_finance_sentinel", "preserve");
    await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => navigator.serviceWorker.controller);
  await page.reload();
  await page.click("#moonwardOpen");
  await page.waitForSelector(".pad");
  await page.waitForFunction(() => !document.querySelector("#summon").disabled);
  await page.click("#summon");
  await page.click("#summon");
  await page.click("#summon");
  await page.click("#start");
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("firemate_moonward_v1")).game.wave === 1,
  );
  await page.click("#exit");
  await page.waitForURL("**/arcade/index.html");
  let assets = await page.evaluate(async () => {
    let names = await caches.keys();
    let urls = [];
    for (let n of names) {
      let c = await caches.open(n);
      urls.push(...(await c.keys()).map((r) => new URL(r.url).pathname));
    }
    return urls;
  });
  for (let f of [
    "",
    "app.mjs",
    "data.mjs",
    "engine.mjs",
    "feedback.mjs",
    "art.mjs",
    "style.css",
    ...[
      "forest",
      "archer",
      "ember",
      "frost",
      "thorn",
      "bell",
      "wisp",
      "wolf",
      "beetle",
      "boss",
    ].map((n) => "art/" + n + ".webp"),
  ])
    assert.ok(assets.includes("/arcade/moonward/" + f), "Not cached: " + f);
  await context.setOffline(true);
  await page.reload();
  await page.click("#moonwardOpen");
  await page.waitForSelector("#resume");
  await page.click("#resume");
  await page.waitForFunction(() =>
    document.querySelector("#wave").textContent.includes("01"),
  );
  assert.equal(
    await page.evaluate(() =>
      localStorage.getItem("firemate_finance_sentinel"),
    ),
    "preserve",
  );
  await page.click("#menu");
  await page.click("#leave");
  await page.waitForURL("**/arcade/index.html");
  assert.equal(await page.locator("#moonwardOpen").count(), 1);
  await context.setOffline(false);
  for (let width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
  }
  await page.click("#moonwardOpen");
  await page.waitForSelector("#resume");
  await page.click("#resume");
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("firemate_moonward_v1")).game.wave >= 1,
  );
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        menuNavigation: "pass",
        existingGameLinks: "unchanged",
        realServiceWorker: "pass",
        runtimeAssetsCached: assets.filter((p) =>
          p.startsWith("/arcade/moonward/"),
        ).length,
        offlineMenuAndGameResume: "pass",
        offlineExit: "pass",
        onlineReturn: "pass",
        financeSentinel: "preserved",
        mobileMenuOverflow: "none at 320/390/430",
        pageErrors: errors,
        limitations: "headless Chromium only; not an installed mobile PWA",
      },
      null,
      2,
    ),
  );
  await browser.close();
  server.close();
})().catch(async (e) => {
  console.error(e);
  if (browser) await browser.close();
  server.close();
  process.exitCode = 1;
});
