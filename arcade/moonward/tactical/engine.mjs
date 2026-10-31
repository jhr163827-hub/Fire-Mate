import {
  STEP,
  PADS,
  TYPES,
  ENEMIES,
  WAVES,
  LENGTH,
  pointAt,
  stats,
} from "./data.mjs";
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export class Battle {
  constructor(seed = 1) {
    this.s = {
      version: 1,
      seed: seed >>> 0,
      gold: 230,
      lives: 12,
      wave: 0,
      phase: "ready",
      tick: 0,
      nextId: 1,
      units: [],
      enemies: [],
      fields: [],
      queue: [],
      spawnIn: 0,
      kills: 0,
      leaks: [],
      report: null,
    };
    this.events = [];
  }
  emit(e) {
    this.events.push(e);
    if (this.events.length > 160) this.events.shift();
  }
  random() {
    this.s.seed = (1664525 * this.s.seed + 1013904223) >>> 0;
    return this.s.seed / 4294967296;
  }
  finished() {
    return ["won", "lost"].includes(this.s.phase);
  }
  buy(kind, pad) {
    const s = this.s,
      t = TYPES[kind];
    if (
      !Object.hasOwn(TYPES, kind) ||
      !Number.isInteger(pad) ||
      !PADS[pad] ||
      s.units.some((u) => u.pad === pad) ||
      s.gold < t.cost ||
      this.finished()
    )
      return false;
    s.gold -= t.cost;
    s.units.push({
      id: s.nextId++,
      kind,
      pad,
      upgrade: null,
      cool: 0,
      spent: t.cost,
      damage: 0,
      hits: 0,
      slowTime: 0,
      combo: 0,
    });
    this.emit({ type: "build", pad, kind });
    return true;
  }
  upgrade(id, key) {
    const u = this.s.units.find((u) => u.id === id),
      o = u && TYPES[u.kind].upgrades[key];
    if (
      !u ||
      !Object.hasOwn(TYPES[u.kind].upgrades, key) ||
      u.upgrade ||
      this.s.gold < o.cost ||
      this.finished()
    )
      return false;
    this.s.gold -= o.cost;
    u.spent += o.cost;
    u.upgrade = key;
    this.emit({ type: "build", pad: u.pad, kind: u.kind });
    return true;
  }
  move(id, pad) {
    const u = this.s.units.find((u) => u.id === id);
    if (!u || this.s.phase !== "ready" || !Number.isInteger(pad) || !PADS[pad])
      return false;
    const v = this.s.units.find((v) => v.pad === pad);
    if (v) v.pad = u.pad;
    u.pad = pad;
    return true;
  }
  sell(id) {
    const i = this.s.units.findIndex((u) => u.id === id);
    if (i < 0 || this.finished()) return false;
    this.s.gold += Math.floor(this.s.units[i].spent * 0.75);
    this.s.units.splice(i, 1);
    return true;
  }
  start() {
    const s = this.s;
    if (s.phase !== "ready" || !s.units.length || s.wave >= 5) return false;
    const w = WAVES[s.wave++];
    s.phase = "battle";
    s.queue = w.pack.flatMap(([kind, n, gap]) =>
      Array.from({ length: n }, () => ({ kind, gap })),
    );
    s.spawnIn = 0;
    s.report = null;
    s.leakStart = s.leaks.length;
    s.comboStart = s.units.reduce((n, u) => n + u.combo, 0);
    return true;
  }
  hit(e, damage, u) {
    if (e.hp <= 0) return;
    const actual = Math.min(
      e.hp,
      damage * (u.kind === "archer" ? ENEMIES[e.kind].armor : 1),
    );
    e.hp -= actual;
    u.damage += actual;
    u.hits++;
    e.flash = 0.12;
    if (e.hp <= 0) {
      this.s.gold += ENEMIES[e.kind].reward;
      this.s.kills++;
      this.emit({ type: "death", ...pointAt(e.d), kind: e.kind });
    }
  }
  step() {
    const s = this.s;
    if (s.phase !== "battle") return;
    s.tick++;
    s.spawnIn -= STEP;
    if (s.queue.length && s.spawnIn <= 0) {
      const q = s.queue.shift(),
        t = ENEMIES[q.kind];
      s.spawnIn += q.gap;
      s.enemies.push({
        id: s.nextId++,
        kind: q.kind,
        hp: t.hp,
        max: t.hp,
        speed: t.speed * (0.97 + this.random() * 0.06),
        d: 0,
        slow: 0,
        slowRate: 0,
        slowSource: 0,
        flash: 0,
      });
    }
    for (const e of s.enemies) {
      e.flash = Math.max(0, e.flash - STEP);
      if (e.slow > 0) {
        const u = s.units.find((u) => u.id === e.slowSource);
        if (u) u.slowTime += STEP * e.slowRate;
      }
      e.d += e.speed * STEP * (e.slow > 0 ? 1 - e.slowRate : 1);
      e.slow = Math.max(0, e.slow - STEP);
    }
    for (const f of s.fields) {
      f.life -= STEP;
      const u = s.units.find((u) => u.id === f.owner);
      if (u)
        for (const e of s.enemies)
          if (e.hp > 0 && dist(pointAt(e.d), f) <= 37)
            this.hit(e, 17 * STEP, u);
    }
    s.fields = s.fields.filter((f) => f.life > 0);
    for (const u of s.units) {
      u.cool -= STEP;
      if (u.cool > 0) continue;
      const t = stats(u),
        [x, y] = PADS[u.pad],
        p = { x, y },
        targets = s.enemies
          .filter((e) => e.hp > 0 && dist(p, pointAt(e.d)) <= t.range)
          .sort((a, b) => b.d - a.d);
      if (!targets.length) {
        u.cool = 0;
        continue;
      }
      let target = targets[0];
      if (u.kind === "ember") {
        const count = (e) =>
          s.enemies.filter(
            (v) => v.hp > 0 && dist(pointAt(v.d), pointAt(e.d)) <= t.radius,
          ).length;
        target = targets.reduce(
          (b, e) => (count(e) > count(b) ? e : b),
          target,
        );
      }
      if (u.kind === "frost")
        target = targets.find((e) => e.slow < 0.4) || target;
      const to = pointAt(target.d);
      let victims = [target];
      if (u.kind === "ember")
        victims = s.enemies.filter(
          (e) => e.hp > 0 && dist(pointAt(e.d), to) <= t.radius,
        );
      if (u.upgrade === "spread")
        victims = targets
          .filter((e) => dist(pointAt(e.d), to) <= 64)
          .sort((a, b) => a.slow - b.slow)
          .slice(0, 3);
      if (u.upgrade === "pierce") {
        const len = dist(p, to) || 1,
          dx = (to.x - x) / len,
          dy = (to.y - y) / len;
        victims = targets
          .filter((e) => {
            const q = pointAt(e.d),
              along = (q.x - x) * dx + (q.y - y) * dy;
            return along > 0 && Math.abs((q.x - x) * dy - (q.y - y) * dx) < 15;
          })
          .slice(0, 3);
      }
      let combo = 0;
      for (const e of victims) {
        if (u.kind === "ember" && e.slow > 0) {
          u.combo++;
          combo++;
        }
        this.hit(e, t.damage, u);
        if (u.kind === "frost" && e.hp > 0) {
          const rate =
            (u.upgrade === "deep" ? 0.7 : 0.45) * (e.kind === "boss" ? 0.5 : 1);
          if (e.slow <= 0 || rate >= e.slowRate) {
            e.slowRate = rate;
            e.slowSource = u.id;
          }
          e.slow = Math.max(e.slow, u.upgrade === "deep" ? 3 : 2);
        }
      }
      if (u.upgrade === "burn") {
        s.fields.push({ ...to, life: 3, owner: u.id });
        if (s.fields.length > 24) s.fields.shift();
      }
      this.emit({
        type: "attack",
        kind: u.kind,
        upgrade: u.upgrade,
        x,
        y,
        tx: to.x,
        ty: to.y,
        radius: t.radius || 0,
        victims: victims.map((e) => pointAt(e.d)),
        combo,
      });
      u.cool += t.interval;
    }
    for (const e of s.enemies)
      if (e.hp > 0 && e.d >= LENGTH) {
        s.lives = Math.max(0, s.lives - (e.kind === "boss" ? 12 : 1));
        s.leaks.push(e.kind);
        this.emit({ type: "leak", kind: e.kind });
      }
    s.enemies = s.enemies.filter((e) => e.hp > 0 && e.d < LENGTH);
    if (s.lives <= 0) {
      s.phase = "lost";
      s.report = this.report();
    } else if (!s.queue.length && !s.enemies.length) {
      s.gold += WAVES[s.wave - 1].reward;
      s.phase = s.wave === 5 ? "won" : "ready";
      s.fields = [];
      s.report = this.report();
      this.emit({ type: "clear" });
    }
  }
  report() {
    const s = this.s,
      leaks = s.leaks.slice(s.leakStart || 0);
    return {
      wave: s.wave,
      leaks,
      combo: s.units.reduce((n, u) => n + u.combo, 0) - (s.comboStart || 0),
      advice:
        s.units.length && s.units.every((u) => u.kind === "frost")
          ? "둔화만으로는 적을 처치하기 어려워요. 궁수나 광역을 함께 배치해 보세요."
          : leaks.includes("boss")
            ? "보스가 성문에 도달했어요. 속사 궁수와 깊은 냉기로 공격 시간을 늘려 보세요."
            : leaks.includes("wolf")
              ? "늑대가 빠져나갔어요. 둔화 뒤에 광역을 배치해 보세요."
              : leaks.includes("beetle")
                ? "갑각충은 화살에 강해요. 폭발·잔불에 투자해 보세요."
                : leaks.length
                  ? "출구에도 사거리가 닿도록 병력을 재배치해 보세요."
                  : "방어 성공. 다음 적에 맞춰 배치와 강화 방향을 정하세요.",
    };
  }
  serialize() {
    return JSON.stringify(this.s);
  }
  static restore(raw) {
    try {
      const s = JSON.parse(raw),
        finite = (o, keys) =>
          keys.every((k) => Number.isFinite(o[k]) && o[k] >= 0);
      if (
        s.version !== 1 ||
        !["ready", "battle", "won", "lost"].includes(s.phase) ||
        !Number.isInteger(s.wave) ||
        s.wave < 0 ||
        s.wave > 5 ||
        !finite(s, ["gold", "lives", "tick", "nextId", "kills"]) ||
        s.lives > 12 ||
        !Number.isInteger(s.seed) ||
        !Array.isArray(s.units) ||
        s.units.length > 8 ||
        !Array.isArray(s.enemies) ||
        s.enemies.length > 100 ||
        !Array.isArray(s.queue) ||
        s.queue.length > 100 ||
        !Array.isArray(s.fields) ||
        s.fields.length > 24 ||
        !Array.isArray(s.leaks) ||
        !Number.isFinite(s.spawnIn)
      )
        return null;
      if (
        s.units.some(
          (u) =>
            !Object.hasOwn(TYPES, u.kind) ||
            !Number.isInteger(u.pad) ||
            !PADS[u.pad] ||
            !finite(u, [
              "id",
              "spent",
              "damage",
              "hits",
              "slowTime",
              "combo",
            ]) ||
            !Number.isFinite(u.cool) ||
            (u.upgrade !== null &&
              !Object.hasOwn(TYPES[u.kind].upgrades, u.upgrade)),
        ) ||
        new Set(s.units.map((u) => u.pad)).size !== s.units.length ||
        new Set(s.units.map((u) => u.id)).size !== s.units.length
      )
        return null;
      if (
        s.enemies.some(
          (e) =>
            !Object.hasOwn(ENEMIES, e.kind) ||
            !finite(e, [
              "id",
              "hp",
              "max",
              "speed",
              "d",
              "slow",
              "slowRate",
              "flash",
              "slowSource",
            ]) ||
            e.slowRate > 1 ||
            e.max <= 0,
        ) ||
        s.queue.some(
          (q) =>
            !Object.hasOwn(ENEMIES, q.kind) ||
            !Number.isFinite(q.gap) ||
            q.gap <= 0,
        ) ||
        s.fields.some(
          (f) =>
            !Number.isFinite(f.x) ||
            !Number.isFinite(f.y) ||
            !finite(f, ["life", "owner"]),
        )
      )
        return null;
      if (s.leaks.some((k) => !Object.hasOwn(ENEMIES, k))) return null;
      // Reports are derived text; never render arbitrary strings from storage.
      const b = new Battle();
      b.s = s;
      s.report = s.report ? b.report() : null;
      return b;
    } catch {
      return null;
    }
  }
}
