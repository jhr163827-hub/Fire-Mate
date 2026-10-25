import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../engine.mjs";
import { waveSpec, RULES, bossStatus, LENGTH } from "../data.mjs";
function encounter(wave) {
  const g = new Game(42);
  g.s.wave = wave;
  g.s.phase = "battle";
  g.s.spawned = waveSpec(wave).count - 1;
  g.spawn();
  return g;
}
function advance(g, seconds) {
  for (let i = 0; i < Math.round(seconds / RULES.step); i++) g.step();
}
test("shield applies to all damage sources, exposes five seconds, retains archer armor", () => {
  const g = encounter(6),
    e = g.s.enemies[0];
  let hp = e.hp;
  g.hit(e, 100, "thorn");
  assert.ok(Math.abs(hp - e.hp - 55) < 1e-8);
  advance(g, 3.1);
  assert.match(bossStatus(e), /노출/);
  hp = e.hp;
  g.hit(e, 100, "ember");
  assert.ok(Math.abs(hp - e.hp - 115) < 1e-8);
  hp = e.hp;
  g.hit(e, 100, "archer");
  assert.ok(Math.abs(hp - e.hp - 69) < 1e-8);
  advance(g, 5);
  assert.match(bossStatus(e), /보호막/);
});
test("summoner warns, calls exactly four adds, save before call never duplicates, adds have no gold", () => {
  let g = encounter(12);
  advance(g, 6.1);
  assert.ok(
    g.drain().some((e) => e.type === "bossCue" && e.text.startsWith("2초")),
  );
  const restored = Game.restore(g.serialize());
  assert.ok(restored);
  advance(g, 11);
  advance(restored, 11);
  assert.equal(g.serialize(), restored.serialize());
  assert.equal(g.s.enemies.filter((e) => e.minion).length, 4);
  assert.equal(g.s.enemies[0].calls, 2);
  const gold = g.s.gold;
  for (const e of g.s.enemies.filter((e) => e.minion)) g.hit(e, 1e6, "ember");
  g.step();
  assert.equal(g.s.gold, gold);
  advance(g, 1);
  assert.equal(g.s.enemies.filter((e) => e.minion).length, 0);
});
test("last boss warns once at half health, accelerates only after three seconds and restores exactly", () => {
  const g = encounter(18),
    e = g.s.enemies[0];
  g.hit(e, e.max / 2, "ember");
  g.step();
  assert.ok(e.rageAt > e.age);
  assert.equal(g.drain().filter((e) => e.type === "bossCue").length, 1);
  const restored = Game.restore(g.serialize());
  advance(g, 3.1);
  advance(restored, 3.1);
  assert.equal(g.serialize(), restored.serialize());
  const d = e.d;
  g.step();
  assert.ok(Math.abs(e.d - d - e.speed * RULES.step * 1.25) < 1e-8);
  assert.equal(g.drain().filter((e) => e.type === "bossCue").length, 0);
});
test("invalid boss clocks rejected; legacy boss keeps old behavior; death and gate crossing do not summon", () => {
  for (const edit of [
    (e) => (e.age = NaN),
    (e) => (e.calls = 3),
    (e) => (e.pattern = 18),
    (e) => (e.rageAt = -1),
  ]) {
    const g = encounter(12);
    edit(g.s.enemies[0]);
    assert.equal(Game.restore(g.serialize()), null);
  }
  const g = encounter(12),
    e = g.s.enemies[0];
  delete e.pattern;
  delete e.age;
  delete e.calls;
  delete e.rageAt;
  assert.ok(Game.restore(g.serialize()));
  advance(g, 17);
  assert.equal(g.s.enemies.length, 1);
  const dead = encounter(12);
  dead.s.enemies[0].hp = 0;
  dead.s.enemies[0].age = 7.99;
  dead.step();
  assert.equal(dead.s.enemies.length, 0);
  const gate = encounter(18);
  gate.s.enemies[0].d = LENGTH - 0.001;
  gate.step();
  assert.equal(gate.s.lives, 15);
  assert.equal(gate.s.bossDefeated, false);
});
