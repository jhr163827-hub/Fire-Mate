import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../engine.mjs";
import { stats, STEP, LENGTH } from "../data.mjs";
import { run } from "./simulate.mjs";
test("free placement rejects road/overlap and purchase is atomic", () => {
  const g = new Game();
  assert.equal(g.buy("dart", 100, 70), null);
  assert.equal(g.s.gold, 340);
  assert.ok(g.buy("dart", 175, 136));
  assert.equal(g.buy("bomb", 180, 138), null);
  assert.equal(g.s.gold, 230);
  assert.equal(g.buy("bad", 400, 136), null);
});
test("three stage branch locks, sale includes investments, target choice persists", () => {
  const g = new Game(),
    t = g.buy("dart", 175, 136);
  g.s.gold = 10000;
  assert.ok(g.upgrade(t.id, 1));
  assert.equal(g.upgrade(t.id, 0), false);
  assert.ok(g.upgrade(t.id, 1));
  assert.ok(g.upgrade(t.id, 1));
  assert.equal(g.upgrade(t.id, 1), false);
  assert.equal(stats(t).big, 2);
  t.target = "strong";
  let restored = Game.restore(g.serialize());
  assert.equal(restored.s.towers[0].target, "strong");
  let cash = g.s.gold;
  g.sell(t.id);
  assert.equal(g.s.gold - cash, Math.floor(t.spent * 0.75));
});
test("armor blocks ordinary damage; electricity ignores armor; broken armor expires", () => {
  const g = new Game();
  let e = g.spawn("armor");
  g.hit(e, 100, null);
  assert.equal(e.hp, 90);
  g.hit(e, 20, null, true);
  assert.equal(e.hp, 70);
  e.broken = 1;
  g.hit(e, 20, null);
  assert.equal(e.hp, 50);
});
test("pods spawn real moving children and credit reward once", () => {
  let g = new Game();
  g.s.phase = "battle";
  let e = g.spawn("pod", 500);
  g.hit(e, 10000, null, true);
  assert.equal(g.s.enemies.filter((e) => e.hp > 0).length, 4);
  assert.equal(g.s.gold, 352);
  g.hit(e, 10000, null, true);
  assert.equal(g.s.gold, 352);
  let before = g.s.enemies[1].d;
  g.step();
  assert.ok(g.s.enemies[0].d > before);
});
test("ice slows movement, bombardment spends cooldown, victory waits for children", () => {
  let g = new Game();
  g.buy("ice", 175, 136);
  g.s.phase = "battle";
  g.s.wave = 1;
  let e = g.spawn("pod", 150);
  g.step();
  assert.ok(e.slow > 0);
  assert.ok(g.meteor(e.x, e.y));
  assert.equal(g.meteor(e.x, e.y), false);
  for (let i = 0; i < 22; i++) g.step();
  assert.ok(g.s.enemies.some((e) => e.child));
  assert.equal(g.s.phase, "battle");
});
test("save restores projectiles and burning fields deterministically", () => {
  let g = new Game(71),
    t = g.buy("bomb", 175, 136);
  g.s.gold = 500;
  g.upgrade(t.id, 1);
  g.start();
  for (let i = 0; i < 250; i++) g.step();
  let r = Game.restore(g.serialize());
  assert.ok(r);
  for (let i = 0; i < 200; i++) {
    g.step();
    r.step();
  }
  assert.equal(g.serialize(), r.serialize());
});
test("corrupt and unsupported saves rejected without touching other keys", () => {
  assert.equal(Game.restore("{"), null);
  const bad = new Game();
  bad.s.phase = "battle";
  assert.equal(Game.restore(bad.serialize()), null);
  assert.equal(new Game().buy("constructor", 175, 136), null);
  const g = new Game();
  g.buy("dart", 175, 136);
  const s = JSON.parse(g.serialize());
  s.towers[0].kind = "oops";
  assert.equal(Game.restore(JSON.stringify(s)), null);
  s.towers[0].kind = "dart";
  s.gold = -1;
  assert.equal(Game.restore(JSON.stringify(s)), null);
});
test("boss leaks hurt, completed wave rewards cannot duplicate, reset is clean", () => {
  let g = new Game();
  g.s.phase = "battle";
  g.s.wave = 1;
  g.spawn("boss", LENGTH - 0.01);
  g.step();
  assert.equal(g.s.lives, 10);
  assert.equal(g.s.phase, "ready");
  let cash = g.s.gold;
  for (let i = 0; i < 50; i++) g.step();
  assert.equal(g.s.gold, cash);
  g.start();
  g.spawn("boss", LENGTH - 0.01);
  g.s.phase = "battle";
  g.step();
  assert.equal(g.s.phase, "lost");
  let r = new Game();
  assert.equal(r.s.shots.length + r.s.fields.length + r.s.enemies.length, 0);
});
test("two mixed branches complete while single-role compositions differ", () => {
  for (const mode of ["mixed", "alternative"])
    assert.equal(run(3, mode).phase, "won");
  assert.equal(run(3, "dart").phase, "lost");
  assert.equal(run(3, "arc").phase, "lost");
});
