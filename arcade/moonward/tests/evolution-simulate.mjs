import { Game } from "../engine.mjs";
import { EVOLUTIONS } from "../data.mjs";
import { manage } from "./simulate.mjs";
const rows = [];
for (const strategy of ["balanced", "random", "archer", "ember"])
  for (const mode of ["none", "archer", "ember", "both"]) {
    const runs = [];
    for (let seed = 1; seed <= 20; seed++) {
      const g = new Game(seed);
      let firstEvolution = 0;
      for (let t = 0; t < 30 * 1800 && !g.s.result; t++) {
        if (t % 15 === 0) {
          if (g.s.pendingBoon) g.chooseBoon("supply");
          const candidate = g.s.units.find(
            (u) =>
              u.tier === 3 &&
              !u.evolved &&
              EVOLUTIONS[u.kind] &&
              (mode === "both" || mode === u.kind),
          );
          if (candidate && g.s.units.length >= 8) {
            if (g.evolve(candidate.id) && !firstEvolution)
              firstEvolution = g.s.wave;
          } else manage(g, strategy, "supply");
        }
        g.step();
        g.drain();
      }
      if (!g.s.result) throw Error("stalled simulation");
      runs.push({
        seed,
        win: g.s.result.win,
        wave: g.s.wave,
        gold: g.s.gold,
        lives: g.s.lives,
        firstEvolution,
        evolved: g.s.units.filter((u) => u.evolved).length,
      });
    }
    const row = {
      strategy,
      mode,
      wins: runs.filter((r) => r.win).length,
      avgWave: runs.reduce((n, r) => n + r.wave, 0) / 20,
      avgGold: Math.round(runs.reduce((n, r) => n + r.gold, 0) / 20),
      runs,
    };
    rows.push(row);
    console.log(JSON.stringify({ ...row, runs: undefined }));
  }
if (process.argv.includes("--json")) console.log(JSON.stringify(rows));
