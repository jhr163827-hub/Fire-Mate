import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../engine.mjs";
import { RULES, PADS, LENGTH, TYPES, waveSpec } from "../data.mjs";
import { manage, simulate } from "./simulate.mjs";
function advance(g, n) {
  for (let i = 0; i < n; i++) {
    g.step();
    g.drain();
  }
}
test("seeded recruitment and missing-role guarantee are reproducible", () => {
  let a = new Game(72),
    b = new Game(72);
  a.s.gold = b.s.gold = 1000;
  for (let i = 0; i < 12; i++) {
    a.summon(i);
    b.summon(i);
  }
  assert.deepEqual(a.s, b.s);
  assert.equal(a.s.units[0].kind, "archer");
  assert.ok(new Set(a.s.units.slice(0, 4).map((u) => u.kind)).size >= 2);
});
test("costs, occupied pads and unavailable choices cannot mutate economy", () => {
  let g = new Game(1);
  assert.equal(g.summon(-1), false);
  assert.equal(g.summon(0, "bad"), false);
  g.summon(0, "archer");
  let before = g.serialize();
  assert.equal(g.summon(0), false);
  assert.equal(g.serialize(), before);
  g.summon(1, "frost");
  assert.equal(g.s.gold, 10);
  assert.equal(g.summon(2), false);
});
test("merge consumes exactly two matching units, preserves target position, rejects third tier", () => {
  let g = new Game(1);
  g.s.gold = 1000;
  let a = g.summon(1, "archer"),
    b = g.summon(2, "archer"),
    c = g.summon(3, "frost");
  assert.equal(g.merge(a.id, c.id), false);
  let money = g.s.gold;
  assert.ok(g.merge(a.id, b.id));
  assert.equal(g.s.gold, money - 15);
  assert.equal(a.tier, 2);
  assert.equal(a.pad, 1);
  assert.equal(g.s.units.length, 2);
  assert.equal(g.merge(a.id, b.id), false);
});
test("move swaps pads and selling cannot refund twice", () => {
  let g = new Game();
  let a = g.summon(0),
    b = g.summon(1);
  g.move(a.id, 1);
  assert.equal(b.pad, 0);
  assert.equal(a.pad, 1);
  let gold = g.s.gold;
  g.sell(a.id);
  assert.equal(g.s.gold, gold + 30);
  assert.equal(g.sell(a.id), false);
  assert.equal(g.s.gold, gold + 30);
});
test("idle cooldown never banks rapid attacks", () => {
  let g = new Game();
  g.summon(0);
  g.start();
  advance(g, 1500);
  assert.ok(g.s.units.every((u) => u.cd >= 0));
});
test("mid-combat save restore is deterministic across a long continuation", () => {
  let g = new Game(42);
  for (let i = 0; i < 9000; i++) {
    if (i % 15 === 0) manage(g, "balanced");
    g.step();
    g.drain();
  }
  let restored = Game.restore(g.serialize());
  assert.ok(restored);
  for (let i = 0; i < 1800; i++) {
    if (i % 15 === 0) {
      manage(g, "balanced");
      manage(restored, "balanced");
    }
    g.step();
    restored.step();
    g.drain();
    restored.drain();
  }
  assert.deepEqual(restored.s, g.s);
});
test("malformed saves and non-finite combat state are rejected", () => {
  assert.equal(Game.restore("bad"), null);
  let g = new Game();
  g.summon(0);
  for (let change of [
    (s) => (s.gold = null),
    (s) => s.units.push({ ...s.units[0] }),
    (s) => (s.units[0].kind = "evil"),
    (s) => (s.wave = 99),
    (s) => (s.phase = "battle"),
  ]) {
    let s = JSON.parse(g.serialize());
    change(s);
    assert.equal(Game.restore(JSON.stringify(s)), null);
  }
});
test("fixed steps give identical state for 1x and 2x scheduling", () => {
  let a = new Game(1);
  a.summon(0);
  a.summon(1);
  a.start();
  let b = Game.restore(a.serialize());
  for (let i = 0; i < 900; i++) {
    a.step();
    a.step();
  }
  advance(b, 1800);
  a.drain();
  assert.deepEqual(a.s, b.s);
});
test("boss waves occur at 6,12,18 and boss leaks cost five", () => {
  for (let i = 1; i <= 18; i++) assert.equal(waveSpec(i).boss, i % 6 === 0);
  let g = new Game();
  g.summon(0);
  g.start();
  g.s.enemies = [
    {
      id: 99,
      d: LENGTH - 1,
      hp: 100,
      max: 100,
      speed: 100,
      kind: "boss",
      slow: 0,
      poison: 0,
      dot: 0,
      boss: true,
    },
  ];
  g.step();
  assert.equal(g.s.lives, 15);
});
test("poison and slow persist through serialization; support does not stack", () => {
  let a = new Game();
  a.s.gold = 1000;
  let u = a.summon(1, "archer");
  a.summon(2, "bell");
  a.start();
  a.s.enemies = [
    {
      id: 99,
      d: 138,
      hp: 10000,
      max: 10000,
      speed: 1,
      kind: "beetle",
      slow: 2,
      poison: 2,
      dot: 10,
      boss: false,
    },
  ];
  a.s.nextId = 100;
  let b = Game.restore(a.serialize());
  assert.ok(b);
  b.summon(0, "bell");
  a.step();
  b.step();
  assert.equal(a.s.units[0].cd, b.s.units[0].cd);
  assert.ok(a.s.enemies[0].slow < 2);
  assert.ok(a.s.enemies[0].poison < 2);
});
test("victory is terminal and cannot duplicate rewards after resume", () => {
  let g = new Game(1);
  for (let t = 0; t < 30 * 1800 && !g.s.result; t++) {
    if (t % 15 === 0) manage(g, "balanced");
    g.step();
    g.drain();
  }
  assert.ok(g.s.result?.win);
  let raw = g.serialize(),
    r = Game.restore(raw);
  advance(r, 300);
  assert.equal(r.serialize(), raw);
  assert.equal(r.summon(0), false);
  assert.equal(r.start(), false);
});
test("undefended game can lose and a new instance has no old combat state", () => {
  let g = new Game();
  let u = g.summon(0);
  g.start();
  g.sell(u.id);
  advance(g, 30 * 500);
  assert.equal(g.s.result?.win, false);
  let fresh = new Game();
  assert.equal(fresh.s.enemies.length, 0);
  assert.equal(fresh.s.lives, 20);
  assert.equal(fresh.s.tick, 0);
});
test("rare summon pity guarantees a two-star within twelve random summons", () => {
  for (let seed = 1; seed <= 40; seed++) {
    let g = new Game(seed);
    g.s.gold = 1000;
    for (let i = 0; i < 12; i++) g.summon(i);
    assert.equal(g.s.units[0].tier, 1);
    assert.ok(g.s.units.some((u) => u.tier === 2));
    assert.ok(g.s.pity < 12);
  }
});
