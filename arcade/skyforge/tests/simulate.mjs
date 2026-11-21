import { Game } from "../engine.mjs";

export const builds = {
  balanced: [
    "missile",
    "drone",
    "shield",
    "volley",
    "laser",
    "arc",
    "frost",
    "orbit",
  ],
  gun: [
    "volley",
    "laser",
    "shield",
    "drone",
    "missile",
    "arc",
    "frost",
    "orbit",
  ],
  chain: [
    "arc",
    "frost",
    "shield",
    "missile",
    "drone",
    "volley",
    "laser",
    "orbit",
  ],
};
export function steer(g, stationary = false) {
  const s = g.s;
  if (stationary) return { x: 180, y: 490 };
  const boss = s.enemies.find((e) => e.kind === "boss"),
    drop = s.drops
      .filter((d) => d.y > 200)
      .sort(
        (a, b) =>
          Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y),
      )[0];
  const target = drop || (boss && { x: boss.x, y: 430 }) || { x: 180, y: 430 };
  let best = null,
    score = Infinity;
  for (let ix = -2; ix <= 2; ix++)
    for (let iy = -2; iy <= 2; iy++) {
      const x = Math.max(22, Math.min(338, s.x + ix * 28)),
        y = Math.max(240, Math.min(560, s.y + iy * 28));
      let cost = Math.hypot(x - target.x, y - target.y) * 0.04;
      for (const b of s.bullets) {
        const d = Math.min(
          ...[0, 0.22, 0.45].map((t) =>
            Math.hypot(x - b.x - b.vx * t, y - b.y - b.vy * t),
          ),
        );
        cost += Math.max(0, 60 - d) ** 2 * 0.03;
      }
      for (const e of s.enemies)
        cost +=
          Math.max(0, e.r + 38 - Math.hypot(x - e.x, y - e.y - 15)) ** 2 * 0.03;
      for (const h of s.hazards)
        if (Math.abs(x - h.x) < h.w / 2 + 20) cost += 100;
      if (cost < score) {
        score = cost;
        best = { x, y };
      }
    }
  return best;
}
export function run(stage, seed, build = "balanced", stationary = false) {
  const g = new Game({ stage, seed });
  let input = {},
    first = null,
    evolution = null;
  for (let i = 0; i < 24000 && !["won", "lost"].includes(g.s.phase); i++) {
    if (g.s.phase === "choice") {
      first ??= g.s.time;
      const choice = [...g.s.choices].sort(
        (a, b) => builds[build].indexOf(a) - builds[build].indexOf(b),
      )[0];
      g.choose(choice);
      if (g.s.skills[choice] >= 3) evolution ??= g.s.time;
    }
    if (i % 10 === 0) input = steer(g, stationary);
    if (
      !stationary &&
      g.s.pulse &&
      g.s.bullets.filter((b) => Math.hypot(b.x - g.s.x, b.y - g.s.y) < 55)
        .length >= 3
    )
      g.pulse();
    g.step(input);
    g.events = [];
  }
  return {
    stage,
    seed,
    build,
    stationary,
    phase: g.s.phase,
    time: +g.s.time.toFixed(1),
    hp: +g.s.hp.toFixed(1),
    level: g.s.level,
    first: +first?.toFixed(1),
    evolution: evolution && +evolution.toFixed(1),
    hits: g.s.hits,
    skills: g.s.skills,
  };
}
if (
  typeof process !== "undefined" &&
  process.argv[1]?.endsWith("simulate.mjs")
) {
  const results = [];
  for (const stage of Array.from({ length: 12 }, (_, i) => i + 1))
    for (const build of Object.keys(builds))
      for (let seed = 1; seed <= 5; seed++)
        results.push(run(stage, seed, build));
  for (let seed = 1; seed <= 5; seed++)
    results.push(run(1, seed, "balanced", true));
  console.log(JSON.stringify(results, null, 2));
}
