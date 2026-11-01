import { Game } from "../engine.mjs";
import { TOWERS, stats } from "../data.mjs";
import { onPath, pathLength } from "../campaign-data.mjs";
export function manage(g, strategy = "mixed") {
  const roster = (
    strategy === "dart"
      ? ["dart"]
      : strategy === "artillery"
        ? ["bomb", "dart", "arc", "pierce", "ice"]
        : strategy === "toxic"
          ? ["venom", "arc", "ice", "trap", "bomb", "beacon"]
          : ["dart", "bomb", "ice", "arc", "pierce", "venom", "beacon", "trap"]
  ).filter((k) => g.allowed(k));
  const wanted = Math.min(
      strategy === "dart" ? 7 : 6,
      g.scene?.maxTowers || 24,
    ),
    samples = g.paths.map((path) =>
      Array.from({ length: Math.ceil(pathLength(path) / 20) }, (_, i) =>
        onPath(i * 20, path),
      ),
    );
  for (let i = 0; i < wanted; i++) {
    if (g.s.towers.length >= wanted) break;
    const kind = roster[g.s.towers.length % roster.length];
    if (g.s.gold < TOWERS[kind].cost) break;
    let best = null,
      score = -1,
      range = stats({ kind, level: 0 }).range;
    for (let y = 30; y <= 370; y += 25)
      for (let x = 30; x <= 610; x += 25) {
        if (!g.legal(x, y)) continue;
        const coverage = samples.map((points) =>
          points.reduce(
            (n, p) => n + (Math.hypot(x - p.x, y - p.y) < range ? 1 : 0),
            0,
          ),
        );
        let val =
          (coverage.reduce((a, b) => a + b, 0) + Math.min(...coverage) * 0.8) /
          (1 +
            g.s.towers.reduce(
              (n, t) => n + (Math.hypot(x - t.x, y - t.y) < 90 ? 0.25 : 0),
              0,
            ));
        if (kind === "beacon")
          val =
            g.s.towers.filter((t) => Math.hypot(x - t.x, y - t.y) < range)
              .length * 30;
        if (val > score) {
          score = val;
          best = [x, y];
        }
      }
    if (best) g.buy(kind, ...best);
    else break;
  }
  for (let lv = 1; lv <= 3; lv++)
    for (const t of g.s.towers) {
      const branch = strategy === "artillery" ? 1 : t.kind === "arc" ? 1 : 0;
      if (t.level < lv) g.upgrade(t.id, branch);
      if (t.kind === "arc" && branch === 1) t.target = "strong";
    }
}
export function run(stage, seed, strategy = "mixed", mode = "normal") {
  const g = new Game(seed, { stage, mode });
  let ticks = 0;
  while (
    !["won", "lost"].includes(g.s.phase) &&
    ticks < 35000 &&
    g.s.wave <= 30
  ) {
    if (g.s.phase === "ready") {
      manage(g, strategy);
      if (!g.start()) break;
    }
    if (g.s.spell <= 0) {
      const e = g.s.enemies
        .filter((e) => e.hp > 0)
        .sort((a, b) => g.remaining(a) - g.remaining(b))[0];
      if (e && g.remaining(e) < 250) g.meteor(e.x, e.y);
    }
    g.step();
    g.events = [];
    ticks++;
  }
  return {
    stage,
    seed,
    strategy,
    mode,
    phase: g.s.phase,
    wave: g.s.wave,
    lives: g.s.lives,
    gold: g.s.gold,
    time: Math.round(g.s.time),
  };
}
if (
  typeof process !== "undefined" &&
  process.argv[1]?.endsWith("campaign-simulate.mjs")
) {
  const rows = [];
  for (let stage = 1; stage <= 30; stage++)
    for (const strategy of ["mixed", "artillery", "toxic", "dart"])
      for (let seed = 1; seed <= (+process.env.SEEDS || 3); seed++)
        rows.push(run(stage, seed, strategy));
  console.log(JSON.stringify(rows, null, 2));
}
