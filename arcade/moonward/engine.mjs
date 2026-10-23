import {
  RULES,
  TYPES,
  KEYS,
  PADS,
  LENGTH,
  pointAt,
  waveSpec,
  tierScale,
  VERSION,
} from "./data.mjs";
export class Game {
  constructor(seed = Date.now()) {
    this.s = {
      version: VERSION,
      seed: seed >>> 0 || 1,
      tick: 0,
      gold: RULES.startGold,
      lives: RULES.lives,
      wave: 0,
      phase: "ready",
      wait: 0,
      waveTime: 0,
      spawned: 0,
      spawnIn: 0,
      units: [],
      enemies: [],
      nextId: 1,
      kills: 0,
      leaks: 0,
      summons: 0,
      randomSummons: 0,
      pity: 0,
      history: [],
      stats: { damage: {}, spent: 0 },
      result: null,
    };
    this.events = [];
  }
  rand() {
    let x = this.s.seed;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.s.seed = x >>> 0;
    return this.s.seed / 4294967296;
  }
  emit(type, data = {}) {
    this.events.push({ type, ...data });
    if (this.events.length > 120) this.events.shift();
  }
  drain() {
    return this.events.splice(0);
  }
  active() {
    return !this.s.result;
  }
  summon(pad, choice) {
    const s = this.s,
      cost = choice ? RULES.choice : RULES.summon;
    if (
      !this.active() ||
      !Number.isInteger(pad) ||
      pad < 0 ||
      pad >= PADS.length ||
      s.units.some((u) => u.pad === pad) ||
      s.gold < cost ||
      (choice && !TYPES[choice])
    )
      return false;
    let kind = choice || KEYS[Math.floor(this.rand() * KEYS.length)]; // first random is an attacker; every fourth offers missing role
    if (!choice && s.randomSummons === 0) kind = "archer";
    if (!choice && s.randomSummons % 4 === 3) {
      const missing = KEYS.filter((k) => !s.units.some((u) => u.kind === k));
      if (missing.length)
        kind = missing[Math.floor(this.rand() * missing.length)];
    }
    let tier = 1;
    if (!choice) {
      s.pity++;
      if (s.randomSummons > 0 && (this.rand() < 0.04 || s.pity >= 12)) {
        tier = 2;
        s.pity = 0;
      }
    }
    const u = { id: s.nextId++, kind, pad, tier, cd: 0, kills: 0 };
    s.units.push(u);
    s.gold -= cost;
    s.stats.spent += cost;
    s.summons++;
    if (!choice) s.randomSummons++;
    this.emit("summon", { pad, kind, tier });
    return u;
  }
  move(id, pad) {
    let u = this.s.units.find((u) => u.id === id);
    if (
      !this.active() ||
      !u ||
      !Number.isInteger(pad) ||
      pad < 0 ||
      pad >= PADS.length
    )
      return false;
    let other = this.s.units.find((u) => u.pad === pad);
    if (other) other.pad = u.pad;
    u.pad = pad;
    return true;
  }
  merge(a, b) {
    let s = this.s,
      u = s.units.find((u) => u.id === a),
      v = s.units.find((u) => u.id === b);
    if (
      !this.active() ||
      !u ||
      !v ||
      u === v ||
      u.kind !== v.kind ||
      u.tier !== v.tier ||
      u.tier >= 3 ||
      s.gold < RULES.mergeCost
    )
      return false;
    u.tier++;
    u.cd = 0;
    u.kills += v.kills;
    s.units = s.units.filter((x) => x !== v);
    s.gold -= RULES.mergeCost;
    s.stats.spent += RULES.mergeCost;
    this.emit("merge", { pad: u.pad, kind: u.kind });
    return true;
  }
  sell(id) {
    let s = this.s,
      u = s.units.find((u) => u.id === id);
    if (!u || !this.active()) return false;
    s.gold += Math.floor(30 * 2 ** (u.tier - 1));
    s.units = s.units.filter((x) => x !== u);
    return true;
  }
  start() {
    if (this.s.phase !== "ready" || !this.active() || !this.s.units.length)
      return false;
    this.nextWave();
    return true;
  }
  nextWave() {
    let s = this.s;
    s.wave++;
    s.phase = "battle";
    s.waveTime = 0;
    s.spawned = 0;
    s.spawnIn = 0;
    this.emit("wave", { wave: s.wave, boss: waveSpec(s.wave).boss });
  }
  spawn() {
    let s = this.s,
      w = waveSpec(s.wave),
      boss = w.boss && s.spawned === w.count - 1,
      fast = !boss && s.wave % 3 === 0 && s.spawned % 3 === 0,
      tank = !boss && s.wave % 3 === 2 && s.spawned % 4 === 0;
    let hp = boss ? w.bossHP : w.hp * (tank ? 1.7 : fast ? 0.72 : 1);
    s.enemies.push({
      id: s.nextId++,
      d: 0,
      hp,
      max: hp,
      speed: w.speed * (boss ? 0.65 : fast ? 1.5 : tank ? 0.78 : 1),
      kind: boss ? "boss" : tank ? "beetle" : fast ? "wolf" : "wisp",
      slow: 0,
      poison: 0,
      dot: 0,
      source: 0,
      boss,
    });
    s.spawned++;
  }
  hit(e, damage, kind) {
    if (e.hp <= 0) return;
    if (kind === "archer" && (e.kind === "beetle" || e.boss)) damage *= 0.6;
    e.hp -= damage;
    this.s.stats.damage[kind] = (this.s.stats.damage[kind] || 0) + damage;
  }
  step() {
    let s = this.s,
      dt = RULES.step;
    if (!this.active() || s.phase === "ready") return;
    s.tick++;
    if (s.phase === "rest") {
      s.wait -= dt;
      if (s.wait <= 0) this.nextWave();
      return;
    }
    s.waveTime += dt;
    let w = waveSpec(s.wave);
    s.spawnIn -= dt;
    if (s.spawned < w.count && s.spawnIn <= 0) {
      this.spawn();
      s.spawnIn += w.spacing;
    }
    for (let e of s.enemies) {
      if (e.poison > 0) {
        this.hit(e, e.dot * dt, "thorn");
        e.poison = Math.max(0, e.poison - dt);
      }
      e.slow = Math.max(0, e.slow - dt);
    }
    for (let u of s.units) {
      u.cd = Math.max(0, u.cd - dt);
      if (u.cd > 0) continue;
      let type = TYPES[u.kind],
        [x, y] = PADS[u.pad];
      let targets = s.enemies.filter(
        (e) =>
          e.hp > 0 &&
          Math.hypot(pointAt(e.d).x - x, pointAt(e.d).y - y) <= type.range,
      );
      targets.sort((a, b) =>
        u.kind === "thorn"
          ? Number(a.poison > 0) - Number(b.poison > 0) || b.max - a.max
          : u.kind === "frost"
            ? Number(a.slow > 0) - Number(b.slow > 0) || b.d - a.d
            : b.d - a.d,
      );
      let e = targets[0];
      if (!e) continue;
      let scale = tierScale(u.tier),
        boost = s.units.some(
          (v) =>
            v.id !== u.id &&
            v.kind === "bell" &&
            Math.hypot(PADS[v.pad][0] - x, PADS[v.pad][1] - y) <=
              TYPES.bell.aura,
        );
      u.cd = type.interval / (boost ? 1.25 : 1);
      this.hit(e, type.damage * scale, u.kind);
      let p = pointAt(e.d);
      if (type.splash)
        for (let other of s.enemies) {
          if (
            other !== e &&
            other.hp > 0 &&
            Math.hypot(pointAt(other.d).x - p.x, pointAt(other.d).y - p.y) <=
              type.splash
          )
            this.hit(other, type.damage * scale, u.kind);
        }
      if (type.slow) e.slow = 3;
      if (type.poison) {
        e.dot =
          e.poison > 0
            ? Math.max(e.dot, type.poison * scale)
            : type.poison * scale;
        e.poison = 4;
        e.source = u.id;
      }
      this.emit("shot", { x, y, tx: p.x, ty: p.y, kind: u.kind, tier: u.tier });
    }
    let alive = [];
    for (let e of s.enemies) {
      if (e.hp <= 0) {
        s.gold += e.boss ? 55 : 5;
        s.kills++;
        this.emit("death", { ...pointAt(e.d), kind: e.kind });
        continue;
      }
      e.d += e.speed * dt * (e.slow > 0 ? (e.boss ? 0.76 : 0.52) : 1);
      if (e.d >= LENGTH) {
        let loss = e.boss ? 5 : 1;
        s.lives -= loss;
        s.leaks += loss;
        this.emit("leak", { loss });
      } else alive.push(e);
    }
    s.enemies = alive;
    if (s.lives <= 0) {
      s.lives = 0;
      this.finish(false);
      return;
    }
    if (
      s.spawned === w.count &&
      !s.enemies.length &&
      s.waveTime >= RULES.minWaveTime
    ) {
      s.gold += w.reward;
      s.history.push({
        wave: s.wave,
        lives: s.lives,
        gold: s.gold,
        seconds: Math.round(s.waveTime),
      });
      this.emit("clear", { reward: w.reward });
      if (s.wave >= RULES.waves) this.finish(true);
      else {
        s.phase = "rest";
        s.wait = RULES.intermission;
      }
    }
  }
  finish(win) {
    this.s.phase = "ended";
    this.s.result = {
      win,
      wave: this.s.wave,
      kills: this.s.kills,
      seconds: Math.round(this.s.tick * RULES.step),
    };
    this.emit("result", this.s.result);
  }
  serialize() {
    return JSON.stringify(this.s);
  }
  static restore(raw) {
    try {
      let s = JSON.parse(raw);
      if (
        !s ||
        s.version !== VERSION ||
        !Number.isInteger(s.seed) ||
        s.seed < 0 ||
        !Number.isInteger(s.wave) ||
        s.wave < 0 ||
        s.wave > 18 ||
        !["ready", "battle", "rest", "ended"].includes(s.phase) ||
        !Array.isArray(s.units) ||
        s.units.length > PADS.length ||
        !Array.isArray(s.enemies) ||
        s.enemies.length > 100 ||
        !Array.isArray(s.history) ||
        !s.stats ||
        typeof s.stats.damage !== "object"
      )
        return null;
      const finite = (n, min = 0, max = 1e9) =>
        typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;
      for (let k of [
        "tick",
        "gold",
        "lives",
        "wait",
        "waveTime",
        "spawned",
        "spawnIn",
        "nextId",
        "kills",
        "leaks",
        "summons",
        "randomSummons",
        "pity",
      ])
        if (!finite(s[k], k === "wait" || k === "spawnIn" ? -100 : 0))
          return null;
      if (
        s.lives > 20 ||
        (s.phase === "battle" && s.wave === 0) ||
        (s.result && s.phase !== "ended") ||
        (s.phase === "ended" && !s.result)
      )
        return null;
      if (
        s.result &&
        (typeof s.result.win !== "boolean" ||
          s.result.wave !== s.wave ||
          !finite(s.result.kills) ||
          !finite(s.result.seconds))
      )
        return null;
      let pads = new Set(),
        ids = new Set();
      for (let u of s.units) {
        if (
          !TYPES[u.kind] ||
          !Number.isInteger(u.pad) ||
          u.pad < 0 ||
          u.pad >= PADS.length ||
          pads.has(u.pad) ||
          ![1, 2, 3].includes(u.tier) ||
          !finite(u.cd, -100) ||
          !finite(u.id) ||
          ids.has(u.id) ||
          !Number.isInteger(u.id) ||
          u.id < 1 ||
          u.id >= s.nextId
        )
          return null;
        pads.add(u.pad);
        ids.add(u.id);
      }
      for (let e of s.enemies) {
        if (
          !["boss", "beetle", "wolf", "wisp"].includes(e.kind) ||
          !finite(e.hp) ||
          !finite(e.max, 1) ||
          !finite(e.d, 0, LENGTH) ||
          !finite(e.speed, 1, 200) ||
          !finite(e.slow) ||
          !finite(e.poison) ||
          !finite(e.dot) ||
          !finite(e.id) ||
          ids.has(e.id) ||
          !Number.isInteger(e.id) ||
          e.id < 1 ||
          e.id >= s.nextId
        )
          return null;
        ids.add(e.id);
      }
      if (s.spawned > (s.wave ? waveSpec(s.wave).count : 0)) return null;
      let g = new Game();
      g.s = s;
      return g;
    } catch {
      return null;
    }
  }
}
