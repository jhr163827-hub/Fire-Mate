import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../engine.mjs";
import {
  emptyProfile,
  loadProfile,
  medals,
  complete,
  unlocked,
} from "../data.mjs";
test("same seed and checkpoint reproduce full battle including skill draws", () => {
  const a = new Game({ seed: 57 });
  for (let i = 0; i < 1500; i++) {
    if (a.s.phase === "choice") a.choose(a.s.choices[0]);
    a.step({ x: 160, y: 470 });
  }
  const b = Game.restore(a.serialize());
  assert.ok(b);
  for (let i = 0; i < 2500; i++) {
    if (a.s.phase === "choice") {
      const k = a.s.choices[0];
      assert.deepEqual(b.s.choices, a.s.choices);
      a.choose(k);
      b.choose(k);
    }
    a.step({ x: 180, y: 460 });
    b.step({ x: 180, y: 460 });
  }
  assert.deepEqual(a.s, b.s);
});
test("first choice by eight seconds, only offered skills accepted, choices persist", () => {
  const g = new Game();
  for (let i = 0; i < 481; i++) g.step();
  assert.equal(g.s.phase, "choice");
  assert.equal(g.choose("invalid"), false);
  const restored = Game.restore(g.serialize());
  assert.deepEqual(restored.s.choices, g.s.choices);
  assert.equal(restored.choose(restored.s.choices[0]), true);
});
test("laser pierces, missile selects strongest, drone aims, frost slows, shield blocks", () => {
  for (const key of ["laser", "missile", "drone", "frost", "shield"]) {
    const g = new Game();
    g.s.skills[key] = 3;
    g.s.cool[key] = 0;
    const a = g.spawn("carrier", 180, 420),
      b = g.spawn("gunner", 180, 350);
    g.weapons();
    if (key === "laser") assert.ok(a.hp < a.max && b.hp < b.max);
    if (key === "missile")
      assert.equal(g.s.shots.find((p) => p.kind === "missile").target, a.id);
    if (key === "drone")
      assert.equal(g.s.shots.filter((p) => p.kind === "drone").length, 2);
    if (key === "frost") assert.ok(a.slow > 0);
    if (key === "shield") {
      g.s.inv = 0;
      g.hurt(20);
      assert.equal(g.s.hp, g.s.maxHp);
      assert.equal(g.s.shield, 0);
    }
  }
});
test("pulse consumes one charge, clears hazards, counts each kill once", () => {
  const g = new Game();
  const e = g.spawn("scout", 180, 200);
  g.enemyBullet(180, 300, 1);
  g.s.hazards.push({ x: 180, y: 0, w: 30, life: 1, warning: 0.5 });
  assert.ok(g.pulse());
  assert.equal(g.s.pulse, 1);
  assert.equal(g.s.bullets.length, 0);
  assert.equal(g.s.hazards.length, 0);
  assert.equal(g.s.kills, 1);
  g.hit(e, 100);
  assert.equal(g.s.kills, 1);
});
test("loss is terminal even with simultaneous boss kill, retry is clean", () => {
  const g = new Game();
  const e = g.spawn("boss", 180);
  g.s.inv = 0;
  g.hurt(999);
  g.hit(e, 99999);
  assert.equal(g.s.phase, "lost");
  const fresh = new Game();
  assert.equal(fresh.s.time, 0);
  assert.equal(fresh.s.enemies.length, 0);
  assert.equal(fresh.s.hp, 100);
});
test("stars only award best record delta and malformed spend is reset", () => {
  const p = emptyProfile(),
    g = new Game();
  g.s.phase = "won";
  complete(p, g.s);
  assert.equal(medals(p), 3);
  complete(p, g.s);
  assert.equal(medals(p), 3);
  assert.equal(unlocked(p), 2);
  p.mods.power = 3;
  assert.equal(loadProfile(JSON.stringify(p)).mods.power, 0);
});
test("malformed and oversized saves rejected without throwing", () => {
  assert.equal(Game.restore("{"), null);
  for (const change of [
    (s) => delete s.cool,
    (s) => (s.phase = "bogus"),
    (s) => (s.stage = 13),
    (s) => (s.skills.laser = 99),
    (s) => s.shots.push({ x: 1, y: 1, vx: 0, vy: 0, r: 1, life: 2 }),
    (s) => (s.bullets = Array(281).fill({ x: 0, y: 0 })),
    (s) => (s.nextXp = 0),
  ]) {
    const g = new Game();
    change(g.s);
    assert.equal(Game.restore(g.serialize()), null);
  }
});
test("boss beam warns for one second before damage, invulnerability stops repeat ticks", () => {
  const g = new Game({ stage: 2 });
  const e = g.spawn("boss", 180);
  g.bossAttack(e);
  const h = g.s.hazards[0];
  assert.ok(h.life - h.warning >= 1);
  g.s.inv = 0;
  const hp = g.s.hp;
  g.hurt(14);
  g.hurt(14);
  assert.equal(g.s.hits, 1);
  assert.ok(g.s.hp < hp);
});
test("boss overheating ends defensive-build attrition with a visible threefold damage window", () => {
  const g = new Game();
  const e = g.spawn("boss", 180);
  g.hit(e, 10);
  assert.equal(e.max - e.hp, 10);
  e.age = 35;
  g.hit(e, 10);
  assert.equal(e.max - e.hp, 40);
});
