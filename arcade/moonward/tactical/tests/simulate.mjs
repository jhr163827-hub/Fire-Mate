import { Battle } from "../engine.mjs";
import { pathToFileURL } from "node:url";
export function manage(g, strategy) {
  const mixed = [
    ["archer", 0],
    ["ember", 1],
    ["frost", 2],
    ["archer", 4],
    ["ember", 3],
    ["frost", 5],
  ];
  const plan = {
    mixed,
    alternative: mixed,
    scattered: [
      ["archer", 6],
      ["ember", 7],
      ["frost", 0],
      ["archer", 5],
      ["ember", 4],
      ["frost", 3],
    ],
    archers: [0, 1, 2, 3, 4, 5].map((p) => ["archer", p]),
    frost: [0, 1, 2, 3, 4, 5].map((p) => ["frost", p]),
    blast: [0, 1, 2, 3, 4, 5].map((p) => ["ember", p]),
  }[strategy];
  for (const [kind, pad] of plan.slice(0, 3))
    if (!g.s.units.some((u) => u.pad === pad)) g.buy(kind, pad);
  for (const u of [...g.s.units].sort(
    (a, b) => (a.kind === "ember" ? -1 : 1) - (b.kind === "ember" ? -1 : 1),
  ))
    if (!u.upgrade)
      g.upgrade(
        u.id,
        u.kind === "archer"
          ? "rapid"
          : u.kind === "ember"
            ? strategy === "alternative"
              ? "burn"
              : "blast"
            : strategy === "alternative"
              ? "deep"
              : "spread",
      );
  for (const [kind, pad] of plan.slice(3))
    if (!g.s.units.some((u) => u.pad === pad)) g.buy(kind, pad);
}
export function run(seed, strategy) {
  const g = new Battle(seed);
  let steps = 0;
  const waves = [];
  while (!g.finished() && steps < 30000) {
    if (g.s.phase === "ready") {
      manage(g, strategy);
      g.start();
    }
    g.step();
    g.events = [];
    if (g.s.phase !== "battle")
      waves.push({
        wave: g.s.wave,
        lives: g.s.lives,
        gold: g.s.gold,
        leaks: g.s.report.leaks,
      });
    steps++;
  }
  return {
    seed,
    strategy,
    result: g.s.phase,
    wave: g.s.wave,
    lives: g.s.lives,
    gold: g.s.gold,
    seconds: Math.round(g.s.tick / 30),
    combo: g.s.units.reduce((n, u) => n + u.combo, 0),
    waves,
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const strategies = [
      "mixed",
      "alternative",
      "scattered",
      "archers",
      "frost",
      "blast",
    ],
    results = [];
  for (const k of strategies)
    for (let seed = 1; seed <= 30; seed++) results.push(run(seed, k));
  console.log(
    JSON.stringify(
      {
        results,
        summary: Object.fromEntries(
          strategies.map((k) => {
            const r = results.filter((x) => x.strategy === k);
            return [
              k,
              {
                wins: r.filter((x) => x.result === "won").length,
                runs: r.length,
                avgWave: r.reduce((n, x) => n + x.wave, 0) / r.length,
                avgLives: r.reduce((n, x) => n + x.lives, 0) / r.length,
                avgSeconds: r.reduce((n, x) => n + x.seconds, 0) / r.length,
                avgGold: r.reduce((n, x) => n + x.gold, 0) / r.length,
              },
            ];
          }),
        ),
      },
      null,
      2,
    ),
  );
}
