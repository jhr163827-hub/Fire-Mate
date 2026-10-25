import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../engine.mjs";
import { evolutionPlan } from "../feedback.mjs";
function board(tiers, kind = "archer") {
  const g = new Game(1);
  g.s.gold = 9999;
  tiers.forEach((tier, pad) => {
    const u = g.summon(pad, kind);
    u.tier = tier;
  });
  return g;
}
test("guide quotes exact remaining guaranteed cost across mixed tiers without changing state", () => {
  const cases = [
    [[], 4, 3, 585],
    [[1], 3, 3, 500],
    [[1, 1, 1, 1], 0, 3, 245],
    [[2, 1], 1, 2, 315],
    [[2, 2], 0, 1, 215],
    [[3], 0, 0, 200],
    [[2, 2, 1, 1], 0, 1, 215],
  ];
  for (const [tiers, missing, merges, cost] of cases) {
    const g = board(tiers);
    const before = g.serialize();
    const p = evolutionPlan(g.s, "archer");
    assert.deepEqual([p.missing, p.merges, p.cost], [missing, merges, cost]);
    assert.equal(g.serialize(), before);
    g.s.gold = cost;
    for (let i = 0; i < missing; i++)
      assert.ok(g.summon(g.s.units.length, "archer"));
    let actualMerges = 0;
    while (!g.s.units.some((u) => u.tier === 3)) {
      const units = [...g.s.units].sort((a, b) => b.tier - a.tier);
      const a = units.find((u) =>
        units.some((v) => v !== u && v.tier === u.tier),
      );
      const b = units.find((v) => v !== a && v.tier === a.tier);
      assert.ok(g.merge(a.id, b.id));
      actualMerges++;
    }
    assert.equal(actualMerges, merges);
    assert.ok(g.evolve(g.s.units.find((u) => u.tier === 3).id));
    assert.equal(g.s.gold, 0);
  }
});
test("guide uses same-kind units, marks full board and completed evolution, and never changes saved state", () => {
  const g = board([2, 1]);
  g.s.gold = 180;
  let p = evolutionPlan(g.s, "archer");
  assert.equal(p.shortfall, 135);
  assert.equal(p.candidate, g.s.units[0].id);
  assert.equal(evolutionPlan(g.s, "ember").missing, 4);
  assert.equal(evolutionPlan(g.s, "frost"), null);
  g.s.gold = 9999;
  for (let i = 2; i < 15; i++) g.summon(i, "bell");
  assert.equal(evolutionPlan(g.s, "archer").full, true);
  const h = board([3]);
  assert.ok(h.evolve(h.s.units[0].id));
  h.s.gold = 0;
  const before = h.serialize();
  p = evolutionPlan(h.s, "archer");
  assert.equal(p.complete, true);
  assert.equal(p.cost, 0);
  assert.equal(p.shortfall, 0);
  assert.equal(p.ready, false);
  assert.equal(h.serialize(), before);
  assert.deepEqual(evolutionPlan(Game.restore(before).s, "archer"), p);
});
