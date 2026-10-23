import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../engine.mjs";
import { RULES, LENGTH, waveSpec } from "../data.mjs";
function bossEnd(wave = 6, killed = true) {
  const g = new Game(19),
    s = g.s;
  s.wave = wave;
  s.phase = "battle";
  s.waveTime = RULES.minWaveTime;
  s.spawned = waveSpec(wave).count;
  s.enemies = [
    {
      id: 1,
      d: killed ? 100 : LENGTH - 0.001,
      hp: 10,
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
  s.nextId = 2;
  if (killed) g.hit(s.enemies[0], 10, "ember");
  g.step();
  return g;
}
test("boss kill + wave clear offers once at 6/12, leaks offer nothing, 18 ends in victory", () => {
  for (const w of [6, 12]) {
    const g = bossEnd(w);
    assert.equal(g.s.pendingBoon, w);
    assert.equal(g.s.phase, "rest");
    const snapshot = g.serialize();
    for (let i = 0; i < 400; i++) g.step();
    assert.equal(g.serialize(), snapshot);
    assert.equal(g.nextWave(), false);
    assert.equal(g.s.wave, w);
    assert.equal(bossEnd(w, false).s.pendingBoon, 0);
  }
  const g = bossEnd(18);
  assert.equal(g.s.pendingBoon, 0);
  assert.ok(g.s.result.win);
});
test("pending and selected rewards survive saves, repeated callbacks never pay twice", () => {
  let g = Game.restore(bossEnd().serialize());
  assert.ok(g);
  g.s.lives = 18;
  const gold = g.s.gold;
  assert.equal(g.chooseBoon("invalid"), false);
  assert.equal(g.s.gold, gold);
  assert.equal(g.chooseBoon("supply"), true);
  assert.equal(g.s.gold, gold + 125);
  assert.equal(g.s.lives, 20);
  assert.equal(g.chooseBoon("supply"), false);
  g = Game.restore(g.serialize());
  assert.ok(g);
  assert.equal(g.chooseBoon("venom"), false);
  assert.equal(g.s.gold, gold + 125);
  assert.equal(g.s.boons.length, 1);
  assert.deepEqual(new Game(1).s.boons, []);
});
test("legacy saves keep progress without retrospective rewards; corrupt claims are rejected", () => {
  const g = bossEnd();
  delete g.s.boons;
  delete g.s.pendingBoon;
  delete g.s.bossDefeated;
  const old = Game.restore(g.serialize());
  assert.ok(old);
  assert.equal(old.s.pendingBoon, 0);
  old.step();
  assert.equal(old.s.pendingBoon, 0);
  const s = bossEnd().s;
  s.boons = [{ wave: 6, key: "supply" }];
  assert.equal(Game.restore(JSON.stringify(s)), null);
  s.pendingBoon = 0;
  s.boons.push({ wave: 6, key: "venom" });
  assert.equal(Game.restore(JSON.stringify(s)), null);
});
test("frost hunt is conditional, additive and keeps armored damage reduction", () => {
  const g = bossEnd();
  g.chooseBoon("hunt");
  let e = { hp: 100, slow: 0, kind: "wisp" };
  g.hit(e, 20, "archer");
  assert.equal(e.hp, 80);
  e = { hp: 100, slow: 1, kind: "wisp" };
  g.hit(e, 20, "archer");
  assert.equal(e.hp, 75);
  g.s.boons.push({ wave: 12, key: "hunt" });
  e = { hp: 100, slow: 1, kind: "beetle" };
  g.hit(e, 20, "archer");
  assert.equal(e.hp, 82);
  e = { hp: 100, slow: 1, kind: "wisp" };
  g.hit(e, 20, "ember");
  assert.equal(e.hp, 80);
});
test("venom modifies actual applied DOT and duration, without doubling refresh stacks", () => {
  const g = new Game(1);
  g.s.gold = 1000;
  g.summon(0, "thorn");
  g.start();
  g.s.boons = [
    { wave: 6, key: "venom" },
    { wave: 12, key: "venom" },
  ];
  g.step();
  const e = g.s.enemies[0];
  assert.ok(Math.abs(e.dot - 15.6) < 1e-9);
  assert.equal(e.poison, 6);
  g.s.units[0].cd = 0;
  g.step();
  assert.ok(Math.abs(e.dot - 15.6) < 1e-9);
});
