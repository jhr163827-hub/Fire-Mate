import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../engine.mjs";
import { TOWERS, stats } from "../data.mjs";
import { stageFor, pathLength } from "../campaign-data.mjs";
import {
  emptyProfile,
  loadProfile,
  unlockedStage,
  availableTowers,
  canStart,
  complete,
} from "../progress.mjs";
import { manage } from "./campaign-simulate.mjs";
const tick = (g, n) => {
  for (let i = 0; i < n; i++) {
    g.step();
    g.events = [];
  }
};
test("30 distinct routes; sequential unlocks, best stars and mode gates", () => {
  const seen = new Set(),
    p = emptyProfile();
  assert.equal(canStart(p, 2, "normal"), false);
  assert.equal(canStart(p, 1, "hard"), false);
  for (let id = 1; id <= 30; id++) {
    const s = stageFor(id),
      g = new Game(id, { stage: id });
    seen.add(JSON.stringify(s.paths));
    assert.equal(s.waves.length, 6);
    manage(g);
    assert.ok(g.s.towers.length >= 2);
    assert.ok(s.paths.every((p) => pathLength(p) > 650));
    assert.equal(canStart(p, id, "normal"), true);
    complete(p, {
      stage: id,
      mode: "normal",
      phase: "won",
      wave: 6,
      lives: 30,
      time: 200,
    });
    assert.equal(canStart(p, id, "hard"), true);
  }
  assert.equal(seen.size, 30);
  assert.equal(unlockedStage(p), 30);
  assert.equal(availableTowers(p).length, 8);
  assert.equal(canStart(p, 30, "endless"), true);
  complete(p, {
    stage: 1,
    mode: "normal",
    phase: "won",
    wave: 6,
    lives: 2,
    time: 250,
  });
  assert.deepEqual(p.records["normal:1"], { stars: 3, time: 200, lives: 30 });
  assert.deepEqual(loadProfile(JSON.stringify(p)), p);
  assert.deepEqual(loadProfile("{broken"), emptyProfile());
});
test("challenge cap, spell restriction; endless record does not unlock story", () => {
  let g = new Game(1, { stage: 30, mode: "challenge" });
  g.s.gold = 1e5;
  manage(g);
  assert.equal(g.s.towers.length, 6);
  assert.equal(g.buy("dart", 30, 100), null);
  g.start();
  assert.equal(g.meteor(200, 200), false);
  g = new Game(1, { stage: 6, mode: "endless" });
  assert.equal(g.waveCount, Infinity);
  assert.ok(g.waveAt(49).packs.some(([k]) => k === "boss"));
  const p = emptyProfile();
  complete(p, { stage: 6, mode: "endless", phase: "lost", wave: 12 });
  assert.equal(p.endless[6], 11);
  assert.equal(unlockedStage(p), 1);
});
test("all eight roles contribute, both branches differ", () => {
  for (const kind of Object.keys(TOWERS)) {
    const g = new Game(4, { stage: 30 });
    g.s.gold = 1e5;
    let spot = null;
    for (let y = 30; y < 375 && !spot; y += 20)
      for (let x = 30; x < 615; x += 20)
        if (g.legal(x, y) && Math.abs(y - 55) < 85) {
          spot = [x, y];
          break;
        }
    const t = g.buy(kind, ...spot);
    assert.ok(t);
    g.upgrade(t.id, 0);
    g.s.phase = "battle";
    g.s.wave = 1;
    g.s.queue = [{ kind: "bud", time: 999 }];
    if (kind === "beacon") {
      let ally = null;
      for (let y = 30; y < 375 && !ally; y += 20)
        for (let x = 30; x < 615; x += 20)
          if (g.legal(x, y) && Math.hypot(x - t.x, y - t.y) < 100) {
            ally = g.buy("dart", x, y);
            break;
          }
      assert.ok(ally);
    }
    for (let i = 0; i < 12; i++)
      g.spawn("armor", Math.max(0, t.x + 25 - i * 4));
    tick(g, 210);
    assert.ok(kind === "beacon" ? t.buffed > 0 : t.damage > 0, kind);
    assert.notDeepEqual(
      stats({ kind, level: 3, branch: 0 }),
      stats({ kind, level: 3, branch: 1 }),
    );
  }
});
test("boss shield/summon/frost/heal timing and poison counter", () => {
  const make = (stage) => {
    const g = new Game(1, { stage });
    g.s.phase = "battle";
    g.s.wave = 6;
    g.s.queue = [{ kind: "bud", time: 999 }];
    return [g, g.spawn("boss", 100)];
  };
  let [g, b] = make(6);
  b.age = 3;
  let hp = b.hp;
  g.hit(b, 100, null, true);
  assert.ok(Math.abs(hp - b.hp - 40) < 0.001);
  b.age = 6;
  hp = b.hp;
  g.hit(b, 100, null, true);
  assert.equal(hp - b.hp, 100);
  [g, b] = make(12);
  b.age = 8.99;
  tick(g, 1);
  assert.equal(g.s.enemies.length, 4);
  [g, b] = make(18);
  b.age = 3;
  assert.equal(g.bossState(b), "냉기 가동");
  b.age = 7;
  assert.equal(g.bossState(b), "냉기 해제");
  [g, b] = make(24);
  b.hp = b.max / 2;
  b.age = 8.99;
  hp = b.hp;
  tick(g, 1);
  const heal = b.hp - hp;
  [g, b] = make(24);
  b.hp = b.max / 2;
  b.age = 8.99;
  b.poisonTime = 2;
  b.poison = 0;
  hp = b.hp;
  tick(g, 1);
  assert.ok(Math.abs((b.hp - hp) / heal - 0.3) < 0.001);
  [g, b] = make(30);
  assert.equal(b.pattern, "final");
});
test("two-route poison/mine save restores deterministically; corruption rejected", () => {
  const g = new Game(123, { stage: 30 });
  g.s.gold = 5000;
  manage(g, "toxic");
  g.start();
  tick(g, 150);
  const h = Game.restore(g.serialize());
  assert.ok(h);
  tick(g, 450);
  tick(h, 450);
  assert.equal(h.serialize(), g.serialize());
  let s = JSON.parse(g.serialize());
  s.queue.push({ kind: "bud", time: 200, route: 99 });
  assert.equal(Game.restore(JSON.stringify(s)), null);
  s = JSON.parse(new Game().serialize());
  s.mode = "endless";
  assert.equal(Game.restore(JSON.stringify(s)), null);
  assert.ok(Game.restore(new Game().serialize()));
});
test("target priority uses distance to exit across unequal routes", () => {
  const g = new Game(1, { stage: 9 }),
    a = g.spawn("bud", 400, false, 0),
    b = g.spawn("bud", 400, false, 1);
  assert.ok(g.remaining(b) < g.remaining(a));
});
