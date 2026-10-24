import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../engine.mjs";
import { piercingLine } from "../evolution.mjs";
import { EVOLUTIONS, pointAt, RULES } from "../data.mjs";
function prepared(kind = "archer", pad = 0) {
  const g = new Game(37);
  g.s.gold = 1000;
  const u = g.summon(pad, kind);
  u.tier = 3;
  g.start();
  g.s.spawned = 13;
  g.s.spawnIn = 100;
  return { g, u };
}
function enemy(g, d, hp = 10000) {
  const e = {
    id: g.s.nextId++,
    d,
    hp,
    max: hp,
    kind: "wisp",
    boss: false,
    speed: 33,
    slow: 0,
    poison: 0,
    dot: 0,
    source: 0,
  };
  g.s.enemies.push(e);
  return e;
}
test("evolution rejects ineligible, unavailable and duplicate purchases without changing combat cooldown", () => {
  const { g, u } = prepared();
  u.tier = 2;
  const gold = g.s.gold;
  assert.equal(g.evolve(u.id), false);
  u.tier = 3;
  g.s.gold = 199;
  assert.equal(g.evolve(u.id), false);
  g.s.gold = gold;
  u.cd = 0.4;
  assert.equal(g.evolve(u.id), true);
  assert.equal(u.cd, 0.4);
  assert.equal(g.s.gold, gold - 200);
  assert.equal(g.evolve(u.id), false);
  assert.equal(g.s.gold, gold - 200);
  const f = prepared("frost");
  assert.equal(f.g.evolve(f.u.id), false);
  g.finish(false);
  assert.equal(g.evolve(u.id), false);
});
test("piercing collision is bounded to three living in-range enemies on a forward ray", () => {
  const { g, u } = prepared();
  g.evolve(u.id);
  [50, 60, 70, 80].forEach((d) => enemy(g, d));
  const far = enemy(g, 400);
  const dead = enemy(g, 65, 0);
  const line = piercingLine(u, g.s.enemies);
  assert.equal(line.hits.length, 3);
  assert.ok(!line.hits.includes(far) && !line.hits.includes(dead));
  g.step();
  assert.equal(g.s.enemies.filter((e) => e.hp < e.max && e.hp > 0).length, 3);
  assert.equal(far.hp, far.max);
  const shot = g.drain().find((e) => e.type === "shot");
  assert.equal(shot.evolved, true);
  assert.ok(
    Math.abs(Math.hypot(shot.tx - shot.x, shot.ty - shot.y) - 123) < 1e-6,
  );
});
test("each ember keeps only its latest field and overlapping fields never multiply damage", () => {
  const { g, u } = prepared("ember");
  g.evolve(u.id);
  const e = enemy(g, 68);
  g.step();
  assert.equal(g.s.fields.length, 1);
  u.cd = 0;
  g.step();
  assert.equal(g.s.fields.length, 1);
  const v = g.summon(1, "ember");
  v.tier = 3;
  g.evolve(v.id);
  u.cd = v.cd = 999;
  const p = pointAt(e.d);
  g.s.fields = [u, v].map((w) => ({ owner: w.id, x: p.x, y: p.y, life: 0.01 }));
  const before = e.hp;
  g.step();
  assert.ok(Math.abs(before - e.hp - EVOLUTIONS.ember.dps * 0.01) < 1e-6);
  assert.equal(g.s.fields.length, 0);
  g.s.fields = [{ owner: u.id, x: p.x, y: p.y, life: 1 }];
  g.sell(u.id);
  assert.equal(g.s.fields.length, 0);
});
test("evolved fields resume deterministically and old saves remain valid", () => {
  const { g, u } = prepared("ember");
  g.evolve(u.id);
  enemy(g, 68);
  g.step();
  const copy = Game.restore(g.serialize());
  assert.ok(copy);
  assert.ok(copy.s.units[0].evolved);
  for (let i = 0; i < 90; i++) {
    g.step();
    copy.step();
  }
  assert.equal(copy.serialize(), g.serialize());
  const old = new Game(1);
  delete old.s.fields;
  assert.deepEqual(Game.restore(old.serialize()).s.fields, []);
  const broken = prepared("archer");
  broken.u.evolved = true;
  broken.u.tier = 2;
  assert.equal(Game.restore(broken.g.serialize()), null);
  g.s.fields = [{ owner: 99999, x: 0, y: 0, life: 1 }];
  assert.equal(Game.restore(g.serialize()), null);
});
test("fixed-step scheduling gives equal fire damage at 1x/2x and ended sessions clear fields", () => {
  const { g, u } = prepared("ember");
  g.evolve(u.id);
  enemy(g, 68);
  g.step();
  const copy = Game.restore(g.serialize());
  for (let frame = 0; frame < 120; frame++) g.step();
  for (let frame = 0; frame < 60; frame++) {
    copy.step();
    copy.step();
  }
  assert.equal(copy.serialize(), g.serialize());
  g.finish(false);
  assert.deepEqual(g.s.fields, []);
  assert.deepEqual(new Game(2).s.fields, []);
});
