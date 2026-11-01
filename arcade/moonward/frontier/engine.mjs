import {
  stageFor,
  endlessWave,
  onPath,
  pathLength,
  nearPath,
  UNLOCKS,
} from "./campaign-data.mjs";
import {
  bossState,
  effects,
  boosted,
  mine,
  pierce,
  poison,
} from "./combat.mjs";
import {
  STEP,
  PATH,
  TOWERS,
  FOES,
  WAVES,
  at,
  LENGTH,
  roadDistance,
  stats,
} from "./data.mjs";
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export class Game {
  constructor(seed = 1, options = {}) {
    this.scene = options.stage
      ? stageFor(options.stage, options.mode || "normal")
      : null;
    this.s = {
      v: 1,
      seed: seed >>> 0,
      gold: 340,
      lives: 30,
      wave: 0,
      phase: "ready",
      time: 0,
      towers: [],
      enemies: [],
      shots: [],
      fields: [],
      queue: [],
      id: 1,
      spawn: 0,
      kills: 0,
      spell: 0,
      leaks: {},
      lastReward: 0,
    };
    this.s.mines = [];
    if (this.scene) {
      this.s.stage = this.scene.id;
      this.s.mode = this.scene.mode;
      this.s.allowed =
        options.allowed ||
        UNLOCKS.filter(([, n]) => n <= this.scene.id).map(([k]) => k);
      this.s.gold = this.scene.startingGold;
    }
    this.events = [];
  }
  get paths() {
    return this.scene?.paths || [PATH];
  }
  get waveCount() {
    return this.s.mode === "endless"
      ? Infinity
      : this.scene?.waves.length || WAVES.length;
  }
  waveAt(i) {
    return this.s.mode === "endless"
      ? endlessWave(i)
      : (this.scene?.waves || WAVES)[i];
  }
  remaining(e) {
    return pathLength(this.paths[e.route || 0]) - e.d;
  }
  allowed(k) {
    return !this.scene || this.s.allowed.includes(k);
  }
  bossState(e) {
    return bossState(e);
  }
  rand() {
    this.s.seed = (Math.imul(this.s.seed, 1664525) + 1013904223) >>> 0;
    return this.s.seed / 4294967296;
  }
  legal(x, y) {
    return (
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      x >= 25 &&
      x <= 615 &&
      y >= 25 &&
      y <= 375 &&
      this.paths.every((p) => nearPath(x, y, p) > 36) &&
      !(this.scene?.blocks || []).some(
        (b) =>
          x > b.x - 16 &&
          x < b.x + b.w + 16 &&
          y > b.y - 16 &&
          y < b.y + b.h + 16,
      ) &&
      this.s.towers.every((t) => Math.hypot(x - t.x, y - t.y) >= 42)
    );
  }
  buy(kind, x, y) {
    const a = TOWERS[kind];
    if (
      !Object.hasOwn(TOWERS, kind) ||
      !this.allowed(kind) ||
      !["ready", "battle"].includes(this.s.phase) ||
      this.s.gold < a.cost ||
      !this.legal(x, y) ||
      this.s.towers.length >= (this.scene?.maxTowers || 24)
    )
      return null;
    this.s.gold -= a.cost;
    const t = {
      id: this.s.id++,
      kind,
      x,
      y,
      level: 0,
      branch: -1,
      spent: a.cost,
      cool: 0,
      damage: 0,
      kills: 0,
      slowed: 0,
      buffed: 0,
      splashHits: 0,
      target: "first",
      angle: 0,
    };
    this.s.towers.push(t);
    this.events.push({ type: "build", x, y });
    return t;
  }
  upgrade(id, branch) {
    const t = this.s.towers.find((t) => t.id === id);
    if (
      !t ||
      !["ready", "battle"].includes(this.s.phase) ||
      ![0, 1].includes(branch) ||
      t.level === 3 ||
      (t.level && t.branch !== branch)
    )
      return false;
    let cost = TOWERS[t.kind].branches[branch].costs[t.level];
    if (this.s.gold < cost) return false;
    this.s.gold -= cost;
    t.spent += cost;
    t.branch = branch;
    t.level++;
    this.events.push({ type: "build", x: t.x, y: t.y });
    return true;
  }
  sell(id) {
    if (!["ready", "battle"].includes(this.s.phase)) return false;
    let i = this.s.towers.findIndex((t) => t.id === id);
    if (i < 0) return false;
    this.s.gold += Math.floor(this.s.towers[i].spent * 0.75);
    this.s.towers.splice(i, 1);
    return true;
  }
  start() {
    if (
      this.s.phase !== "ready" ||
      this.s.wave >= this.waveCount ||
      !this.s.towers.length
    )
      return false;
    const w = this.waveAt(this.s.wave++);
    let time = 0;
    for (let [k, n, gap] of w.packs)
      for (let i = 0; i < n; i++) {
        this.s.queue.push({ kind: k, time, route: i % this.paths.length });
        time += gap;
      }
    this.s.spawn = 0;
    this.s.phase = "battle";
    return true;
  }
  spawn(kind, d = 0, child = false, route = 0) {
    const a = FOES[kind],
      scale = this.scene
        ? this.scene.hpScale *
          (this.s.mode === "endless"
            ? Math.pow(1.14, Math.min(100, Math.max(0, this.s.wave - 1)))
            : 1 + Math.max(0, this.s.wave - 2) * 0.065)
        : 1 + Math.max(0, this.s.wave - 3) * 0.13,
      e = {
        id: this.s.id++,
        kind,
        hp: a.hp * scale,
        max: a.hp * scale,
        d,
        speed: a.speed * (0.97 + 0.06 * this.rand()),
        slow: 0,
        slowTime: 0,
        broken: 0,
        flash: 0,
        child,
        route,
        age: 0,
        poison: 0,
        poisonTime: 0,
        poisonOwner: 0,
        slowOwner: 0,
        pattern:
          kind === "boss" && this.scene ? this.scene.theme.pattern : null,
      };
    Object.assign(e, onPath(d, this.paths[route]));
    this.s.enemies.push(e);
    return e;
  }
  hit(e, damage, t, ignore = false) {
    if (e.hp <= 0) return;
    const armor = ignore || e.broken > 0 ? 0 : FOES[e.kind].armor || 0;
    let dealt = Math.min(
      e.hp,
      damage * (1 - armor) * (bossState(e) === "방패 전개" ? 0.4 : 1),
    );
    e.hp -= dealt;
    e.flash = 0.12;
    if (t) t.damage += dealt;
    if (e.hp <= 0) {
      this.s.gold += FOES[e.kind].cash;
      this.s.kills++;
      if (t) t.kills++;
      this.events.push({ type: "pop", x: e.x, y: e.y, kind: e.kind });
      if (FOES[e.kind].split && !e.child) {
        for (let i = 0; i < FOES[e.kind].split; i++)
          this.spawn(
            i % 3 === 0 ? "runner" : "bud",
            Math.max(0, e.d - i * 5),
            true,
            e.route || 0,
          );
        this.events.push({ type: "split", x: e.x, y: e.y });
      }
    }
  }
  meteor(x, y) {
    if (
      this.s.phase !== "battle" ||
      this.s.spell > 0 ||
      this.scene?.spell === false ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      x < 0 ||
      x > 640 ||
      y < 0 ||
      y > 400
    )
      return false;
    this.s.spell = 32;
    this.s.shots.push({
      kind: "meteor",
      x,
      y,
      tx: x,
      ty: y,
      time: 0.65,
      total: 0.65,
      damage: 260,
      radius: 75,
    });
    this.events.push({ type: "warning", x, y });
    return true;
  }
  step() {
    const s = this.s;
    if (s.phase !== "battle") return;
    s.time += STEP;
    s.spawn += STEP;
    s.spell = Math.max(0, s.spell - STEP);
    while (s.queue.length && s.queue[0].time <= s.spawn) {
      const q = s.queue.shift();
      this.spawn(q.kind, 0, false, q.route || 0);
    }
    effects(this);
    for (const p of [...s.shots]) {
      p.time -= STEP;
      if (p.time > 0) continue;
      let t = s.towers.find((t) => t.id === p.owner);
      if (p.kind === "bomb" || p.kind === "meteor") {
        for (const e of [...s.enemies])
          if (e.hp > 0 && Math.hypot(e.x - p.tx, e.y - p.ty) <= p.radius) {
            if (p.breakArmor) e.broken = 3;
            this.hit(e, p.damage, t, p.kind === "meteor");
            if (t) t.splashHits++;
          }
        this.events.push({ type: "blast", x: p.tx, y: p.ty, radius: p.radius });
        if (p.burn)
          s.fields.push({
            x: p.tx,
            y: p.ty,
            radius: p.radius,
            damage: p.burn,
            life: p.duration,
            owner: p.owner,
          });
      } else {
        const e = s.enemies.find((e) => e.id === p.enemy && e.hp > 0);
        if (e) {
          this.hit(e, p.damage, t, p.ignore);
          if (p.poison) poison(this, e, p);
        }
      }
    }
    s.shots = s.shots.filter((p) => p.time > 0);
    for (const f of s.fields) {
      f.life -= STEP;
      const t = s.towers.find((t) => t.id === f.owner);
      for (const e of [...s.enemies])
        if (e.hp > 0 && dist(e, f) <= f.radius)
          this.hit(e, f.damage * STEP, t, true);
    }
    s.fields = s.fields.filter((f) => f.life > 0);
    for (const t of s.towers) {
      if (t.kind === "beacon") continue;
      const a = boosted(this, t);
      t.cool -= STEP * a.coolRate;
      if (t.cool > 0) continue;
      if (t.kind === "trap") {
        mine(this, t, a);
        continue;
      }
      const targets = s.enemies.filter(
        (e) => e.hp > 0 && dist(t, e) <= a.range,
      );
      if (!targets.length) continue;
      targets.sort((x, y) =>
        t.target === "strong"
          ? y.hp - x.hp
          : t.target === "last"
            ? this.remaining(y) - this.remaining(x)
            : this.remaining(x) - this.remaining(y),
      );
      let e = targets[0];
      if (t.kind === "bomb" && t.target === "first") {
        let score = -1;
        for (const q of targets) {
          let n = targets.filter((r) => dist(q, r) < a.splash).length;
          if (n > score) {
            score = n;
            e = q;
          }
        }
      }
      t.cool = a.rate;
      t.angle = Math.atan2(e.y - t.y, e.x - t.x);
      let damage = a.damage * (e.kind === "boss" ? a.big : 1);
      if (t.kind === "pierce") {
        pierce(this, t, a);
      } else if (t.kind === "ice") {
        targets.sort((x, y) => x.slowTime - y.slowTime);
        for (const q of targets.slice(0, a.targets)) {
          q.slow = Math.max(q.slow, a.slow * (q.kind === "boss" ? 0.5 : 1));
          q.slowOwner = t.id;
          q.slowTime = t.level === 3 && t.branch === 0 ? 4 : 2;
          this.hit(q, a.damage, t, true);
        }
        this.events.push({ type: "ice", x: t.x, y: t.y, radius: a.range });
      } else if (t.kind === "arc") {
        let previous = t;
        const hit = new Set();
        for (let j = 0; j < a.targets; j++) {
          if (!e || e.hp <= 0) break;
          hit.add(e.id);
          this.events.push({
            type: "arc",
            x: previous.x,
            y: previous.y,
            tx: e.x,
            ty: e.y,
          });
          this.hit(e, a.damage * (e.kind === "boss" ? a.big : 1), t, true);
          previous = e;
          e = s.enemies
            .filter((q) => q.hp > 0 && !hit.has(q.id) && dist(q, previous) < 90)
            .sort((x, y) => dist(x, previous) - dist(y, previous))[0];
        }
      } else {
        s.shots.push({
          kind: t.kind,
          owner: t.id,
          x: t.x,
          y: t.y,
          tx: e.x,
          ty: e.y,
          enemy: e.id,
          time: t.kind === "bomb" ? 0.34 : 0.12,
          total: t.kind === "bomb" ? 0.34 : 0.12,
          damage,
          radius: a.splash,
          burn: a.burn,
          duration: a.duration,
          ignore: a.ignore,
          breakArmor: a.breakArmor,
          poison: a.poison,
          poisonDuration: a.poisonDuration,
          poisonRadius: a.poisonRadius,
        });
      }
    }
    for (const e of s.enemies) {
      if (e.hp <= 0) continue;
      e.slowTime = Math.max(0, e.slowTime - STEP);
      e.broken = Math.max(0, e.broken - STEP);
      e.flash = Math.max(0, e.flash - STEP);
      if (!e.slowTime) e.slow = 0;
      const owner = s.towers.find((t) => t.id === e.slowOwner);
      if (owner) owner.slowed += STEP * e.slow;
      e.d += e.speed * (1 - e.slow) * STEP;
      Object.assign(e, onPath(e.d, this.paths[e.route || 0]));
      if (e.d >= pathLength(this.paths[e.route || 0])) {
        e.hp = 0;
        s.lives = Math.max(0, s.lives - FOES[e.kind].leak);
        s.leaks[e.kind] = (s.leaks[e.kind] || 0) + 1;
        this.events.push({ type: "leak", x: 625, y: 335 });
      }
    }
    s.enemies = s.enemies.filter((e) => e.hp > 0);
    if (s.lives <= 0) {
      s.phase = "lost";
      this.events.push({ type: "end" });
      return;
    }
    if (!s.queue.length && !s.enemies.length && !s.shots.length) {
      if (s.lastReward < s.wave) {
        s.gold += this.waveAt(s.wave - 1).reward;
        s.lastReward = s.wave;
      }
      s.fields = [];
      s.mines = [];
      s.phase = s.wave >= this.waveCount ? "won" : "ready";
      this.events.push({ type: s.phase });
    }
    this.events = this.events.slice(-180);
  }
  serialize() {
    return JSON.stringify(this.s);
  }
  static restore(raw) {
    try {
      let s = JSON.parse(raw);
      if (!s || (!s.stage && (s.mode !== undefined || s.allowed !== undefined)))
        return null;
      const g = new Game(s.seed, {
        stage: s.stage,
        mode: s.mode,
        allowed: s.allowed,
      });
      if (
        s.stage &&
        (!Array.isArray(s.allowed) ||
          !s.allowed.length ||
          s.allowed.length > 8 ||
          s.allowed.some((k) => !Object.hasOwn(TOWERS, k)))
      )
        return null;
      s.mines ??= [];
      if (!Array.isArray(s.mines) || s.mines.length > 48) return null;
      for (const m of s.mines) {
        if (
          !["x", "y", "damage", "radius", "life", "owner"].every((k) =>
            Number.isFinite(m[k]),
          ) ||
          m.damage < 0 ||
          m.radius <= 0 ||
          m.radius > 120 ||
          m.life <= 0 ||
          m.life > 45
        )
          return null;
      }

      if (
        s.v !== 1 ||
        !["ready", "battle", "won", "lost"].includes(s.phase) ||
        !Number.isInteger(s.wave) ||
        s.wave < 0 ||
        s.wave > (g.waveCount === Infinity ? 9999 : g.waveCount) ||
        !Number.isInteger(s.id) ||
        s.id < 1
      )
        return null;
      for (const key of [
        "gold",
        "lives",
        "time",
        "spell",
        "seed",
        "spawn",
        "kills",
        "lastReward",
      ])
        if (!Number.isFinite(s[key]) || s[key] < 0) return null;
      if (
        s.lives > 30 ||
        s.gold > 1e7 ||
        !Number.isInteger(s.seed) ||
        s.seed > 4294967295 ||
        !Number.isInteger(s.lastReward) ||
        s.lastReward > s.wave
      )
        return null;
      if (
        (s.phase === "battle" && s.wave < 1) ||
        (s.phase === "won" && s.wave !== g.waveCount)
      )
        return null;
      if (!s.leaks || typeof s.leaks !== "object" || Array.isArray(s.leaks))
        return null;
      for (const [kind, count] of Object.entries(s.leaks))
        if (!Object.hasOwn(FOES, kind) || !Number.isInteger(count) || count < 0)
          return null;
      for (let [k, max] of [
        ["towers", 24],
        ["enemies", 600],
        ["shots", 300],
        ["fields", 150],
        ["queue", 400],
      ])
        if (!Array.isArray(s[k]) || s[k].length > max) return null;
      if (s.towers.length > (g.scene?.maxTowers || 24)) return null;
      const ids = new Set();
      for (const t of s.towers) {
        if (
          !Object.hasOwn(TOWERS, t.kind) ||
          (s.stage && !s.allowed.includes(t.kind)) ||
          ![0, 1, 2, 3].includes(t.level) ||
          ![-1, 0, 1].includes(t.branch) ||
          !["first", "strong", "last"].includes(t.target)
        )
          return null;
        for (const k of [
          "x",
          "y",
          "cool",
          "spent",
          "damage",
          "kills",
          "angle",
          "id",
        ])
          if (!Number.isFinite(t[k])) return null;
        if (
          ids.has(t.id) ||
          !Number.isInteger(t.id) ||
          t.id < 1 ||
          t.id >= s.id ||
          (t.level === 0 ? t.branch !== -1 : t.branch < 0) ||
          t.x < 25 ||
          t.x > 615 ||
          t.y < 25 ||
          t.y > 375 ||
          !g.legal(t.x, t.y) ||
          t.spent < 0 ||
          t.damage < 0
        )
          return null;
        t.buffed ??= 0;
        t.splashHits ??= 0;
        t.slowed ??= 0;
        if (
          ![t.buffed, t.splashHits, t.slowed].every(
            (n) => Number.isFinite(n) && n >= 0,
          )
        )
          return null;
        g.s.towers.push(t);
        ids.add(t.id);
      }
      for (const e of s.enemies) {
        if (
          !Object.hasOwn(FOES, e.kind) ||
          !Number.isInteger(e.route ?? 0) ||
          !g.paths[e.route || 0]
        )
          return null;
        e.age ??= 0;
        e.poison ??= 0;
        e.poisonTime ??= 0;
        if (
          ![e.age, e.poison, e.poisonTime].every(
            (n) => Number.isFinite(n) && n >= 0,
          )
        )
          return null;
        if (
          e.pattern != null &&
          (!["shield", "summon", "frost", "heal", "final"].includes(
            e.pattern,
          ) ||
            e.kind !== "boss")
        )
          return null;
        for (const k of [
          "hp",
          "max",
          "d",
          "speed",
          "slow",
          "slowTime",
          "broken",
          "flash",
          "id",
          "x",
          "y",
        ])
          if (!Number.isFinite(e[k])) return null;
        if (
          ids.has(e.id) ||
          !Number.isInteger(e.id) ||
          e.id < 1 ||
          e.id >= s.id ||
          e.hp <= 0 ||
          e.max < e.hp ||
          e.d < 0 ||
          e.d >= pathLength(g.paths[e.route || 0]) ||
          e.speed <= 0 ||
          e.slow < 0 ||
          e.slow > 0.9
        )
          return null;
        ids.add(e.id);
      }
      for (const q of s.queue)
        if (
          !Object.hasOwn(FOES, q.kind) ||
          !Number.isInteger(q.route ?? 0) ||
          !g.paths[q.route || 0] ||
          !Number.isFinite(q.time) ||
          q.time < 0
        )
          return null;
      for (const p of s.shots) {
        if (!["dart", "bomb", "meteor", "venom"].includes(p.kind)) return null;
        for (const k of ["x", "y", "tx", "ty", "time", "total", "damage"])
          if (!Number.isFinite(p[k])) return null;
      }
      for (const f of s.fields)
        for (const k of ["x", "y", "radius", "life", "damage"])
          if (!Number.isFinite(f[k])) return null;

      g.s = s;
      return g;
    } catch {
      return null;
    }
  }
}
