// External dev dependencies only. NODE_PATH=<playwright modules> MOONWARD_CHROMIUM=<binary> node this-file
const { chromium } = require("playwright"),
  http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../../../.."),
  out = process.env.MOONWARD_EVIDENCE || path.join(__dirname, "evidence");
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
    res.end(d);
  });
});
let browser;
const realtime = process.env.MOONWARD_REALTIME === "1";
const report = { checks: [], errors: [] };
const ok = (t) => {
  report.checks.push(t);
  console.log("PASS", t);
};
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.MOONWARD_CHROMIUM,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  page.on("pageerror", (e) => report.errors.push(e.message));
  const base = "http://127.0.0.1:" + server.address().port;
  await page.goto(base + "/arcade/moonward/");
  await page.waitForURL("**/tactical/");
  await page.goto(base + "/arcade/moonward/tactical/?test");
  await page.waitForFunction(() => window.tactics);
  await page.evaluate(() => {
    localStorage.setItem("firemate_finance_sentinel", "keep");
    localStorage.setItem("firemate_moonward_v1", "classic-sentinel");
  });
  await page.click('[data-buy="archer"]');
  await page.click('[data-pad="0"]');
  await page.click('[data-buy="ember"]');
  await page.click('[data-pad="1"]');
  assert.equal(await page.evaluate(() => tactics.game.s.gold), 20);
  await page.click("#start");
  await page.waitForTimeout(900);
  assert.equal(await page.evaluate(() => tactics.game.s.wave), 1);
  assert.ok(await page.evaluate(() => tactics.game.s.enemies.length > 0));
  ok(
    "default entry redirects to tactics; direct role purchase and first combat with real controls",
  );
  await page.click("#plan");
  const state = await page.evaluate(() => tactics.game.serialize());
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => tactics.game.serialize()), state);
  await page.click("#speed");
  assert.equal(await page.textContent("#speed"), "2×");
  await page.click("#speed");
  ok("tactical pause freezes combat and speed controls work");
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [430, 932],
    [568, 320],
    [667, 375],
    [844, 390],
    [1024, 768],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(130);
    const bounds = await page.evaluate(() => {
      const f = document.querySelector("#field").getBoundingClientRect(),
        p = [...document.querySelectorAll(".pad")].map((b) =>
          b.getBoundingClientRect(),
        );
      return {
        overflow:
          document.documentElement.scrollWidth > innerWidth ||
          document.documentElement.scrollHeight > innerHeight,
        ratio: f.width / f.height,
        pads: p.every(
          (r) =>
            r.width >= 44 &&
            r.height >= 44 &&
            r.left >= 0 &&
            r.top >= 0 &&
            r.right <= innerWidth &&
            r.bottom <= innerHeight,
        ),
        overlap: p.some((a, i) =>
          p.some(
            (b, j) =>
              j > i &&
              a.left < b.right &&
              a.right > b.left &&
              a.top < b.bottom &&
              a.bottom > b.top,
          ),
        ),
      };
    });
    assert.equal(
      bounds.overflow,
      false,
      JSON.stringify({ width, height, bounds }),
    );
    assert.ok(bounds.pads, JSON.stringify({ width, height, bounds }));
    assert.equal(bounds.overlap, false);
    assert.ok(Math.abs(bounds.ratio - 460 / 300) < 0.015);
    assert.equal(await page.evaluate(() => tactics.game.serialize()), state);
  }
  ok(
    "seven phone/tablet portrait and landscape sizes: no overflow, 44px pads, no overlaps, undistorted map and preserved state",
  );
  await page.evaluate(() => tactics.save());
  await page.reload();
  await page.waitForSelector("#resume");
  await page.reload();
  await page.waitForSelector("#resume");
  await page.click("#resume");
  await page.click("#plan");
  assert.equal(await page.evaluate(() => tactics.game.s.units.length), 2);
  assert.equal(
    await page.evaluate(() => localStorage.getItem("firemate_moonward_v1")),
    "classic-sentinel",
  );
  assert.equal(
    await page.evaluate(() =>
      localStorage.getItem("firemate_finance_sentinel"),
    ),
    "keep",
  );
  ok("resume survives repeated reload; classic and finance keys preserved");
  // Finish five waves through the same engine; purchase and branch confirmation through real UI.
  await page.setViewportSize({ width: 844, height: 390 });
  const plan = [
    ["archer", 0],
    ["ember", 1],
    ["frost", 2],
    ["archer", 4],
    ["ember", 3],
    ["frost", 5],
  ];
  async function buy(kind, pad) {
    const can = await page.evaluate(
      (p) => !tactics.game.s.units.some((u) => u.pad === p),
      pad,
    );
    if (can && !(await page.isDisabled(`[data-buy="${kind}"]`))) {
      await page.click(`[data-buy="${kind}"]`);
      await page.click(`[data-pad="${pad}"]`);
    }
  }
  async function manage() {
    for (const [k, p] of plan.slice(0, 3)) await buy(k, p);
    const units = await page.evaluate(() =>
      tactics.game.s.units
        .map((u) => ({ ...u }))
        .sort(
          (a, b) =>
            (a.kind === "ember" ? -1 : 1) - (b.kind === "ember" ? -1 : 1),
        ),
    );
    for (const u of units)
      if (!u.upgrade) {
        await page.click(`[data-pad="${u.pad}"]`);
        const key =
          u.kind === "archer"
            ? "rapid"
            : u.kind === "ember"
              ? "blast"
              : "spread";
        if (!(await page.isDisabled(`[data-upgrade="${key}"]`))) {
          await page.click(`[data-upgrade="${key}"]`);
          await page.click("#confirmUpgrade");
        }
      }
    for (const [k, p] of plan.slice(3)) await buy(k, p);
  }
  if (realtime) {
    if ((await page.textContent("#speed")).includes("1"))
      await page.click("#speed");
    await page.evaluate(() => tactics.pause(false));
  }
  for (let wave = 1; wave <= 5; wave++) {
    if (wave > 1) {
      await manage();
      await page.click("#start");
      if (!realtime) await page.click("#plan");
    }
    if (realtime) await page.waitForTimeout(5000);
    else await page.evaluate(() => tactics.step(300));
    if (wave === 3) {
      await page.evaluate(() => tactics.pause(false));
      await page.waitForTimeout(1900);
      await page.evaluate(() => tactics.draw());
      await page.screenshot({ path: path.join(out, "tactical-landscape.jpg") });
      await page.evaluate(() => tactics.pause(true));
      await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate(() => tactics.draw());
      await page.screenshot({ path: path.join(out, "tactical-portrait.jpg") });
      await page.setViewportSize({ width: 844, height: 390 });
    }
    if (wave === 5) {
      await page.evaluate(() => tactics.draw());
      await page.screenshot({ path: path.join(out, "tactical-boss.jpg") });
    }
    if (realtime) {
      await page.evaluate(() => tactics.pause(false));
      await page.waitForFunction(
        () => tactics.game.s.phase !== "battle",
        null,
        { timeout: 90000 },
      );
    } else
      await page.evaluate(() => {
        let n = 0;
        while (tactics.game.s.phase === "battle" && n++ < 8000) tactics.step(1);
      });
    assert.ok(await page.evaluate(() => tactics.game.s.phase !== "battle"));
  }
  assert.equal(await page.evaluate(() => tactics.game.s.phase), "won");
  await page.waitForSelector("#retry", { state: "visible" });
  await page.screenshot({ path: path.join(out, "tactical-victory.jpg") });
  ok(
    realtime
      ? "five-wave real-time browser run with UI purchases, upgrades, boss and victory"
      : "five-wave seeded engine run with actual UI purchases, upgrades, boss and victory",
  );
  await page.click("#retry");
  assert.equal(await page.evaluate(() => tactics.game.s.units.length), 0);
  assert.equal(await page.evaluate(() => tactics.game.s.gold), 230);
  ok("victory retry resets all combat state");
  await page.click('[data-buy="frost"]');
  await page.click('[data-pad="0"]');
  await page.click("#move");
  await page.click('[data-pad="2"]');
  assert.equal(await page.evaluate(() => tactics.game.s.units[0].pad), 2);
  await page.click("#sell");
  await page.click("#close");
  assert.equal(await page.evaluate(() => tactics.game.s.units.length), 1);
  await page.click("#sell");
  await page.click("#confirmSell");
  assert.equal(await page.evaluate(() => tactics.game.s.units.length), 0);
  ok("free preparation move, sale preview, cancellation and refund");
  await page.click('[data-buy="frost"]');
  await page.click('[data-pad="0"]');
  await page.click("#start");
  await page.click("#plan");
  await page.evaluate(() => tactics.step(5000));
  assert.equal(await page.evaluate(() => tactics.game.s.phase), "lost");
  await page.waitForSelector("#retry", { state: "visible" });
  await page.click("#retry");
  ok("weak all-slow defense can lose and retry cleanly");
  await page.click('[data-buy="archer"]');
  await page.click('[data-pad="0"]');
  await page.click('[data-upgrade="rapid"]');
  await page.click("#close");
  assert.equal(
    await page.evaluate(() => tactics.game.s.units[0].upgrade),
    null,
  );
  await page.click('[data-upgrade="rapid"]');
  await page.click("#confirmUpgrade");
  assert.equal(await page.evaluate(() => tactics.game.s.gold), 30);
  assert.equal(
    await page.evaluate(() =>
      tactics.game.upgrade(tactics.game.s.units[0].id, "pierce"),
    ),
    false,
  );
  ok("upgrade preview/cancel/confirm and mutually exclusive branches");
  await page.click("#settings");
  await page.check("#sound");
  await page.check("#motion");
  await page.click("#restart");
  await page.click("#close");
  assert.equal(await page.evaluate(() => tactics.game.s.units.length), 1);
  await page.click("#settings");
  await page.click("#restart");
  await page.click("#confirmRestart");
  assert.equal(await page.evaluate(() => tactics.game.s.units.length), 0);
  ok("sound/reduced motion and cancellable restart");
  await page.evaluate(() =>
    window.dispatchEvent(new PageTransitionEvent("pagehide")),
  );
  assert.ok(await page.evaluate(() => tactics.disposed));
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent("pageshow", { persisted: true }),
    ),
  );
  assert.equal(await page.evaluate(() => tactics.disposed), false);
  await page.click("#close");
  ok("pagehide cleanup and bfcache return");
  await page.evaluate(() => {
    localStorage.setItem("firemate_moonward_tactics_v1", "{broken");
  });
  await page.reload();
  await page.waitForFunction(() => window.tactics);
  assert.equal(await page.evaluate(() => tactics.game.s.wave), 0);
  ok("corrupt save starts safely");
  report.renderSubmissionMs = await page.evaluate(() => {
    const perf = {};
    for (const count of [30, 60, 100]) {
      const g = new tactics.Battle(1);
      g.s.phase = "battle";
      g.s.wave = 5;
      g.s.enemies = Array.from({ length: count }, (_, i) => ({
        id: i + 100,
        kind: i % 3 ? "wolf" : "beetle",
        hp: 85,
        max: 100,
        speed: 45,
        d: 30 + i * 10,
        slow: i % 2,
        slowRate: 0.45,
        slowSource: 0,
        flash: 0,
      }));
      tactics.setGame(g);
      tactics.pause(true);
      const times = [];
      for (let i = 0; i < 120; i++) {
        const t = performance.now();
        tactics.draw();
        times.push(performance.now() - t);
      }
      times.sort((a, b) => a - b);
      perf[count] = { median: times[60], p95: times[114] };
    }
    return perf;
  });
  ok(
    "30/60/100-enemy render submission benchmark (headless desktop, not phone FPS)",
  );
  assert.deepEqual(report.errors, []);
  ok("no uncaught browser errors");
  fs.writeFileSync(
    path.join(out, "browser-report.json"),
    JSON.stringify(report, null, 2),
  );
  await browser.close();
  server.close();
  console.log(JSON.stringify(report));
})().catch(async (e) => {
  console.error(e);
  if (browser) await browser.close();
  server.close();
  process.exitCode = 1;
});
