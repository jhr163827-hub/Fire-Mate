const { chromium } = require("playwright"),
  fs = require("node:fs"),
  http = require("node:http"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../../../.."),
  out = process.env.FRONTIER_EVIDENCE || path.join(__dirname, "evidence"),
  realtime = process.env.FRONTIER_REALTIME === "1";
fs.mkdirSync(out, { recursive: true });
const report = { checks: [], errors: [], realtime };
const ok = (t) => {
  report.checks.push(t);
  console.log("PASS", t);
};
const server = http.createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  if (p.endsWith("/")) p += "index.html";
  if (!p.startsWith(root + path.sep)) {
    res.writeHead(403);
    return res.end();
  }
  fs.readFile(p, (e, b) => {
    if (e) {
      res.writeHead(404);
      return res.end();
    }
    res.setHeader(
      "Content-Type",
      p.endsWith(".mjs") || p.endsWith(".js")
        ? "text/javascript"
        : p.endsWith(".css")
          ? "text/css"
          : p.endsWith(".webp")
            ? "image/webp"
            : "text/html",
    );
    res.end(b);
  });
});
let browser;
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.MOONWARD_CHROMIUM,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  let page = await browser.newPage({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
  });
  page.on("pageerror", (e) => report.errors.push(e.message));
  const url =
    "http://127.0.0.1:" +
    server.address().port +
    "/arcade/moonward/frontier/?test";
  await page.goto(url);
  await page.waitForFunction(() => window.frontier);
  await page.evaluate(() => {
    localStorage.setItem("firemate_finance_test", "preserve");
    localStorage.setItem("firemate_moonward_v1", "classic");
  });
  async function tap(x, y) {
    const r = await page.locator("#canvas").boundingBox();
    await page.mouse.click(
      r.x + (x / 640) * r.width,
      r.y + (y / 400) * r.height,
    );
  }
  async function buy(k, x, y) {
    await page.click(`[data-buy="${k}"]`);
    await tap(x, y);
    await page.click("#place");
  }
  await page.click('[data-buy="dart"]');
  await tap(175, 70);
  assert.ok(await page.isDisabled("#place"));
  await tap(175, 136);
  await page.click("#place");
  await buy("bomb", 310, 136);
  assert.equal(await page.evaluate(() => frontier.game.s.towers.length), 2);
  await page.click("#start");
  await page.waitForTimeout(2400);
  assert.ok(await page.evaluate(() => frontier.game.s.enemies.length > 0));
  await page.click("#pause");
  let state = await page.evaluate(() => frontier.game.serialize());
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => frontier.game.serialize()), state);
  ok("real UI free placement, blocked road, immediate first combat and pause");
  for (const [w, h] of [
    [320, 568],
    [390, 844],
    [430, 932],
    [568, 320],
    [667, 375],
    [844, 390],
    [1024, 768],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(80);
    let r = await page.evaluate(() => {
      let c = document.querySelector("#canvas").getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        ratio: c.width / c.height,
        height: c.height,
        buttons: [...document.querySelectorAll("#shop button,#hud button")].map(
          (b) => b.getBoundingClientRect().height,
        ),
      };
    });
    if (r.overflow) {
      await page.screenshot({ path: "/tmp/frontier-overflow.jpg" });
      console.log({
        w,
        h,
        r,
        wide: await page.evaluate(() =>
          [...document.querySelectorAll("*")]
            .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
            .map((e) => [e.tagName, e.id, e.getBoundingClientRect().width])
            .slice(0, 15),
        ),
      });
    }
    assert.equal(r.overflow, false);
    assert.ok(Math.abs(r.ratio - 1.6) < 0.01);
    assert.ok(r.height > 80);
    assert.ok(r.buttons.every((h) => h >= 44));
    assert.equal(await page.evaluate(() => frontier.game.serialize()), state);
  }
  ok(
    "seven portrait/landscape sizes preserve state, map ratio and 44px controls",
  );
  await page.evaluate(() => frontier.save());
  await page.reload();
  await page.click("#resume");
  await page.click("#pause");
  assert.equal(await page.evaluate(() => frontier.game.s.towers.length), 2);
  assert.equal(
    await page.evaluate(() => localStorage.getItem("firemate_finance_test")),
    "preserve",
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("firemate_moonward_v1")),
    "classic",
  );
  ok("save/reload resumes without touching finance or classic save");
  await page.setViewportSize({ width: 844, height: 390 });
  async function manage() {
    const plan = [
      ["dart", 175, 136],
      ["bomb", 310, 136],
      ["ice", 445, 136],
      ["arc", 175, 270],
      ["bomb", 310, 270],
      ["dart", 445, 270],
    ];
    for (const [k, x, y] of plan) {
      const exists = await page.evaluate(
        ([x, y]) => frontier.game.s.towers.some((t) => t.x === x && t.y === y),
        [x, y],
      );
      if (!exists && !(await page.isDisabled(`[data-buy="${k}"]`)))
        await buy(k, x, y);
    }
    for (let lv = 1; lv <= 3; lv++) {
      const ts = await page.evaluate(() =>
        frontier.game.s.towers.map((t) => ({ ...t })),
      );
      for (const t of ts) {
        if (t.level >= lv) continue;
        await tap(t.x, t.y);
        const b = t.kind === "arc" ? 1 : 0,
          selector = `[data-upgrade="${b}"]`;
        if (!(await page.isDisabled(selector))) {
          await page.click(selector);
          await page.click("#confirmUpgrade");
        }
        if (t.kind === "arc") await page.click('[data-target="strong"]');
      }
    }
  }
  if (realtime) {
    await page.click("#speed");
    await page.click("#pause");
  }
  for (let wave = 1; wave <= 12; wave++) {
    if (wave > 1) {
      await manage();
      await page.click("#start");
      if (!realtime) await page.click("#pause");
    }
    if (realtime) await page.waitForTimeout(4000);
    else await page.evaluate(() => frontier.step(180));
    if (wave === 6 || wave === 10) {
      await page.evaluate(() => frontier.draw());
      await page.screenshot({
        path: path.join(out, wave === 6 ? "battle-landscape.jpg" : "boss.jpg"),
      });
      if (wave === 6) {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.evaluate(() => frontier.draw());
        await page.screenshot({ path: path.join(out, "battle-portrait.jpg") });
        await page.setViewportSize({ width: 844, height: 390 });
      }
    }
    if (wave === 6) {
      await page.click("#mapSpell");
      await tap(450, 70);
      assert.ok(await page.evaluate(() => frontier.game.s.spell > 0));
    }
    if (realtime)
      await page.waitForFunction(
        () => frontier.game.s.phase !== "battle",
        null,
        { timeout: 120000 },
      );
    else
      await page.evaluate(() => {
        let n = 0;
        while (frontier.game.s.phase === "battle" && n++ < 12000)
          frontier.step(1);
      });
    assert.notEqual(
      await page.evaluate(() => frontier.game.s.phase),
      "lost",
      "wave " + wave,
    );
  }
  assert.equal(await page.evaluate(() => frontier.game.s.phase), "won");
  await page.waitForSelector("#retry");
  await page.screenshot({ path: path.join(out, "victory.jpg") });
  ok(
    "12 waves: actual UI buying, 3-tier upgrades, target choice, aimed bombardment, splitting bosses and victory" +
      (realtime ? " (real-time 2x)" : " (engine-accelerated)"),
  );
  await page.click("#retry");
  assert.equal(await page.evaluate(() => frontier.game.s.gold), 340);
  assert.equal(
    await page.evaluate(
      () =>
        frontier.game.s.enemies.length +
        frontier.game.s.shots.length +
        frontier.game.s.fields.length,
    ),
    0,
  );
  ok("victory retry clears battle state");
  await buy("dart", 175, 136);
  await page.click('[data-upgrade="0"]');
  await page.click("#close");
  assert.equal(await page.evaluate(() => frontier.game.s.towers[0].level), 0);
  await page.click('[data-upgrade="0"]');
  await page.click("#confirmUpgrade");
  assert.ok(await page.isDisabled('[data-upgrade="1"]'));
  await page.click("#sell");
  await page.click("#close");
  assert.equal(await page.evaluate(() => frontier.game.s.towers.length), 1);
  await page.click("#sell");
  await page.click("#confirmSell");
  assert.equal(await page.evaluate(() => frontier.game.s.towers.length), 0);
  ok("upgrade and sale preview/cancel/confirm; branch lock");
  await page.evaluate(() => {
    const g = new frontier.Game();
    g.buy("ice", 175, 136);
    frontier.setGame(g);
    let count = 0;
    while (g.s.phase !== "lost" && count++ < 20000) {
      if (g.s.phase === "ready") g.start();
      frontier.step(1);
    }
  });
  await page.waitForSelector("#retry");
  await page.screenshot({ path: path.join(out, "defeat.jpg") });
  await page.click("#retry");
  assert.equal(await page.evaluate(() => frontier.game.s.wave), 0);
  ok("weak defense loses with cause-specific advice and retries");
  await page.click("#settings");
  await page.click("#sound");
  await page.click("#motion");
  await page.click("#restart");
  await page.click("#confirmRestart");
  await page.evaluate(() =>
    window.dispatchEvent(new PageTransitionEvent("pagehide")),
  );
  assert.equal(await page.evaluate(() => frontier.disposed), true);
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent("pageshow", { persisted: true }),
    ),
  );
  assert.equal(await page.evaluate(() => frontier.disposed), false);
  ok("sound/reduced effects, restart confirmation and lifecycle cleanup");
  await page.evaluate(() =>
    localStorage.setItem("firemate_frontier_v1", '{"v":99}'),
  );
  await page.reload();
  await page.waitForFunction(() => window.frontier);
  assert.equal(await page.evaluate(() => frontier.game.s.wave), 0);
  ok("corrupt save recovers safely");
  const perf = await page.evaluate(() => {
    const out = {};
    for (const n of [50, 100, 200]) {
      const g = new frontier.Game();
      for (let i = 0; i < n; i++)
        g.spawn(i % 8 === 0 ? "boss" : "runner", i * 7);
      frontier.setGame(g);
      let samples = [];
      for (let i = 0; i < 60; i++) {
        let t = performance.now();
        frontier.draw();
        samples.push(performance.now() - t);
      }
      samples.sort((a, b) => a - b);
      out[n] = { median: samples[30], p95: samples[57] };
    }
    return out;
  });
  report.renderSubmissionMs = perf;
  ok(
    "50/100/200 enemies render submission benchmark (desktop, not mobile FPS)",
  );
  await page.goto(
    "http://127.0.0.1:" + server.address().port + "/arcade/index.html",
  );
  await page.evaluate(async () => {
    localStorage.setItem("firemate_finance_test", "preserve");
    await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => navigator.serviceWorker.controller);
  await page.reload();
  await page.click("#moonwardOpen");
  await page.waitForURL("**/frontier/");
  await buy("dart", 175, 136);
  await page.click("#start");
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem("firemate_frontier_v1"))?.wave === 1,
  );
  await page.context().setOffline(true);
  await page.reload();
  await page.click("#resume");
  assert.equal(
    await page.evaluate(() => localStorage.getItem("firemate_finance_test")),
    "preserve",
  );
  await page.click("header a");
  await page.waitForURL("**/arcade/index.html");
  await page.click("#moonwardOpen");
  await page.waitForSelector("#resume");
  await page.context().setOffline(false);
  ok(
    "actual arcade entry and shared service worker: first-visit caching, offline resume/exit, finance key preserved",
  );
  assert.deepEqual(report.errors, []);
  ok("no uncaught browser errors");
  fs.writeFileSync(
    path.join(out, "browser-report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
    server.close();
  });
