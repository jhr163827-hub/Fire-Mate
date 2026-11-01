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
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
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
    localStorage.setItem(
      "firemate_frontier_v1",
      new frontier.Game().serialize(),
    );
  });
  assert.equal(await page.locator("[data-stage]").count(), 30);
  assert.equal(await page.locator("[data-stage]:not(:disabled)").count(), 1);
  await page.screenshot({ path: path.join(out, "campaign-map.jpg") });
  await page.click('[data-stage="1"]');
  assert.equal(await page.locator('[data-mode="hard"]').isDisabled(), true);
  await page.click('[data-mode="normal"]');
  async function tap(x, y) {
    const r = await page.locator("#canvas").boundingBox();
    await page.mouse.click(
      r.x + (x * r.width) / 640,
      r.y + (y * r.height) / 400,
    );
  }
  async function buy(k, x, y) {
    await page.click(`[data-buy="${k}"]`);
    await tap(x, y);
    await page.click("#place");
  }
  await buy("dart", 180, 135);
  await buy("bomb", 310, 135);
  await page.click("#start");
  await page.waitForFunction(() => frontier.game.s.kills > 0);
  await page.screenshot({ path: path.join(out, "campaign-first.jpg") });
  ok(
    "default 30-stage map, locked modes, first UI purchases and actual combat",
  );
  await page.evaluate(() => {
    frontier.pause(true);
    frontier.save();
  });
  await page.reload();
  await page.click("#campaignResume");
  await page.evaluate(() => frontier.pause(true));
  assert.equal(await page.evaluate(() => frontier.game.s.stage), 1);
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("firemate_frontier_v1")).wave,
    ),
    0,
  );
  for (const [w, h] of [
    [320, 568],
    [390, 844],
    [844, 390],
    [667, 375],
    [1024, 768],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(80);
    const a = await page.evaluate(() => {
      const r = document.querySelector("#canvas").getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        ratio: r.width / r.height,
        buttons: [
          ...document.querySelectorAll(
            "#hud button,header button,#shop button",
          ),
        ]
          .filter((b) => !b.hidden)
          .map((b) => b.getBoundingClientRect().height),
      };
    });
    assert.equal(a.overflow, false);
    assert.ok(Math.abs(a.ratio - 1.6) < 0.01);
    assert.ok(a.buttons.every((h) => h >= 44));
  }
  ok("isolated campaign resume and five viewport layouts/44px controls");
  await page.setViewportSize({ width: 844, height: 390 });
  async function manageUI() {
    const plan = await page.evaluate(async () => {
      frontier.pause(true);
      const { manage } = await import("./tests/campaign-simulate.mjs"),
        old = frontier.game.s.towers,
        g = frontier.Game.restore(frontier.game.serialize());
      manage(g, "artillery");
      return g.s.towers.map((t) => ({
        ...t,
        oldLevel: old.find((o) => o.id === t.id)?.level ?? -1,
      }));
    });
    for (const t of plan) {
      if (t.oldLevel === -1) await buy(t.kind, t.x, t.y);
      for (let lv = Math.max(0, t.oldLevel); lv < t.level; lv++) {
        await tap(t.x, t.y);
        await page.click(`[data-upgrade="${t.branch}"]`);
        await page.click("#confirmUpgrade");
      }
      if (t.target === "strong") {
        await tap(t.x, t.y);
        await page.click('[data-target="strong"]');
      }
    }
  }
  async function finishStage(real = false) {
    for (let i = 0; i < 400; i++) {
      const phase = await page.evaluate(() => frontier.game.s.phase);
      if (["won", "lost"].includes(phase)) break;
      if (phase === "ready") {
        await manageUI();
        await page.click("#start");
      }
      await page.evaluate((real) => {
        const g = frontier.game,
          e = g.s.enemies
            .filter((e) => e.hp > 0)
            .sort((a, b) => g.remaining(a) - g.remaining(b))[0];
        if (e && g.remaining(e) < 250) g.meteor(e.x, e.y);
        frontier.pause(!real);
        if (!real) frontier.step(180);
      }, real);
      if (real) {
        if ((await page.locator("#speed").textContent()) === "1×")
          await page.click("#speed");
        await page.waitForTimeout(1000);
      }
    }
    assert.equal(await page.evaluate(() => frontier.game.s.phase), "won");
  }
  await finishStage(realtime);
  assert.equal(await page.locator(".unlock").textContent(), "냉각탑 해금!");
  await page.click("#nextStage");
  assert.equal(await page.locator('[data-buy="ice"]').isVisible(), true);
  await page.click("#campaignMap");
  assert.equal(await page.locator("[data-stage]:not(:disabled)").count(), 2);
  await page.click('[data-stage="1"]');
  await page.click('[data-mode="challenge"]');
  assert.equal(await page.evaluate(() => frontier.game.scene.maxTowers), 6);
  ok(
    "six-wave first stage with UI upgrades, victory stars, next stage, unlock, challenge",
  );
  await page.evaluate(() => {
    const p = { v: 1, records: {}, endless: {} };
    for (let i = 1; i <= 5; i++)
      p.records["normal:" + i] = { stars: 3, lives: 30, time: 180 };
    frontier.setProfile(p);
    frontier.menu();
  });
  await page.click('[data-stage="6"]');
  await page.click('[data-mode="normal"]');
  await finishStage();
  await page.click("#nextStage");
  assert.equal(await page.locator('[data-buy="pierce"]').isVisible(), true);
  ok(
    "first boss stage complete using normal economy and UI; next region and rail tower",
  );
  await page.evaluate(() => {
    const p = { v: 1, records: {}, endless: {} };
    for (let i = 1; i <= 30; i++)
      p.records["normal:" + i] = { stars: 3, lives: 30, time: 180 };
    frontier.setProfile(p);
    frontier.menu();
  });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.screenshot({
    path: path.join(out, "campaign-all-maps.jpg"),
    fullPage: true,
  });
  for (const id of [7, 13, 19, 25]) {
    await page.click(`[data-stage="${id}"]`);
    await page.click('[data-mode="normal"]');
    await page.evaluate(async () => {
      const { manage } = await import("./tests/campaign-simulate.mjs");
      manage(frontier.game, "toxic");
      frontier.step(0);
      frontier.pause(true);
    });
    await page.waitForTimeout(130);
    await page.screenshot({ path: path.join(out, `region-${id}.jpg`) });
    await page.click("#campaignMap");
  }
  await page.click('[data-stage="30"]');
  await page.click('[data-mode="normal"]');
  await page.evaluate(async () => {
    const { manage } = await import("./tests/campaign-simulate.mjs"),
      g = frontier.game;
    g.s.gold = 7000;
    manage(g, "toxic");
    g.s.wave = 5;
    g.start();
    frontier.step(600);
    frontier.pause(true);
    frontier.save();
  });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(130);
  await page.screenshot({ path: path.join(out, "campaign-final-boss.jpg") });
  await page.reload();
  await page.click("#campaignResume");
  await page.evaluate(() => frontier.pause(true));
  assert.equal(await page.evaluate(() => frontier.game.s.stage), 30);
  assert.ok(
    await page.evaluate(() =>
      frontier.game.s.enemies.some((e) => e.pattern === "final"),
    ),
  );
  ok(
    "five regional scenes and final-boss multi-route poison/mine save fixture",
  );
  report.lateBattleMs = await page.evaluate(() => {
    const g = frontier.game;
    g.s.enemies = [];
    for (let i = 0; i < 200; i++)
      g.spawn(i % 3 ? "shell" : "regenerator", i * 4, false, i % 2);
    const a = [];
    for (let i = 0; i < 60; i++) {
      const start = performance.now();
      frontier.step(1);
      frontier.draw();
      a.push(performance.now() - start);
    }
    a.sort((a, b) => a - b);
    return { median: a[30], p95: a[57] };
  });
  await page.evaluate(() => {
    const g = new frontier.Game(3, { stage: 30 });
    g.buy("dart", 200, 110);
    g.start();
    g.s.lives = 1;
    g.s.queue = [];
    g.spawn("runner", 1840);
    frontier.setGame(g);
    frontier.step(1000);
  });
  assert.equal(await page.evaluate(() => frontier.game.s.phase), "lost");
  await page.click("#retry");
  assert.equal(await page.evaluate(() => frontier.game.s.wave), 0);
  assert.equal(
    await page.evaluate(
      () => frontier.game.s.enemies.length + frontier.game.s.mines.length,
    ),
    0,
  );
  await page.click("#campaignMap");
  await page.click('[data-stage="6"]');
  await page.click('[data-mode="endless"]');
  await page.evaluate(() => {
    frontier.game.s.wave = 12;
    frontier.game.s.phase = "lost";
    frontier.step(0);
  });
  assert.equal(await page.evaluate(() => frontier.profile.endless[6]), 11);
  ok("200-enemy benchmark, defeat, clean retry and endless score");
  await page.click("#resultMap");
  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => navigator.serviceWorker.controller);
  await page.reload();
  await page.click('[data-stage="1"]');
  await page.click('[data-mode="normal"]');
  await buy("dart", 180, 135);
  await page.click("#start");
  await page.evaluate(() => frontier.save());
  await page.context().setOffline(true);
  await page.reload();
  await page.click("#campaignResume");
  assert.equal(await page.evaluate(() => frontier.game.s.stage), 1);
  assert.equal(
    await page.evaluate(() => localStorage.getItem("firemate_finance_test")),
    "preserve",
  );
  await page.context().setOffline(false);
  ok(
    "actual shared SW offline campaign resume, financial and legacy storage preserved",
  );
  assert.deepEqual(report.errors, []);
  ok("no uncaught browser errors");
  fs.writeFileSync(
    path.join(out, "campaign-report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    server.close();
  });
