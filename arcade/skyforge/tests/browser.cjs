const { chromium } = require("playwright"),
  fs = require("node:fs"),
  http = require("node:http"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../../.."),
  out = path.join(__dirname, "evidence");
fs.mkdirSync(out, { recursive: true });
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
      /\.m?js$/.test(p)
        ? "text/javascript"
        : p.endsWith(".css")
          ? "text/css"
          : p.endsWith(".png")
            ? "image/png"
            : "text/html",
    );
    res.end(b);
  });
});
const report = { checks: [], errors: [] };
const ok = (s) => {
  report.checks.push(s);
  console.log("PASS", s);
};
let browser;
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.SKYFORGE_CHROMIUM,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });
  page.on("pageerror", (e) => report.errors.push(e.message));
  await page.addInitScript(() => (window.__skyforgeTest = true));
  const url = `http://127.0.0.1:${server.address().port}/arcade/skyforge/`;
  await page.goto(url);
  await page.waitForFunction(() => window.__skyforge);
  assert.equal(await page.locator(".stage").count(), 12);
  await page.screenshot({ path: path.join(out, "lobby.png"), fullPage: true });
  await page.evaluate(() =>
    localStorage.setItem("firemate_finance_test", "preserve"),
  );
  await page.locator("#launch").click();
  const field = await page.locator("#field").boundingBox();
  await page.mouse.move(
    field.x + field.width / 2,
    field.y + field.height * 0.75,
  );
  let t = await page.evaluate(() => __skyforge.game.s.time);
  await page.waitForTimeout(1000);
  const slow = (await page.evaluate(() => __skyforge.game.s.time)) - t;
  await page.mouse.down();
  t = await page.evaluate(() => __skyforge.game.s.time);
  await page.mouse.move(
    field.x + field.width * 0.7,
    field.y + field.height * 0.68,
    { steps: 10 },
  );
  await page.waitForTimeout(1100);
  const fast = (await page.evaluate(() => __skyforge.game.s.time)) - t;
  assert.ok(fast > slow * 2.5);
  await page.mouse.up();
  ok("Real pointer drag and release slowdown");
  await page.evaluate(() => {
    const g = __skyforge.game;
    while (g.s.phase === "battle" && g.s.time < 9) g.step();
  });
  await page.waitForSelector(".choice");
  await page.screenshot({ path: path.join(out, "choice.png") });
  await page.locator(".choice").first().click();
  assert.equal(await page.evaluate(() => __skyforge.game.s.phase), "battle");
  ok("First skill choice and resume");
  await page.locator("#pause").click();
  await page
    .getByRole("button", { name: "저장하고 격납고로", exact: true })
    .click();
  await page.reload();
  await page.locator("#resume").click();
  assert.equal(await page.evaluate(() => __skyforge.paused), true);
  await page.getByRole("button", { name: "계속 비행", exact: true }).click();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("firemate_finance_test")),
    "preserve",
  );
  ok("Save reload paused and finance key preserved");
  await page.evaluate(() => {
    const g = new __skyforge.Game({ stage: 3, seed: 12 });
    g.s.time = 45;
    g.s.level = 5;
    g.s.skills = {
      volley: 3,
      laser: 3,
      missile: 3,
      drone: 3,
      orbit: 0,
      arc: 0,
      frost: 0,
      shield: 1,
    };
    for (let i = 0; i < 5; i++) g.spawn("gunner", 40 + i * 65, 100 + i * 30);
    __skyforge.load(g);
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(out, "battle.png") });
  await page.evaluate(() => {
    __skyforge.profile.records["normal:1"] = 3;
    const g = new __skyforge.Game({ stage: 2 });
    g.s.time = g.scene.duration;
    g.s.level = 5;
    g.s.skills.missile = 3;
    g.s.skills.volley = 3;
    g.spawn("boss", 180);
    g.s.bossSpawned = true;
    g.s.enemies[0].y = 70;
    g.bossAttack(g.s.enemies[0]);
    __skyforge.load(g);
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(out, "boss.png") });
  await page.locator("#pulse").click();
  assert.equal(await page.evaluate(() => __skyforge.game.s.pulse), 1);
  ok("Boss warning rendering and emergency pulse");
  for (const size of [
    { width: 320, height: 568 },
    { width: 430, height: 932 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    await page.waitForTimeout(80);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    const b = await page.locator("#pulse").boundingBox();
    assert.ok(b.height >= 44 && b.y + b.height <= size.height + 1);
    await page.screenshot({
      path: path.join(out, `viewport-${size.width}.png`),
    });
  }
  ok("320px portrait, large portrait, landscape layout and 44px pulse target");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    const g = __skyforge.game;
    g.s.inv = 0;
    g.hurt(999);
  });
  await page.getByRole("heading", { name: "비행 종료", exact: true }).waitFor();
  await page.screenshot({ path: path.join(out, "defeat.png") });
  await page
    .getByRole("button", { name: "같은 항로 재도전", exact: true })
    .click();
  assert.ok(
    await page.evaluate(
      () => __skyforge.game.s.time < 1 && __skyforge.game.s.hits === 0,
    ),
  );
  ok("Loss and clean retry");
  await page.evaluate(() => {
    const g = __skyforge.game;
    g.s.phase = "won";
    g.s.hits = 0;
  });
  await page
    .getByRole("heading", { name: "항로 돌파!", exact: true })
    .waitFor();
  assert.equal(
    await page.evaluate(() => __skyforge.profile.records["normal:2"]),
    3,
  );
  await page.screenshot({ path: path.join(out, "victory.png") });
  ok("Win best-record reward");
  await page.evaluate(() => {
    const g = new __skyforge.Game();
    g.s.skills.laser = 2;
    g.s.phase = "choice";
    g.s.choices = ["laser", "shield", "drone"];
    __skyforge.load(g);
    __skyforge.save();
  });
  await page.reload();
  await page.locator("#resume").click();
  await page.getByRole("button", { name: "계속 비행", exact: true }).click();
  await page.locator(".choice").filter({ hasText: "레일 광선" }).click();
  assert.equal(await page.evaluate(() => __skyforge.game.s.skills.laser), 3);
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(out, "evolution.png") });
  ok("Choice save restore and level-three evolution");
  await page.locator("#loadout button").first().click();
  assert.equal(await page.evaluate(() => __skyforge.paused), true);
  await page.getByRole("button", { name: "계속 비행", exact: true }).click();
  ok("Tap equipped weapon to inspect role and upgrades without taking damage");
  // Run production engine with deterministic pilot in the rendered app, no invulnerability.
  const result = await page.evaluate(async () => {
    const { steer, builds } = await import("./tests/simulate.mjs");
    const g = new __skyforge.Game({ stage: 1, seed: 4 });
    for (let i = 0; i < 16000 && !["won", "lost"].includes(g.s.phase); i++) {
      if (g.s.phase === "choice")
        g.choose(
          [...g.s.choices].sort(
            (a, b) => builds.balanced.indexOf(a) - builds.balanced.indexOf(b),
          )[0],
        );
      g.step(steer(g));
      g.events = [];
    }
    __skyforge.load(g);
    return { phase: g.s.phase, time: g.s.time, hits: g.s.hits };
  });
  assert.equal(result.phase, "won");
  report.acceleratedRun = result;
  ok(
    "Full production first-stage engine through boss victory in browser (accelerated)",
  );

  await page.evaluate(() => {
    const g = new __skyforge.Game({ stage: 12 });
    g.s.time = g.scene.duration;
    g.s.level = 10;
    g.s.bossSpawned = true;
    const e = g.spawn("boss", 180);
    e.y = 70;
    e.age = 35;
    __skyforge.load(g);
  });
  await page.waitForTimeout(100);
  assert.ok((await page.locator("#boss").textContent()).includes("피해 3배"));
  await page.screenshot({ path: path.join(out, "overheat.png") });
  ok("Late boss overheating is visible in the HUD");
  // Stress rendering uses fixtures; timing is desktop Chromium CPU work, not phone FPS.
  report.stress = await page.evaluate(async () => {
    const { paint } = await import("./art.mjs");
    const g = new __skyforge.Game({ stage: 12 });
    g.s.level = 10;
    for (let i = 0; i < 60; i++)
      g.spawn(
        i % 2 ? "scout" : "gunner",
        20 + (i % 10) * 34,
        30 + Math.floor(i / 10) * 65,
      );
    for (let i = 0; i < 250; i++)
      g.enemyBullet(
        20 + (i % 20) * 16,
        20 + Math.floor(i / 20) * 35,
        Math.PI / 2,
        90,
      );
    const c = document.createElement("canvas");
    c.width = 720;
    c.height = 1200;
    const ctx = c.getContext("2d"),
      times = [];
    for (let i = 0; i < 180; i++) {
      const t = performance.now();
      paint(ctx, g.s, []);
      times.push(performance.now() - t);
    }
    times.sort((a, b) => a - b);
    return {
      enemies: 60,
      bullets: 250,
      drawMsP95: times[Math.floor(times.length * 0.95)],
    };
  });
  ok("60-enemy / 250-bullet rendering stress fixture");
  await page.evaluate(async () => {
    __skyforge.load(new __skyforge.Game());
    __skyforge.save();
    await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller);
  await page.reload();
  await page.waitForFunction(() => window.__skyforge);
  await page.context().setOffline(true);
  await page.reload();
  await page.waitForFunction(() => window.__skyforge);
  await page.locator("#resume").click();
  await page.getByRole("button", { name: "계속 비행", exact: true }).click();
  ok("Actual root service worker cached game and modules for offline resume");
  await page.context().setOffline(false);
  if (process.env.SKYFORGE_REALTIME === "1") {
    await page.evaluate(() =>
      __skyforge.load(new __skyforge.Game({ stage: 1, seed: 4 })),
    );
    const start = Date.now();
    let phase = "battle",
      firstChoice = null;
    while (Date.now() - start < 210000) {
      const info = await page.evaluate(async () => {
        const { steer, builds } = await import("./tests/simulate.mjs");
        const s = __skyforge.game.s;
        return {
          phase: s.phase,
          x: s.x,
          y: s.y,
          target: steer(__skyforge.game),
          choice: s.choices
            .slice()
            .sort(
              (a, b) => builds.balanced.indexOf(a) - builds.balanced.indexOf(b),
            )[0],
          pulse: s.pulse,
          threat: s.bullets.filter((b) => Math.hypot(b.x - s.x, b.y - s.y) < 55)
            .length,
          time: s.time,
        };
      });
      phase = info.phase;
      if (["won", "lost"].includes(phase)) break;
      if (phase === "choice") {
        firstChoice ??= info.time;
        await page
          .locator(".choice")
          .filter({
            hasText: await page.evaluate(
              (k) => import("./data.mjs").then((m) => m.SKILLS[k].name),
              info.choice,
            ),
          })
          .click();
        continue;
      }
      if (info.pulse && info.threat >= 3) await page.locator("#pulse").click();
      const r = await page.locator("#field").boundingBox(),
        scale = r.height / 600;
      const x = r.x + r.width / 2,
        y = r.y + r.height * 0.65;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(
        x + (info.target.x - info.x) * scale,
        y + (info.target.y - info.y) * scale,
        { steps: 2 },
      );
      await page.waitForTimeout(90);
      await page.mouse.up();
    }
    report.realtime = {
      phase,
      wallSeconds: (Date.now() - start) / 1000,
      firstChoice,
      ...(await page.evaluate(() => ({
        battleSeconds: __skyforge.game.s.time,
        hits: __skyforge.game.s.hits,
        level: __skyforge.game.s.level,
      }))),
    };
    await page.screenshot({ path: path.join(out, "realtime-result.png") });
    assert.equal(phase, "won");
    ok("Real-time first stage through boss with mouse drag, choices and pulse");
  }
  assert.deepEqual(report.errors, []);
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
