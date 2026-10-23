// Run with Playwright installed externally; no project dependency changes required.
// MOONWARD_CHROMIUM=/path/to/chromium node arcade/moonward/tests/browser.cjs
const { chromium } = require("playwright"),
  http = require("http"),
  fs = require("fs"),
  path = require("path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../../.."),
  out = process.env.MOONWARD_EVIDENCE || path.resolve(__dirname, "evidence");
fs.mkdirSync(out, { recursive: true });
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
      p.endsWith(".mjs")
        ? "text/javascript"
        : p.endsWith(".css")
          ? "text/css"
          : p.endsWith(".webp")
            ? "image/webp"
            : "text/html",
    );
    res.end(d);
  });
});
let browser;
const report = { checks: [], errors: [], performance: {} };
function ok(name) {
  report.checks.push(name);
  console.log("PASS", name);
}
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  browser = await chromium.launch({
    headless: true,
    ...(process.env.MOONWARD_CHROMIUM
      ? { executablePath: process.env.MOONWARD_CHROMIUM }
      : {}),
    args: ["--no-sandbox"],
  });
  let page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  page.on("pageerror", (e) => report.errors.push(e.message));
  const url =
    "http://127.0.0.1:" + server.address().port + "/arcade/moonward/?test";
  await page.goto(url);
  await page.waitForFunction(() => window.moonward);
  await page.evaluate(() =>
    localStorage.setItem("firemate_finance_sentinel", "do-not-touch"),
  );
  assert.match(await page.textContent("#coach"), /첫 궁수/);
  await page.click("#summon");
  await page.click("#summon");
  await page.click("#summon");
  assert.equal(await page.evaluate(() => moonward.game.s.units.length), 3);
  await page.click("#start");
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => moonward.game.s.wave), 1);
  ok("first summon and battle through real controls");
  await page.click("#menu");
  let tick = await page.evaluate(() => moonward.game.s.tick);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => moonward.game.s.tick), tick);
  await page.check("#sound");
  await page.check("#motion");
  await page.click("#closeDialog");
  await page.click("#speed");
  assert.equal(await page.textContent("#speed"), "2×");
  ok("pause, audio, reduced effects and speed controls");
  await page.evaluate(() => {
    let g = new moonward.Game(1);
    g.s.gold = 1000;
    g.summon(0, "archer");
    g.summon(1, "archer");
    g.summon(2, "frost");
    moonward.setGame(g);
    moonward.pause(true);
  });
  await page.click('[data-pad="0"]');
  await page.click("#merge");
  assert.match(await page.textContent("#dialogBody"), /2.55/);
  await page.click("[data-merge]");
  assert.equal(await page.evaluate(() => moonward.game.s.units[0].tier), 2);
  assert.equal(await page.evaluate(() => moonward.game.s.units.length), 2);
  ok("merge preview and explicit material selection");
  await page.click("#move");
  await page.click('[data-pad="2"]');
  assert.equal(await page.evaluate(() => moonward.game.s.units[0].pad), 2);
  await page.click("#sell");
  await page.click("#closeDialog");
  assert.equal(await page.evaluate(() => moonward.game.s.units.length), 2);
  await page.click("#sell");
  await page.click("#confirmSell");
  assert.equal(await page.evaluate(() => moonward.game.s.units.length), 1);
  ok("move/swap and cancel/confirm sell");
  await page.click("#choose");
  await page.click('[data-kind="ember"]');
  assert.ok(
    await page.evaluate(() =>
      moonward.game.s.units.some((u) => u.kind === "ember"),
    ),
  );
  ok("guaranteed-role summon");
  await page.evaluate(() => {
    moonward.game.start();
    moonward.step(350);
    moonward.pause(true);
    moonward.save();
  });
  let saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("firemate_moonward_v1")).game,
  );
  await page.reload();
  await page.waitForSelector("#resume");
  await page.reload();
  await page.waitForSelector("#resume");
  assert.deepEqual(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("firemate_moonward_v1")).game,
    ),
    saved,
  );
  await page.click("#resume");
  await page.evaluate(() => moonward.pause(true));
  assert.equal(await page.evaluate(() => moonward.game.s.wave), saved.wave);
  assert.equal(
    await page.evaluate(() =>
      localStorage.getItem("firemate_finance_sentinel"),
    ),
    "do-not-touch",
  );
  ok("save/reload twice preserves waiting resume and financial sentinel");
  // Execute a whole deterministic match in browser JS, rendering milestones from the real engine.
  let run = await page.evaluate(async () => {
    const { manage } = await import("./tests/simulate.mjs");
    let g = new moonward.Game(1),
      bossSeen = false;
    for (let i = 0; i < 30 * 1800 && !g.s.result; i++) {
      if (i % 15 === 0) manage(g, "balanced");
      g.step();
      g.drain();
      if (g.s.enemies.some((e) => e.boss)) bossSeen = true;
    }
    moonward.setGame(g);
    moonward.pause(true);
    return { ...g.s.result, bossSeen };
  });
  assert.ok(run.bossSeen);
  assert.ok(run.win);
  await page.evaluate(() => {
    moonward.game.emit("result", moonward.game.s.result);
    moonward.step(0);
  });
  await page.waitForSelector("#again");
  assert.match(await page.textContent("#dialogBody"), /새벽/);
  await page.screenshot({
    path: path.join(out, "victory-390.png"),
    fullPage: true,
  });
  await page.click("#again");
  assert.equal(await page.evaluate(() => moonward.game.s.enemies.length), 0);
  ok("full 18-wave browser-engine run, boss, victory and retry");
  await page.evaluate(() => {
    let g = new moonward.Game(1);
    let u = g.summon(0);
    g.start();
    g.sell(u.id);
    moonward.setGame(g);
    moonward.step(30 * 400);
  });
  await page.waitForSelector("#again");
  assert.match(await page.textContent("#dialogBody"), /꺼졌어요/);
  assert.match(await page.textContent("#dialogBody"), /마리 돌파/);
  await page.click("#again");
  ok("loss explanation and clean restart");
  await page.evaluate(() => {
    const g = new moonward.Game(77);
    g.s.wave = 5;
    g.s.phase = "rest";
    g.s.wait = 7;
    g.s.gold = 285;
    g.summon(0, "archer");
    g.summon(1, "bell");
    moonward.setGame(g);
    moonward.pause(false);
  });
  await page.click('[data-pad="0"]');
  assert.match(await page.textContent("#selection"), /가속 \+25%/);
  assert.match(await page.textContent("#forecastTitle"), /다음 6/);
  await page.click("#scout");
  const restWait = await page.evaluate(() => moonward.game.s.wait);
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => moonward.game.s.wait), restWait);
  assert.match(await page.textContent("#dialogBody"), /보스 1/);
  await page.screenshot({
    path: path.join(out, "planning-390.png"),
    fullPage: true,
  });
  await page.click("#planChoice");
  await page.click('[data-kind="thorn"]');
  assert.ok(
    await page.evaluate(() =>
      moonward.game.s.units.some((u) => u.kind === "thorn"),
    ),
  );
  assert.equal(await page.evaluate(() => moonward.game.s.gold), 30);
  await page.evaluate(() => {
    const g = new moonward.Game(3);
    g.s.wave = 3;
    g.s.lives = 0;
    g.s.leaks = 20;
    g.s.stats.breaches = { wolf: { count: 20, loss: 20, health: 10 } };
    g.finish(false);
    moonward.setGame(g);
    moonward.step(0);
  });
  assert.match(await page.textContent("#dialogBody"), /질주 적 20마리 돌파/);
  assert.match(await page.textContent("#dialogBody"), /평균 체력 50%/);
  await page.screenshot({
    path: path.join(out, "debrief-390.png"),
    fullPage: true,
  });
  await page.click("#again");
  assert.deepEqual(
    await page.evaluate(() => moonward.game.s.stats.breaches),
    {},
  );
  ok(
    "scouting pauses rest, preview matches boss, support rate, choice and evidence-based retry",
  );
  await page.evaluate(() => {
    moonward.game.summon(0);
    moonward.game.start();
  });
  await page.click("#menu");
  await page.click("#restart");
  await page.click("#closeDialog");
  assert.equal(await page.evaluate(() => moonward.game.s.wave), 1);
  await page.click("#menu");
  await page.click("#restart");
  await page.click("#yesRestart");
  assert.equal(await page.evaluate(() => moonward.game.s.wave), 0);
  ok("restart is explicit and cancellable");
  await page.evaluate(async () => {
    const { manage } = await import("./tests/simulate.mjs");
    let g = new moonward.Game(7);
    for (let i = 0; i < 40000; i++) {
      if (i % 15 === 0) manage(g, "balanced");
      g.step();
      g.drain();
      if (g.s.wave === 12 && g.s.enemies.some((e) => e.boss)) break;
    }
    moonward.setGame(g);
    moonward.pause(true);
  });
  for (let width of [320, 360, 375, 390, 430, 768]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    await page.waitForTimeout(150);
    let metrics = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
      buttons: [...document.querySelectorAll("button")]
        .filter((e) => e.offsetParent !== null)
        .map((e) => ({
          id: e.id || e.dataset.pad,
          w: e.getBoundingClientRect().width,
          h: e.getBoundingClientRect().height,
        })),
    }));
    assert.ok(metrics.scroll <= metrics.width, JSON.stringify(metrics));
    for (let b of metrics.buttons)
      assert.ok(b.w >= 43.9 && b.h >= 43.9, JSON.stringify(b));
    await page.screenshot({
      path: path.join(out, `battle-${width}.png`),
      fullPage: true,
    });
  }
  ok("320/360/375/390/430/768 widths, no horizontal overflow, 44px controls");
  await page.setViewportSize({ width: 844, height: 390 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.click("#guide");
  assert.ok(await page.isVisible("#dialog"));
  await page.click("#closeDialog");
  ok("landscape rotation and scrollable guide dialog");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => moonward.pause(false));
  await page.waitForTimeout(3500);
  await page.screenshot({
    path: path.join(out, "gameplay-390.png"),
    fullPage: true,
  });
  await page.evaluate(() => moonward.pause(true));
  await page.setViewportSize({ width: 390, height: 844 });
  report.performance = await page.evaluate(async () => {
    moonward.pause(true);
    let base = moonward.game.s.enemies[0] || {
      id: 100,
      hp: 100,
      max: 100,
      speed: 40,
      kind: "wisp",
      slow: 0,
      poison: 0,
      dot: 0,
      boss: false,
    };
    let perf = {};
    for (let count of [30, 60, 100]) {
      moonward.game.s.enemies = Array.from({ length: count }, (_, i) => ({
        ...base,
        id: 1000 + i,
        kind: i % 3 === 0 ? "beetle" : "wisp",
        boss: false,
        d: (i * 12) % 1200,
      }));
      let times = [];
      for (let n = 0; n < 120; n++) {
        let t = performance.now();
        moonward.render(n * 16, 1 / 60);
        times.push(performance.now() - t);
      }
      times.sort((a, b) => a - b);
      perf[count] = { median: times[60], p95: times[114] };
    }
    return perf;
  });
  ok("30/60/100-enemy render benchmark (headless desktop only)");
  await page.evaluate(() => {
    moonward.pause(false);
    moonward.step(3000);
  });
  assert.ok(
    await page.evaluate(
      () => moonward.metrics.effects <= 80 && moonward.metrics.shots <= 80,
    ),
  );
  ok("bounded effect queues");
  await page.goto(url);
  await page.waitForFunction(() => moonward);
  if (await page.locator("#resume").count()) await page.click("#resume");
  if (await page.locator("#again").count()) await page.click("#again");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  let hiddenTick = await page.evaluate(() => moonward.game.s.tick);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => moonward.game.s.tick), hiddenTick);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  assert.ok(await page.isVisible("#dialog"));
  await page.click("#closeDialog");
  ok("simulated visibility hide stops ticks and return requires resume");
  await page.evaluate(() =>
    window.dispatchEvent(new PageTransitionEvent("pagehide")),
  );
  assert.ok(await page.evaluate(() => moonward.metrics.disposed));
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent("pageshow", { persisted: true }),
    ),
  );
  assert.equal(await page.evaluate(() => moonward.metrics.disposed), false);
  await page.click("#closeDialog");
  ok(
    "simulated pagehide disposes renderer and bfcache pageshow resumes safely",
  );
  await page.evaluate(() =>
    localStorage.setItem("firemate_moonward_v1", "{broken"),
  );
  await page.reload();
  await page.waitForFunction(() => moonward);
  assert.equal(await page.evaluate(() => moonward.game.s.wave), 0);
  ok("corrupt storage fails safely to fresh session");
  assert.deepEqual(report.errors, []);
  ok("no uncaught browser errors");
  fs.writeFileSync(
    path.join(out, "browser-report.json"),
    JSON.stringify(report, null, 2),
  );
  await browser.close();
  server.close();
  console.log(JSON.stringify(report, null, 2));
})().catch(async (e) => {
  console.error(e);
  if (browser) await browser.close();
  server.close();
  process.exitCode = 1;
});
