import { STEP, FOES, stats } from "./data.mjs";
import { onPath, pathLength } from "./campaign-data.mjs";
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function bossState(e) {
  if (!e.pattern) return "";
  const q = (e.age || 0) % 12;
  return ["shield", "final"].includes(e.pattern)
    ? q < 2
      ? "방패 예고"
      : q < 5
        ? "방패 전개"
        : e.pattern === "final" && q >= 7 && q < 9
          ? "소환 예고"
          : "방패 해제"
    : e.pattern === "frost"
      ? q < 2
        ? "냉기 예고"
        : q < 6
          ? "냉기 가동"
          : "냉기 해제"
      : q >= 7 && q < 9
        ? e.pattern === "heal"
          ? "회복 예고"
          : "소환 예고"
        : "";
}
export function effects(g) {
  const s = g.s;
  for (const e of [...s.enemies]) {
    if (e.hp <= 0) continue;
    e.age = (e.age || 0) + STEP;
    if (
      e.pattern &&
      Math.floor((e.age + 3) / 12) > Math.floor((e.age + 3 - STEP) / 12)
    ) {
      if (e.pattern === "heal") {
        e.hp = Math.min(
          e.max,
          e.hp + e.max * 0.09 * (e.poisonTime > 0 ? 0.3 : 1),
        );
        g.events.push({ type: "heal", x: e.x, y: e.y });
      }
      if (["summon", "final"].includes(e.pattern) && s.enemies.length < 300) {
        for (let j = 0; j < 3; j++)
          g.spawn("runner", Math.max(0, e.d - j * 9), true, e.route || 0);
        g.events.push({ type: "split", x: e.x, y: e.y });
      }
    }
    if (e.poisonTime > 0) {
      e.poisonTime = Math.max(0, e.poisonTime - STEP);
      g.hit(
        e,
        e.poison * STEP,
        s.towers.find((t) => t.id === e.poisonOwner),
        true,
      );
    }
    if (FOES[e.kind].regen && e.hp > 0)
      e.hp = Math.min(
        e.max,
        e.hp + FOES[e.kind].regen * STEP * (e.poisonTime > 0 ? 0.3 : 1),
      );
  }
  for (const m of s.mines) {
    m.life -= STEP;
    if (!s.enemies.some((e) => e.hp > 0 && dist(e, m) < 22)) continue;
    const owner = s.towers.find((t) => t.id === m.owner);
    for (const e of [...s.enemies])
      if (e.hp > 0 && dist(e, m) < m.radius) {
        if (m.breakArmor) e.broken = 3;
        if (m.slow) {
          e.slow = Math.max(e.slow, m.slow * (e.kind === "boss" ? 0.5 : 1));
          e.slowTime = 3;
          e.slowOwner = m.owner;
        }
        g.hit(e, m.damage, owner);
        if (owner) owner.splashHits++;
      }
    m.life = 0;
    g.events.push({ type: "blast", x: m.x, y: m.y, radius: m.radius });
  }
  s.mines = s.mines.filter((m) => m.life > 0);
}
export function boosted(g, t) {
  const a = stats(t);
  let boost = 0,
    range = 0,
    damage = 0,
    owner = null;
  for (const b of g.s.towers)
    if (b.kind === "beacon" && b.id !== t.id) {
      const z = stats(b);
      if (dist(t, b) <= z.range) {
        if (z.boost > boost) {
          boost = z.boost;
          owner = b;
        }
        range = Math.max(range, z.rangeBoost);
        damage = Math.max(damage, z.damageBoost);
      }
    }
  if (owner) owner.buffed += STEP;
  a.range += range;
  a.damage *= 1 + damage;
  a.coolRate =
    (1 + boost) /
    (g.s.enemies.some(
      (e) =>
        e.hp > 0 &&
        e.pattern === "frost" &&
        bossState(e) === "냉기 가동" &&
        dist(t, e) < 130,
    )
      ? 1.6
      : 1);
  return a;
}
export function mine(g, t, a) {
  if (g.s.mines.filter((m) => m.owner === t.id).length >= 2) {
    t.cool = 0.3;
    return;
  }
  let best = null,
    nearest = Infinity;
  for (const path of g.paths)
    for (let d = 0; d < pathLength(path); d += 12) {
      const p = onPath(d, path),
        n = dist(p, t);
      if (n < nearest) {
        nearest = n;
        best = p;
      }
    }
  if (best && nearest <= a.range) {
    g.s.mines.push({
      ...best,
      owner: t.id,
      damage: a.damage,
      radius: a.splash,
      slow: a.mineSlow,
      breakArmor: a.breakArmor,
      life: 45,
    });
    t.cool = a.rate;
    g.events.push({ type: "build", ...best });
  }
}
export function pierce(g, t, a) {
  const hit = new Set();
  for (let ray = 0; ray < a.fan; ray++) {
    const angle = t.angle + (ray - (a.fan - 1) / 2) * 0.16,
      dx = Math.cos(angle),
      dy = Math.sin(angle);
    const list = g.s.enemies
      .filter((e) => e.hp > 0)
      .map((e) => ({
        e,
        along: (e.x - t.x) * dx + (e.y - t.y) * dy,
        side: Math.abs((e.x - t.x) * dy - (e.y - t.y) * dx),
      }))
      .filter(
        (o) =>
          o.along > 0 &&
          o.along < a.range + 45 &&
          o.side < (o.e.kind === "boss" ? 25 : 15),
      )
      .sort((a, b) => a.along - b.along)
      .slice(0, a.pierce);
    for (const { e } of list)
      if (!hit.has(e.id)) {
        hit.add(e.id);
        g.hit(e, a.damage, t, a.ignore);
      }
    g.events.push({
      type: "pierce",
      x: t.x,
      y: t.y,
      tx: t.x + dx * (a.range + 45),
      ty: t.y + dy * (a.range + 45),
    });
  }
  t.splashHits += hit.size;
}
export function poison(g, e, p) {
  for (const q of g.s.enemies)
    if (
      q.hp > 0 &&
      (q.id === e.id || (p.poisonRadius && dist(q, e) <= p.poisonRadius))
    ) {
      q.poison = Math.max(q.poison || 0, p.poison);
      q.poisonTime = p.poisonDuration;
      q.poisonOwner = p.owner;
    }
  g.events.push({
    type: "poison",
    x: e.x,
    y: e.y,
    radius: p.poisonRadius || 18,
  });
}
