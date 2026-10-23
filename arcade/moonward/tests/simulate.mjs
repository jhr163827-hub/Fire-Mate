import { Game } from "../engine.mjs";
import { PADS, KEYS, RULES } from "../data.mjs";
export function manage(g, strategy, blessing = "supply") {
  let s = g.s;
  if (s.pendingBoon) g.chooseBoon(blessing);
  const order = [1, 2, 4, 5, 6, 7, 8, 0, 3, 9, 11, 10, 13, 14, 12];
  if (strategy !== "no-merge")
    for (let u of [...s.units]) {
      let v = s.units.find(
        (v) => v.id !== u.id && v.kind === u.kind && v.tier === u.tier,
      );
      if (v && u.tier < 3 && s.units.length >= 8 && s.gold >= 15)
        g.merge(u.id, v.id);
    }
  let pad = order.find((p) => !s.units.some((u) => u.pad === p));
  if (pad !== undefined) {
    if (strategy === "balanced") {
      let counts = Object.fromEntries(
        KEYS.map((k) => [
          k,
          s.units
            .filter((u) => u.kind === k)
            .reduce((a, u) => a + 2 ** (u.tier - 1), 0),
        ]),
      );
      let desired = KEYS.filter((k) => counts[k] === 0)[0];
      if (desired && s.units.length >= 3) {
        g.summon(pad, desired);
      } else g.summon(pad);
    } else if (strategy === "archer") g.summon(pad, "archer");
    else if (strategy === "ember") g.summon(pad, "ember");
    else g.summon(pad);
  }
  if (s.phase === "ready" && s.units.length >= 2) g.start();
}
export function simulate(seed, strategy, blessing = "supply") {
  let g = new Game(seed);
  for (let t = 0; t < 30 * 1800 && !g.s.result; t++) {
    if (t % 15 === 0) manage(g, strategy, blessing);
    g.step();
    g.drain();
  }
  return {
    seed,
    strategy,
    win: !!g.s.result?.win,
    wave: g.s.wave,
    lives: g.s.lives,
    gold: g.s.gold,
    seconds: Math.round(g.s.tick / 30),
    units: g.s.units.length,
    tiers: g.s.units.reduce((a, u) => a + u.tier, 0),
  };
}
if (
  typeof process !== "undefined" &&
  process.argv[1]?.split("/").at(-1) === "simulate.mjs"
) {
  const rows = [];
  for (let strategy of ["random", "balanced", "archer", "ember", "no-merge"])
    for (let seed = 1; seed <= 20; seed++) rows.push(simulate(seed, strategy));
  for (let strategy of [...new Set(rows.map((r) => r.strategy))]) {
    let a = rows.filter((r) => r.strategy === strategy);
    console.log(
      JSON.stringify({
        strategy,
        runs: a.length,
        wins: a.filter((r) => r.win).length,
        avgWave: a.reduce((x, r) => x + r.wave, 0) / a.length,
        avgSeconds: Math.round(a.reduce((x, r) => x + r.seconds, 0) / a.length),
        avgLives: a.reduce((x, r) => x + r.lives, 0) / a.length,
      }),
    );
  }
  if (process.argv.includes("--json")) console.log(JSON.stringify(rows));
}
