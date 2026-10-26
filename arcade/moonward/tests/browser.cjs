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
  // Actual wave-clear reward, pending reload, choice preview and duplicate callback.
  await page.evaluate(() => {
    const g = new moonward.Game(19),
      s = g.s;
    s.gold = 1000;
    ["archer", "thorn", "frost", "bell"].forEach((k, i) => g.summon(i, k));
    s.gold = 100;
    s.wave = 6;
    s.phase = "battle";
    s.waveTime = 27;
    s.spawned = 18;
    s.enemies = [
      {
        id: s.nextId++,
        d: 100,
        hp: 0,
        max: 10,
        speed: 30,
        kind: "boss",
        boss: true,
        slow: 0,
        poison: 0,
        dot: 0,
        source: 0,
      },
    ];
    moonward.setGame(g);
    moonward.step(1);
  });
  await page.waitForSelector("[data-boon]");
  assert.equal(await page.locator("[data-boon]").count(), 3);
  assert.ok(await page.isDisabled("#confirmBoon"));
  await page.keyboard.press("Escape");
  assert.ok(await page.isVisible("#dialog"));
  const boonTick = await page.evaluate(() => moonward.game.s.tick);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => moonward.game.s.tick), boonTick);
  await page.reload();
  await page.waitForSelector("#resume");
  await page.click("#resume");
  await page.waitForSelector("[data-boon]");
  await page.click('[data-boon="venom"]');
  assert.match(await page.textContent("#boonDetail"), /10%/);
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    const dims = await page.locator("[data-boon]").evaluateAll((bs) =>
      bs.map((b) => ({
        w: b.getBoundingClientRect().width,
        h: b.getBoundingClientRect().height,
      })),
    );
    assert.ok(dims.every((b) => b.w >= 44 && b.h >= 44));
    assert.ok(
      await page.evaluate(
        () =>
          document.querySelector(".boonScroll").getBoundingClientRect()
            .bottom <=
          document.querySelector("#confirmBoon").getBoundingClientRect().top,
      ),
    );
    await page.click('[data-boon="supply"]');
    await page.click('[data-boon="venom"]');
    await page.evaluate(
      () => (document.querySelector(".boonScroll").scrollTop = 0),
    );
    await page.screenshot({
      path: path.join(out, `boon-choice-${width}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click('[data-boon="supply"]');
  const rewardGold = await page.evaluate(() => moonward.game.s.gold);
  await page.evaluate(() => {
    window.repeatBoonClick = document.querySelector("#confirmBoon").onclick;
  });
  await page.click("#confirmBoon");
  await page.evaluate(() => window.repeatBoonClick());
  assert.equal(
    await page.evaluate(() => moonward.game.s.gold),
    rewardGold + 125,
  );
  await page.reload();
  await page.waitForSelector("#resume");
  await page.click("#resume");
  assert.equal(await page.locator("[data-boon]").count(), 0);
  assert.match(await page.textContent("#boonStatus"), /달빛 보급/);
  await page.click("#menu");
  await page.click("#restart");
  await page.click("#yesRestart");
  assert.deepEqual(await page.evaluate(() => moonward.game.s.boons), []);
  ok(
    "boss blessing offer, freeze, pending reload, mobile preview, explicit choice, duplicate callback and reset",
  );
  await page.evaluate(() => {
    const g = new moonward.Game(12);
    g.s.gold = 1000;
    const a = g.summon(0, "archer"),
      e = g.summon(1, "ember");
    a.tier = e.tier = 3;
    g.summon(2, "frost");
    g.summon(3, "bell");
    g.s.gold = 199;
    moonward.setGame(g);
  });
  await page.click('[data-pad="0"]');
  await page.click("#merge");
  assert.ok(await page.isDisabled("#confirmEvolve"));
  assert.match(await page.textContent("#dialogBody"), /월광 관통궁/);
  await page.click("#closeDialog");
  assert.equal(
    await page.evaluate(() => !!moonward.game.s.units[0].evolved),
    false,
  );
  await page.evaluate(() => {
    moonward.game.s.gold = 600;
    moonward.setGame(moonward.game);
  });
  await page.click("#merge");
  await page.evaluate(() => {
    window.repeatEvolution = document.querySelector("#confirmEvolve").onclick;
  });
  await page.click("#confirmEvolve");
  await page.evaluate(() => repeatEvolution());
  assert.equal(await page.evaluate(() => moonward.game.s.gold), 400);
  assert.match(await page.textContent("#selection"), /월광 관통궁/);
  await page.click('[data-pad="1"]');
  await page.click("#merge");
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.locator("#confirmEvolve").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(out, `evolution-preview-${width}.png`),
      fullPage: true,
    });
  }
  await page.click("#confirmEvolve");
  assert.equal(await page.evaluate(() => moonward.game.s.gold), 200);
  await page.evaluate(() => {
    const g = moonward.game;
    g.s.wave = 5;
    g.start();
    g.s.spawned = 18;
    g.s.enemies = Array.from({ length: 12 }, (_, i) => ({
      id: g.s.nextId++,
      d: 40 + i * 18,
      hp: 5000,
      max: 5000,
      speed: 35,
      kind: "wisp",
      boss: false,
      slow: 0,
      poison: 0,
      dot: 0,
      source: 0,
    }));
    moonward.step(2);
    moonward.pause(true);
    moonward.save();
  });
  assert.ok(await page.evaluate(() => moonward.game.s.fields.length > 0));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: path.join(out, "evolution-battle-390.png"),
    fullPage: true,
  });
  await page.reload();
  await page.waitForSelector("#resume");
  await page.click("#resume");
  await page.evaluate(() => moonward.pause(true));
  assert.equal(
    await page.evaluate(
      () => moonward.game.s.units.filter((u) => u.evolved).length,
    ),
    2,
  );
  assert.ok(await page.evaluate(() => moonward.game.s.fields.length > 0));
  await page.click('[data-pad="1"]');
  await page.click("#sell");
  await page.click("#confirmSell");
  assert.equal(await page.evaluate(() => moonward.game.s.fields.length), 0);
  await page.click("#menu");
  await page.click("#restart");
  await page.click("#yesRestart");
  assert.equal(await page.evaluate(() => moonward.game.s.fields.length), 0);
  ok(
    "both evolution previews, affordability, cancel, duplicate confirm, attacks, field save/resume, sell and reset",
  );

  await page.evaluate(() => {
    const g = new moonward.Game(19);
    g.s.gold = 1000;
    g.summon(0, "archer").tier = 2;
    g.summon(1, "archer");
    g.s.gold = 180;
    moonward.setGame(g);
    moonward.pause(true);
    moonward.save();
  });
  await page.click("#guide");
  const guideState = await page.evaluate(() => moonward.game.serialize());
  assert.match(await page.textContent(".guideProgress"), /1성 1명 더 필요/);
  assert.equal(await page.textContent(".guideCost strong"), "315");
  await page.click('[data-guide-kind="ember"]');
  assert.equal(await page.textContent(".guideCost strong"), "585");
  await page.click('[data-guide-mode="rules"]');
  assert.match(await page.textContent("#guideScroll"), /11회 연속/);
  await page.click('[data-guide-mode="evolution"]');
  await page.click('[data-guide-kind="archer"]');
  assert.equal(
    await page.evaluate(() => moonward.game.serialize()),
    guideState,
  );
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.locator("#guideScroll").evaluate((e) => (e.scrollTop = 0));
    const bounds = await page.evaluate(() => {
      const b = document.querySelector("#closeDialog").getBoundingClientRect();
      return {
        bottom: b.bottom,
        top: b.top,
        height: b.height,
        overflow: document.documentElement.scrollWidth > innerWidth,
        controls: [
          ...document.querySelectorAll(".guideNav button,.guideKinds button"),
        ].map((e) => ({
          w: e.getBoundingClientRect().width,
          h: e.getBoundingClientRect().height,
        })),
      };
    });
    assert.ok(
      bounds.top >= 0 &&
        bounds.bottom <= viewport.height &&
        bounds.height >= 44 &&
        !bounds.overflow,
      JSON.stringify(bounds),
    );
    assert.ok(bounds.controls.every((b) => b.w >= 44 && b.h >= 44));
    if (viewport.width < 400)
      await page.screenshot({
        path: path.join(out, `guide-${viewport.width}.jpg`),
        type: "jpeg",
        quality: 85,
        fullPage: true,
      });
    if (viewport.width === 320) {
      await page.locator(".guideProgress").scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(out, "guide-progress-320.jpg"),
        type: "jpeg",
        quality: 85,
        fullPage: true,
      });
      assert.ok(await page.locator("#closeDialog").isVisible());
      assert.ok(
        await page
          .locator("#guideScroll")
          .evaluate((e) => e.scrollWidth <= e.clientWidth),
      );
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click("#guideSelect");
  assert.equal(await page.locator("#dialog").evaluate((e) => e.open), false);
  assert.match(await page.textContent("#selection"), /달빛 궁수/);
  assert.equal(
    await page.evaluate(() => moonward.game.serialize()),
    guideState,
  );
  await page.reload();
  await page.waitForFunction(() => window.moonward);
  await page.click("#resume");
  await page.click("#guide");
  assert.equal(await page.textContent(".guideCost strong"), "315");
  await page.click("#closeDialog");
  ok(
    "evolution guide: both recipes, exact owned-material cost, rules, no mutation, reload and small/landscape controls",
  );
  await page.evaluate(() => {
    const g = new moonward.Game(23);
    g.s.gold = 1000;
    g.summon(0, "archer").tier = 3;
    g.s.gold = 199;
    moonward.setGame(g);
    moonward.pause(true);
  });
  await page.click("#guide");
  await page.click("#guideSelect");
  assert.equal(await page.locator("#confirmEvolve").isDisabled(), true);
  assert.equal(
    await page
      .locator("#dialog")
      .evaluate((e) => e.classList.contains("guideDialog")),
    false,
  );
  await page.click("#closeDialog");
  await page.evaluate(() => {
    moonward.game.s.gold = 200;
  });
  await page.click("#guide");
  await page.click("#guideSelect");
  assert.equal(await page.evaluate(() => moonward.game.s.gold), 200);
  await page.click("#confirmEvolve");
  await page.click("#guide");
  assert.match(await page.textContent(".guideProgress"), /이번 판 진화 완료/);
  assert.equal(await page.evaluate(() => moonward.game.s.gold), 0);
  await page.click("#closeDialog");
  await page.click("#start");
  await page.click("#guide");
  const guideTick = await page.evaluate(() => moonward.game.s.tick);
  await page.waitForTimeout(180);
  assert.equal(await page.evaluate(() => moonward.game.s.tick), guideTick);
  await page.click("#closeDialog");
  await page.waitForTimeout(100);
  assert.ok((await page.evaluate(() => moonward.game.s.tick)) > guideTick);
  ok(
    "guide links to explicit evolution confirmation, respects insufficient gold, shows completion and pauses battle",
  );

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
  // Actual UI/renderer with deterministic encounters; these are not human full-run sessions.
  for (const wave of [6, 12, 18]) {
    await page.evaluate((wave) => {
      const g = new moonward.Game(42);
      g.s.gold = 1000;
      for (const [pad, kind] of [
        [0, "archer"],
        [1, "ember"],
        [2, "frost"],
        [3, "thorn"],
      ]) {
        const u = g.summon(pad, kind);
        u.cd = 999;
      }
      g.s.wave = wave;
      g.s.phase = "battle";
      g.s.spawned = 12 + wave - 1;
      g.spawn();
      g.s.enemies[0].d = 200;
      if (wave === 18) g.s.enemies[0].hp = g.s.enemies[0].max / 2;
      moonward.setGame(g);
      moonward.pause(true);
      moonward.step(1);
    }, wave);
    assert.match(
      await page.textContent("#forecastTitle"),
      new RegExp("현재 " + wave),
    );
    await page.click("#scout");
    assert.match(
      await page.textContent("#dialog"),
      wave === 6 ? /보호막/ : wave === 12 ? /졸개/ : /25%/,
    );
    await page.click("#closeDialog");
    await page.evaluate(() => moonward.pause(true));
    if (wave === 12) {
      await page.evaluate(() => moonward.step(181));
      assert.match(await page.textContent("#banner"), /소환/);
    }
    if (wave === 18) assert.match(await page.textContent("#banner"), /격노/);
    await page.evaluate(() => moonward.pause(false));
    await page.screenshot({
      path: path.join(out, `boss-${wave}-390.jpg`),
      type: "jpeg",
      quality: 80,
      fullPage: true,
    });
    await page.evaluate(() => {
      moonward.pause(true);
      moonward.save();
    });
    const before = await page.evaluate(() => moonward.game.serialize());
    await page.reload();
    await page.waitForFunction(() => window.moonward);
    await page.click("#resume");
    await page.evaluate(() => moonward.pause(true));
    assert.equal(
      await page.evaluate(() => moonward.game.s.enemies[0].pattern),
      wave,
    );
    const saved = JSON.parse(before);
    assert.equal(
      await page.evaluate(() => moonward.game.s.enemies[0].calls),
      saved.enemies[0].calls,
    );
    if (wave === 12) {
      await page.evaluate(() => moonward.step(330));
      assert.equal(
        await page.evaluate(
          () => moonward.game.s.enemies.filter((e) => e.minion).length,
        ),
        4,
      );
    }
    if (wave === 18) {
      await page.evaluate(() => moonward.step(100));
      assert.ok(
        await page.evaluate(
          () =>
            moonward.game.s.enemies[0].age >= moonward.game.s.enemies[0].rageAt,
        ),
      );
    }
  }
  ok(
    "three boss patterns: live scouting, telegraphs, summon cap, rage and save/resume",
  );
  report.performance = await page.evaluate(async () => {
    moonward.pause(true);
    moonward.game.s.gold = 1000;
    for (const u of moonward.game.s.units.filter((u) =>
      ["archer", "ember"].includes(u.kind),
    )) {
      u.tier = 3;
      moonward.game.evolve(u.id);
    }
    moonward.step(1);
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
  // Rotate the same paused match: presentation must not mutate simulation.
  if (await page.isVisible("#fresh")) await page.click("#fresh");
  if (await page.isVisible("#dialog")) await page.click("#closeDialog");
  await page.evaluate(() => {
    const g = new moonward.Game(7); g.s.gold=2000;
    ['archer','ember','frost','thorn','bell'].forEach((k,i)=>g.summon(i,k));
    moonward.setGame(g); moonward.pause(true);
  });
  const rotationState = await page.evaluate(() => JSON.stringify(moonward.game.s));
  for(const [width,height] of [[568,320],[667,375],[844,390],[915,412],[1024,768]]) {
    await page.setViewportSize({width,height}); await page.waitForTimeout(180);
    const layout=await page.evaluate(() => {
      const field=document.querySelector('#field').getBoundingClientRect();
      const control=document.querySelector('#control').getBoundingClientRect();
      const rects=[...document.querySelectorAll('.pad')].map(b=>b.getBoundingClientRect());
      return {canvas:document.querySelector('canvas').width,
        overflow:document.documentElement.scrollWidth>innerWidth || document.documentElement.scrollHeight>innerHeight,
        side:field.right<=control.left,
        pads:rects.every(r=>r.width>=44&&r.height>=44&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight),
        overlaps:rects.some((a,i)=>rects.some((b,j)=>i<j&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)),
        actions:['summon','choose','move','merge','sell'].every(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.height>=44&&r.top>=control.top&&r.bottom<=control.bottom;})};
    });
    assert.equal(layout.canvas,920); assert.equal(layout.overflow,false);
    assert.ok(layout.side&&layout.pads&&layout.actions,JSON.stringify({width,height,...layout})); assert.equal(layout.overlaps,false);
    assert.equal(await page.evaluate(()=>JSON.stringify(moonward.game.s)),rotationState);
    if(width===568||width===844) await page.screenshot({path:path.join(out,`landscape-${width}.jpg`)});
  }
  await page.setViewportSize({width:844,height:390});
  await page.click('#choose');
  assert.match(await page.textContent('[data-kind="frost"]'),/둔화/);
  await page.screenshot({path:path.join(out,'roles-landscape.jpg')});
  await page.click('[data-kind="frost"]');
  await page.evaluate(()=>moonward.pause(true));
  assert.equal(await page.evaluate(()=>moonward.game.s.units.filter(u=>u.kind==='frost').length),2);
  await page.click('#start');
  await page.evaluate(()=>moonward.pause(false));
  await page.waitForTimeout(1200);
  await page.screenshot({path:path.join(out,'landscape-844.jpg')});
  await page.setViewportSize({width:568,height:320}); await page.waitForTimeout(180);
  await page.screenshot({path:path.join(out,'landscape-568.jpg')});
  await page.evaluate(()=>moonward.pause(true));
  const afterChoice=await page.evaluate(()=>JSON.stringify(moonward.game.s));
  await page.setViewportSize({width:390,height:844}); await page.waitForTimeout(180);
  assert.equal(await page.evaluate(()=>document.querySelector('canvas').width),720);
  assert.equal(await page.evaluate(()=>JSON.stringify(moonward.game.s)),afterChoice);
  ok('five landscape sizes: visible 44px controls, no overlapping pads, role choice and rotation state');
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
