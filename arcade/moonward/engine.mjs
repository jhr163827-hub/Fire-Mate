import { piercingLine } from "./evolution.mjs";
import { supported } from "./feedback.mjs";
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
  BOONS,
  boonCount,
  EVOLUTIONS,
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
      fields: [],
      nextId: 1,
      kills: 0,
      leaks: 0,
      summons: 0,
      randomSummons: 0,
      pity: 0,
      history: [],
      stats: { damage: {}, spent: 0, breaches: {} },
      result: null,
      boons: [],
      pendingBoon: 0,
      bossDefeated: false,
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
  evolve(id) {
    const s = this.s,
      u = s.units.find((v) => v.id === id),
      rule = EVOLUTIONS[u?.kind];
    if (
      !this.active() ||
      s.pendingBoon ||
      !u ||
      !rule ||
      u.tier !== 3 ||
      u.evolved ||
      s.gold < rule.cost
    )
      return false;
    s.gold -= rule.cost;
    s.stats.spent += rule.cost;
    u.evolved = true;
    this.emit("evolve", { pad: u.pad, kind: u.kind });
    return true;
  }
  sell(id) {
    let s = this.s,
      u = s.units.find((u) => u.id === id);
    if (!u || !this.active()) return false;
    s.gold += Math.floor(30 * 2 ** (u.tier - 1));
    s.units = s.units.filter((x) => x !== u);
    s.fields = s.fields.filter((f) => f.owner !== id);
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
    if (s.pendingBoon || s.result) return false;
    s.bossDefeated = false;
    s.wave++;
    s.phase = "battle";
    s.waveTime = 0;
    s.spawned = 0;
    s.spawnIn = 0;
    this.emit("wave", { wave: s.wave, boss: waveSpec(s.wave).boss });
  }
  chooseBoon(key) {
    const s = this.s;
    if (
      !Object.hasOwn(BOONS, key) ||
      ![6, 12].includes(s.pendingBoon) ||
      s.phase !== "rest" ||
      s.result ||
      s.pendingBoon !== s.wave ||
      s.boons.some((b) => b.wave === s.pendingBoon)
    )
      return false;
    s.boons.push({ wave: s.pendingBoon, key });
    s.pendingBoon = 0;
    if (BOONS[key].gold) s.gold += BOONS[key].gold;
    if (BOONS[key].heal)
      s.lives = Math.min(RULES.lives, s.lives + BOONS[key].heal);
    this.emit("boonChosen", { key });
    return true;
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
    if (kind === "archer" && e.slow > 0)
      damage *= 1 + boonCount(this.s, "hunt") * BOONS.hunt.damageBonus;
    if (kind === "archer" && (e.kind === "beetle" || e.boss)) damage *= 0.6;
    const actual = Math.min(e.hp, damage);
    e.hp -= damage;
    this.s.stats.damage[kind] = (this.s.stats.damage[kind] || 0) + actual;
  }
  step() {
    let s = this.s,
      dt = RULES.step;
    if (!this.active() || s.phase === "ready" || s.pendingBoon) return;
    s.tick++;
    if (s.phase === "rest") {
      s.wait -= dt;
      if (s.wait <= 0) this.nextWave();
      return;
    }
    // One strongest field contribution per enemy; duration uses fixed simulation steps.
    for (const e of s.enemies) {
      const p = pointAt(e.d);
      let damage = 0;
      for (const f of s.fields) {
        if (Math.hypot(p.x - f.x, p.y - f.y) <= EVOLUTIONS.ember.radius)
          damage = Math.max(
            damage,
            EVOLUTIONS.ember.dps * Math.min(dt, f.life),
          );
      }
      if (damage) this.hit(e, damage, "ember");
    }
    s.fields = s.fields
      .map((f) => ({ ...f, life: f.life - dt }))
      .filter((f) => f.life > 0);
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
      const line =
        u.evolved && u.kind === "archer" ? piercingLine(u, targets) : null;
      let e = line ? line.hits[0] : targets[0];
      if (!e) continue;
      let scale = tierScale(u.tier),
        boost = supported(s.units, u);
      u.cd = type.interval / (boost ? 1.25 : 1);
      this.hit(e, type.damage * scale, u.kind);
      let p = pointAt(e.d);
      if (line) {
        for (const other of line.hits.slice(1))
          this.hit(
            other,
            type.damage * scale * EVOLUTIONS.archer.secondary,
            u.kind,
          );
      }
      if (u.evolved && u.kind === "ember") {
        s.fields = s.fields.filter((f) => f.owner !== u.id);
        s.fields.push({
          owner: u.id,
          x: p.x,
          y: p.y,
          life: EVOLUTIONS.ember.duration,
        });
      }
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
        const stacks = boonCount(s, "venom");
        const poisonDamage =
          type.poison * scale * (1 + stacks * BOONS.venom.poisonBonus);
        e.dot = e.poison > 0 ? Math.max(e.dot, poisonDamage) : poisonDamage;
        e.poison = 4 + stacks * BOONS.venom.duration;
        e.source = u.id;
      }
      this.emit("shot", {
        x,
        y,
        tx: line ? line.tx : p.x,
        ty: line ? line.ty : p.y,
        kind: u.kind,
        tier: u.tier,
        evolved: !!u.evolved,
      });
    }
    let alive = [];
    for (let e of s.enemies) {
      if (e.hp <= 0) {
        if (e.boss) s.bossDefeated = true;
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
        s.stats.breaches ??= {};
        const record = (s.stats.breaches[e.kind] ??= {
          count: 0,
          loss: 0,
          health: 0,
        });
        record.count++;
        record.loss += loss;
        record.health += Math.min(1, e.hp / e.max);
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
      s.fields = [];
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
        if (
          [6, 12].includes(s.wave) &&
          s.bossDefeated &&
          !s.boons.some((b) => b.wave === s.wave)
        ) {
          s.pendingBoon = s.wave;
          this.emit("boonOffer", { wave: s.wave });
        }
      }
    }
  }
  finish(win) {
    this.s.fields = [];
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
          (u.evolved !== undefined && typeof u.evolved !== "boolean") ||
          (u.evolved && (!Object.hasOwn(EVOLUTIONS, u.kind) || u.tier !== 3)) ||
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
      if (s.stats.breaches !== undefined) {
        if (
          !s.stats.breaches ||
          typeof s.stats.breaches !== "object" ||
          Array.isArray(s.stats.breaches)
        )
          return null;
        for (const [kind, record] of Object.entries(s.stats.breaches)) {
          if (
            !["boss", "wolf", "beetle", "wisp"].includes(kind) ||
            !record ||
            !Number.isInteger(record.count) ||
            !finite(record.count, 1) ||
            !finite(record.loss, 1) ||
            !finite(record.health, 0, record.count) ||
            record.loss !== record.count * (kind === "boss" ? 5 : 1)
          )
            return null;
        }
      }
      // Missing fields belong to pre-blessing saves; never grant retrospective rewards.
      if (s.boons === undefined) s.boons = [];
      if (s.pendingBoon === undefined) s.pendingBoon = 0;
      if (s.bossDefeated === undefined) s.bossDefeated = false;
      if (
        !Array.isArray(s.boons) ||
        s.boons.length > 2 ||
        typeof s.bossDefeated !== "boolean" ||
        ![0, 6, 12].includes(s.pendingBoon)
      )
        return null;
      const awarded = new Set();
      for (const b of s.boons) {
        if (
          !b ||
          ![6, 12].includes(b.wave) ||
          b.wave > s.wave ||
          !Object.hasOwn(BOONS, b.key) ||
          awarded.has(b.wave) ||
          !s.history.some((h) => h.wave === b.wave)
        )
          return null;
        awarded.add(b.wave);
      }
      if (
        s.pendingBoon &&
        (s.phase !== "rest" ||
          s.pendingBoon !== s.wave ||
          !s.bossDefeated ||
          awarded.has(s.pendingBoon) ||
          !s.history.some((h) => h.wave === s.pendingBoon))
      )
        return null;
      if (s.fields === undefined) s.fields = [];
      if (
        !Array.isArray(s.fields) ||
        s.fields.length > PADS.length ||
        (s.phase !== "battle" && s.fields.length)
      )
        return null;
      const owners = new Set();
      for (const f of s.fields) {
        if (
          !f ||
          !finite(f.x, -20, 360) ||
          !finite(f.y, 0, 468) ||
          !finite(f.life, 0, EVOLUTIONS.ember.duration) ||
          owners.has(f.owner) ||
          !s.units.some(
            (u) => u.id === f.owner && u.kind === "ember" && u.evolved,
          )
        )
          return null;
        owners.add(f.owner);
      }
      let g = new Game();
      g.s = s;
      return g;
    } catch {
      return null;
    }
  }
}
