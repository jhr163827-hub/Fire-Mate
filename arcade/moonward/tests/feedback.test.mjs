import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../engine.mjs";
import { LENGTH } from "../data.mjs";
import { forecast, debrief, supported } from "../feedback.mjs";
test("forecast counts match actual spawns for all 18 waves", () => {
  for (let wave = 1; wave <= 18; wave++) {
    const g = new Game(1);
    g.s.wave = wave;
    const f = forecast(wave);
    for (let i = 0; i < f.count; i++) g.spawn();
    const n = (kind) => g.s.enemies.filter((e) => e.kind === kind).length;
    assert.equal(g.s.enemies.length, f.count);
    if (n("wolf")) assert.ok(f.composition.includes(`질주 ${n("wolf")}`));
    if (n("beetle")) assert.ok(f.composition.includes(`갑각 ${n("beetle")}`));
    if (n("boss")) assert.ok(f.composition.includes("보스 1"));
  }
});
test("breach evidence comes from real gate crossings and survives restore without double counting", () => {
  const g = new Game(9);
  g.s.wave = 6;
  g.s.phase = "battle";
  g.s.spawned = 18;
  g.s.enemies = [
    {
      id: 1,
      d: LENGTH - 0.01,
      hp: 50,
      max: 100,
      speed: 30,
      kind: "boss",
      boss: true,
      slow: 0,
      poison: 0,
      dot: 0,
    },
  ];
  g.s.nextId = 2;
  g.step();
  assert.deepEqual(g.s.stats.breaches.boss, { count: 1, loss: 5, health: 0.5 });
  assert.match(debrief(g.s).fact, /평균 체력 50%/);
  const copy = Game.restore(g.serialize());
  assert.ok(copy);
  copy.step();
  assert.deepEqual(copy.s.stats.breaches, g.s.stats.breaches);
  copy.s.stats.breaches.boss.health = 9;
  assert.equal(Game.restore(copy.serialize()), null);
});
test("old saves remain playable and never invent loss evidence", () => {
  const g = new Game(1);
  delete g.s.stats.breaches;
  g.s.leaks = 3;
  const copy = Game.restore(g.serialize());
  assert.ok(copy);
  assert.match(debrief(copy.s).fact, /이전 저장/);
  assert.deepEqual(new Game(1).s.stats.breaches, {});
});
test("damage statistics cap overkill and support uses the same spatial rule", () => {
  const g = new Game(1);
  const e = { hp: 3, kind: "wisp" };
  g.hit(e, 100, "ember");
  assert.equal(g.s.stats.damage.ember, 3);
  g.s.gold = 1000;
  const archer = g.summon(0, "archer");
  g.summon(1, "bell");
  assert.ok(supported(g.s.units, archer));
  g.move(archer.id, 10);
  assert.equal(supported(g.s.units, archer), false);
});
