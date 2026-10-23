// Deterministic policy comparison; these are not human win rates.
import { Game } from "../engine.mjs";
import { manage } from "./simulate.mjs";
const rows = [];
for (const strategy of ["balanced", "random", "archer"]) {
  for (const blessing of ["none", "venom", "hunt", "supply"]) {
    const runs = [];
    for (let seed = 1; seed <= 20; seed++) {
      const g = new Game(seed);
      for (let t = 0; t < 30 * 1800 && !g.s.result; t++) {
        if (t % 15 === 0) {
          if (blessing === "none" && g.s.pendingBoon) {
            const lives = g.s.lives;
            g.chooseBoon("supply");
            g.s.lives = lives;
            g.s.gold -= 125;
            g.s.boons.pop();
          }
          manage(g, strategy, blessing);
        }
        g.step();
        g.drain();
      }
      if (!g.s.result)
        throw Error(
          "stalled run: " + JSON.stringify({ strategy, blessing, seed }),
        );
      runs.push({
        seed,
        win: g.s.result.win,
        wave: g.s.wave,
        gold: g.s.gold,
        lives: g.s.lives,
      });
    }
    const row = {
      strategy,
      blessing,
      wins: runs.filter((r) => r.win).length,
      avgWave: runs.reduce((n, r) => n + r.wave, 0) / 20,
      avgGold: Math.round(runs.reduce((n, r) => n + r.gold, 0) / 20),
      runs,
    };
    rows.push(row);
    console.log(JSON.stringify({ ...row, runs: undefined }));
  }
}
if (process.argv.includes("--json")) console.log(JSON.stringify(rows));
