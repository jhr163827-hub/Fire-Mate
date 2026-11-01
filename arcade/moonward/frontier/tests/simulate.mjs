import { Game } from "../engine.mjs";
import { TOWERS } from "../data.mjs";
export const spots = [
  [175, 136],
  [310, 136],
  [445, 136],
  [175, 270],
  [310, 270],
  [445, 270],
  [55, 130],
  [55, 265],
  [570, 265],
  [370, 25],
  [225, 25],
  [370, 380],
];
export function manage(g, mode = "mixed") {
  const kinds =
    mode === "dart"
      ? ["dart"]
      : mode === "bomb"
        ? ["bomb"]
        : mode === "arc"
          ? ["arc"]
          : ["dart", "bomb", "ice", "arc", "bomb", "dart"];
  const count = mode === "wide" ? 12 : 6;
  for (let i = 0; i < count; i++) {
    if (g.s.towers.length >= count) break;
    const p = spots[i];
    if (!g.s.towers.some((t) => t.x === p[0] && t.y === p[1]))
      g.buy(kinds[i % kinds.length], ...p);
  }
  for (let lv = 1; lv <= 3; lv++)
    for (const t of g.s.towers) {
      const branch =
        mode === "alternative"
          ? t.kind === "dart"
            ? 1
            : t.kind === "bomb"
              ? 1
              : t.kind === "ice"
                ? 1
                : 0
          : t.kind === "arc"
            ? 1
            : 0;
      if (t.level < lv) g.upgrade(t.id, branch);
      if (t.kind === "arc" && branch === 1) t.target = "strong";
    }
}
export function run(seed, mode) {
  const g = new Game(seed);
  let ticks = 0;
  while (!["won", "lost"].includes(g.s.phase) && ticks < 40000) {
    if (g.s.phase === "ready") {
      manage(g, mode);
      if (!g.start()) break;
    }
    g.step();
    ticks++;
  }
  return {
    seed,
    mode,
    phase: g.s.phase,
    wave: g.s.wave,
    lives: g.s.lives,
    gold: g.s.gold,
    time: +g.s.time.toFixed(1),
    kills: g.s.kills,
    towers: g.s.towers.map((t) => ({
      kind: t.kind,
      level: t.level,
      damage: Math.round(t.damage),
    })),
  };
}
if (process.argv[1]?.endsWith("simulate.mjs")) {
  let results = [];
  for (const mode of ["mixed", "alternative", "wide", "dart", "bomb", "arc"])
    for (let seed = 1; seed <= 20; seed++) results.push(run(seed, mode));
  let summary = {};
  for (const mode of [...new Set(results.map((r) => r.mode))]) {
    let rows = results.filter((r) => r.mode === mode);
    summary[mode] = {
      wins: rows.filter((r) => r.phase === "won").length,
      meanWave: rows.reduce((a, r) => a + r.wave, 0) / rows.length,
      meanLives: rows.reduce((a, r) => a + r.lives, 0) / rows.length,
      meanGold: rows.reduce((a, r) => a + r.gold, 0) / rows.length,
      meanTime: rows.reduce((a, r) => a + r.time, 0) / rows.length,
    };
  }
  console.log(JSON.stringify({ summary, results }, null, 2));
}
