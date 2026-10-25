import { Game } from "../engine.mjs";
import { manage } from "./simulate.mjs";
const records = [];
for (let seed = 1; seed <= 20; seed++) {
  const g = new Game(seed),
    seen = new Map(),
    cues = [];
  for (let t = 0; t < 54000 && !g.s.result; t++) {
    if (t % 15 === 0) manage(g, "balanced", "supply");
    g.step();
    for (const e of g.s.enemies.filter((e) => e.boss))
      seen.set(g.s.wave, {
        wave: g.s.wave,
        age: Math.round(e.age * 10) / 10,
        calls: e.calls,
        rage: e.rageAt !== null,
      });
    for (const ev of g.drain()) if (ev.type === "bossCue") cues.push(ev.text);
  }
  records.push({
    seed,
    win: g.s.result?.win,
    finalBossDefeated: g.s.wave === 18 && g.s.bossDefeated,
    bosses: [...seen.values()],
    cues,
  });
}
console.log(JSON.stringify(records, null, 2));
