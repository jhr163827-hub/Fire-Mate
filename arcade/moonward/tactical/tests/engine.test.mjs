import test from "node:test";
import assert from "node:assert/strict";
import { Battle } from "../engine.mjs";
import { ENEMIES, LENGTH, STEP } from "../data.mjs";
import { run, manage } from "./simulate.mjs";
function enemy(kind, d, id = 100) {
  const t = ENEMIES[kind];
  return {
    id,
    kind,
    hp: t.hp,
    max: t.hp,
    speed: t.speed,
    d,
    slow: 0,
    slowRate: 0,
    slowSource: 0,
    flash: 0,
  };
}
function fixture(kind, pad = 0) {
  const g = new Battle(7);
  g.s.gold = 1000;
  g.buy(kind, pad);
  g.s.phase = "battle";
  g.s.wave = 1;
  g.s.queue = [{ kind: "wisp", gap: 1000 }];
  g.s.spawnIn = 1000;
  g.events = [];
  return g;
}
test("direct purchase, branch upgrade, refund and move are transactional", () => {
  const g = new Battle();
  assert.ok(g.buy("archer", 0));
  assert.equal(g.s.gold, 140);
  assert.equal(g.buy("ember", 0), false);
  assert.ok(g.upgrade(1, "rapid"));
  assert.equal(g.s.gold, 30);
  assert.equal(g.upgrade(1, "pierce"), false);
  assert.ok(g.move(1, 2));
  assert.ok(g.sell(1));
  assert.equal(g.s.gold, 180);
  assert.equal(g.sell(1), false);
  assert.equal(g.buy("__proto__", 0), false);
});
test("frost slows movement and splash hits multiple slowed enemies", () => {
  const g = fixture("frost");
  g.s.enemies = [enemy("wisp", 115), enemy("wisp", 125, 101)];
  g.step();
  assert.ok(g.s.enemies.some((e) => e.slow > 0));
  const e = g.s.enemies.find((e) => e.slow > 0),
    d = e.d;
  g.step();
  assert.ok(e.d - d < e.speed * STEP * 0.6);
  g.buy("ember", 1);
  g.s.enemies.forEach((e) => (e.d = 230));
  g.step();
  const shot = g.events.find((e) => e.kind === "ember" && e.type === "attack");
  assert.equal(shot.victims.length, 2);
  assert.ok(shot.combo >= 1);
  assert.ok(g.s.units[0].slowTime > 0);
});
test("all six upgrade branches change the intended attack behaviour", () => {
  for (const [kind, upgrade] of [
    ["archer", "rapid"],
    ["archer", "pierce"],
    ["ember", "blast"],
    ["ember", "burn"],
    ["frost", "spread"],
    ["frost", "deep"],
  ]) {
    const g = fixture(kind);
    assert.ok(g.upgrade(1, upgrade));
    g.s.enemies = [
      enemy("beetle", 115),
      enemy("beetle", 118, 101),
      enemy("beetle", 121, 102),
    ];
    g.step();
    const e = g.events.find((e) => e.type === "attack");
    assert.equal(e.upgrade, upgrade);
    if (upgrade === "pierce" || upgrade === "spread")
      assert.equal(e.victims.length, 3);
    if (upgrade === "blast") assert.equal(e.radius, 62);
    if (upgrade === "burn") assert.equal(g.s.fields.length, 1);
    if (upgrade === "deep")
      assert.ok(g.s.enemies.some((e) => e.slowRate === 0.7));
    if (upgrade === "rapid") assert.ok(g.s.units[0].cool < 0.33);
  }
});
test("boss must be killed; passing gate is defeat even with full lives", () => {
  const g = fixture("archer");
  g.s.wave = 5;
  g.s.queue = [];
  g.s.enemies = [enemy("boss", LENGTH - 0.01)];
  g.step();
  assert.equal(g.s.phase, "lost");
  assert.equal(g.s.lives, 0);
  assert.match(g.s.report.advice, /보스/);
});
test("save restores deterministic battle including fields and pending spawns", () => {
  const g = fixture("ember");
  g.upgrade(1, "burn");
  g.s.enemies = [enemy("beetle", 115)];
  for (let i = 0; i < 60; i++) g.step();
  const h = Battle.restore(g.serialize());
  assert.ok(h);
  for (let i = 0; i < 500; i++) {
    g.step();
    h.step();
  }
  assert.equal(h.serialize(), g.serialize());
});
test("completed wave reward cannot repeat after reload or extra ticks", () => {
  const g = fixture("archer");
  g.s.queue = [];
  g.s.enemies = [];
  g.step();
  const gold = g.s.gold;
  const h = Battle.restore(g.serialize());
  for (let i = 0; i < 1000; i++) h.step();
  assert.equal(h.s.gold, gold);
  assert.equal(h.s.phase, "ready");
});
test("corrupt saves rejected without exceptions", () => {
  for (const raw of ["{broken", "null", "{}"])
    assert.equal(Battle.restore(raw), null);
  const g = fixture("archer");
  for (const mutate of [
    (s) => (s.gold = -1),
    (s) => (s.units[0].kind = "oops"),
    (s) => (s.units[0].pad = 99),
    (s) => s.units.push({ ...s.units[0] }),
    (s) => (s.enemies = [{ kind: "boss" }]),
  ]) {
    const s = JSON.parse(g.serialize());
    mutate(s);
    assert.equal(Battle.restore(JSON.stringify(s)), null);
  }
});
test("batch stepping and single stepping agree; moving during battle rejected", () => {
  const g = new Battle(3);
  manage(g, "mixed");
  g.start();
  const h = Battle.restore(g.serialize());
  assert.equal(g.move(1, 3), false);
  for (let i = 0; i < 600; i++) g.step();
  for (let i = 0; i < 300; i++) {
    h.step();
    h.step();
  }
  assert.equal(h.serialize(), g.serialize());
});
test("two mixed branches complete all five waves; weak placement loses more lives", () => {
  for (const seed of [1, 7, 23]) {
    const a = run(seed, "mixed"),
      b = run(seed, "alternative"),
      c = run(seed, "scattered");
    assert.equal(a.result, "won");
    assert.equal(b.result, "won");
    assert.ok(a.lives > c.lives);
    assert.ok(a.combo > 0);
  }
});
