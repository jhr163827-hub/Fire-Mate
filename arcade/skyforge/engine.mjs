import { W, H, STEP, SHIPS, SKILLS, FOES, stageFor } from "./data.mjs";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
  distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export class Game {
  constructor({
    stage = 1,
    ship = "swift",
    hard = false,
    mods = {},
    seed = stage * 107,
  } = {}) {
    this.scene = stageFor(stage, hard);
    const craft = SHIPS.find((s) => s.id === ship);
    if (!craft) throw Error("invalid ship");
    this.s = {
      v: 1,
      stage,
      ship,
      hard,
      seed: seed >>> 0,
      phase: "battle",
      time: 0,
      x: 180,
      y: 490,
      hp: craft.hp + (mods.hull || 0) * 12,
      maxHp: craft.hp + (mods.hull || 0) * 12,
      mods: {
        power: mods.power || 0,
        hull: mods.hull || 0,
        magnet: mods.magnet || 0,
      },
      inv: 1.5,
      skills: Object.fromEntries(Object.keys(SKILLS).map((k) => [k, 0])),
      cool: {
        gun: 0,
        laser: 1,
        missile: 1,
        drone: 0,
        orbit: 0,
        arc: 1,
        frost: 1,
        shield: 0,
      },
      shield: 0,
      pulse: 2,
      pulseKills: 0,
      shots: [],
      bullets: [],
      enemies: [],
      drops: [],
      hazards: [],
      choices: [],
      xp: 0,
      level: 0,
      nextXp: 30,
      kills: 0,
      hits: 0,
      damage: 0,
      spawn: 1.2,
      bossSpawned: false,
      bossDead: false,
      id: 1,
      escaped: 0,
    };
    this.events = [];
    this.target = { x: 180, y: 490 };
  }
  rand() {
    let s = this.s;
    s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
    return s.seed / 4294967296;
  }
  fx(type, x, y, extra = {}) {
    this.events.push({ type, x, y, ...extra });
  }
  spawn(kind, x, y = -30, extra = {}) {
    const f = FOES[kind],
      e = {
        id: this.s.id++,
        kind,
        x,
        y,
        hp: f.hp * this.scene.hpScale,
        max: f.hp * this.scene.hpScale,
        r: f.r,
        age: 0,
        baseX: x,
        shoot: 1.5 + this.rand(),
        flash: 0,
        slow: 0,
        orb: 0,
        ...extra,
      };
    if (kind === "boss") {
      e.hp = e.max = (1400 + this.s.stage * 100) * this.scene.hpScale;
      e.y = -65;
      e.shoot = 2.4;
    }
    this.s.enemies.push(e);
    return e;
  }
  formation() {
    const s = this.s,
      t = s.time / this.scene.duration,
      hard = this.scene.hard,
      n = 3 + Math.floor((s.stage - 1) / 4);
    const mode = Math.floor(s.time / 12 + s.stage) % 4;
    if (mode === 0)
      for (let i = 0; i < n + 1; i++)
        this.spawn("scout", 45 + i * (270 / n), -25 - i * 16, { wave: true });
    if (mode === 1)
      for (let i = 0; i < n; i++)
        this.spawn("dart", s.id % 2 ? 45 : 315, -25 - i * 35, {
          vx: s.id % 2 ? 25 : -25,
        });
    if (mode === 2) {
      this.spawn("gunner", 70);
      this.spawn("gunner", 290);
      if (t > 0.45) this.spawn("scout", 180, -70);
    }
    if (mode === 3) {
      this.spawn(t > 0.35 ? "carrier" : "gunner", 80 + this.rand() * 200);
      if (t > 0.6 || hard) {
        this.spawn("dart", 40, -75);
        this.spawn("dart", 320, -75);
      }
    }
  }
  enemyBullet(x, y, angle, speed = 100, r = 4) {
    if (this.s.bullets.length >= 280) return;
    this.s.bullets.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r,
      life: 10,
      slow: 0,
    });
  }
  aim(e) {
    return Math.atan2(this.s.y - e.y, this.s.x - e.x);
  }
  bossAttack(e) {
    const s = this.s,
      a = this.aim(e),
      p = this.scene.pattern;
    if (p === 0) {
      for (let i = -3; i <= 3; i++)
        this.enemyBullet(e.x, e.y + 25, a + i * 0.19, 105 + this.s.stage * 2);
      if (e.hp < e.max * 0.5)
        for (let i = -2; i <= 2; i++)
          this.enemyBullet(e.x, e.y + 25, Math.PI / 2 + i * 0.33, 85);
      e.shoot = 1.6;
    }
    if (p === 1) {
      const x = clamp(s.x, 32, W - 32);
      s.hazards.push({ x, y: 0, w: 30, life: 1.55, warning: 0.5 });
      for (const side of [-1, 1])
        for (let i = -1; i <= 1; i++)
          this.enemyBullet(
            e.x + side * 30,
            e.y + 18,
            Math.PI / 2 + i * 0.3,
            95,
          );
      e.shoot = 2.8;
    }
    if (p === 2) {
      const gap = (e.age * 0.4) % 6.28;
      for (let i = 0; i < 16; i++) {
        const angle = (i * Math.PI) / 8;
        if (
          Math.abs(Math.atan2(Math.sin(angle - gap), Math.cos(angle - gap))) <
          0.5
        )
          continue;
        this.enemyBullet(e.x, e.y, angle, 85 + this.s.stage * 2);
      }
      e.shoot = 2.2;
    }
    if (
      e.hp < e.max * 0.45 &&
      Math.floor(e.age) % 9 < 3 &&
      s.enemies.length < 12
    ) {
      this.spawn("scout", 45, -20);
      this.spawn("scout", 315, -20);
    }
    this.fx("muzzle", e.x, e.y + 25, { hostile: true });
  }
  fire(x, y, angle, damage, kind = "gun", extra = {}) {
    if (this.s.shots.length >= 220) return;
    this.s.shots.push({
      x,
      y,
      vx: Math.cos(angle) * 440,
      vy: Math.sin(angle) * 440,
      damage,
      kind,
      r: kind === "missile" ? 7 : 4,
      life: 2.5,
      ...extra,
    });
  }
  hit(e, n, source = "weapon") {
    if (e.hp <= 0 || this.s.phase === "lost") return;
    const dealt = Math.min(
      e.hp,
      n * (e.kind === "boss" && e.age >= 35 ? 3 : 1),
    );
    e.hp -= dealt;
    e.flash = 0.09;
    this.s.damage += dealt;
    if (e.hp <= 0) {
      this.s.kills++;
      this.s.pulseKills++;
      if (this.s.pulseKills >= 45) {
        this.s.pulse = Math.min(3, this.s.pulse + 1);
        this.s.pulseKills -= 45;
      }
      this.fx("explode", e.x, e.y, {
        big: e.kind === "boss" || e.kind === "carrier",
      });
      if (e.kind === "boss") {
        this.s.bossDead = true;
        this.s.bullets = [];
        this.s.hazards = [];
        this.s.phase = "won";
        this.fx("victory", e.x, e.y);
      } else {
        this.s.drops.push({
          x: e.x,
          y: e.y,
          value: FOES[e.kind].cash,
          kind: this.rand() < 0.035 ? "heal" : "xp",
          life: 18,
        });
      }
    }
  }
  hurt(amount) {
    const s = this.s;
    if (s.phase !== "battle" || s.inv > 0) return;
    if (s.shield > 0) {
      s.shield--;
      s.inv = 0.7;
      this.fx("shield", s.x, s.y);
      return;
    }
    s.hp = Math.max(0, s.hp - amount * this.scene.damageScale);
    s.hits++;
    s.inv = 1;
    this.fx("hurt", s.x, s.y);
    if (s.hp <= 0) {
      s.phase = "lost";
      this.fx("defeat", s.x, s.y);
    }
  }
  pulse() {
    const s = this.s;
    if (s.phase !== "battle" || !s.pulse) return false;
    s.pulse--;
    s.inv = 1.2;
    s.bullets = [];
    s.hazards = [];
    for (const e of [...s.enemies])
      this.hit(e, e.kind === "boss" ? 160 : 110, "pulse");
    this.fx("pulse", s.x, s.y);
    return true;
  }
  offer() {
    const s = this.s,
      pool = Object.keys(SKILLS).filter((k) => s.skills[k] < 6);
    if (!pool.length) {
      s.hp = Math.min(s.maxHp, s.hp + 12);
      return;
    }
    const picked = [],
      count = Math.min(3, pool.length);
    while (picked.length < count) {
      const i = Math.floor(this.rand() * pool.length);
      picked.push(pool.splice(i, 1)[0]);
    }
    // Always offer one owned weapon so a build can progress despite unlucky draws.
    const owned = Object.keys(SKILLS).filter(
      (k) => s.skills[k] > 0 && s.skills[k] < 6,
    );
    if (owned.length && !picked.some((k) => owned.includes(k)))
      picked[0] = owned[Math.floor(this.rand() * owned.length)];
    s.choices = picked;
    s.phase = "choice";
  }
  choose(key) {
    const s = this.s;
    if (s.phase !== "choice" || !s.choices.includes(key)) return false;
    s.skills[key]++;
    if (key === "shield") s.shield = s.skills.shield === 6 ? 2 : 1;
    s.choices = [];
    s.phase = "battle";
    s.inv = Math.max(s.inv, 0.6);
    this.fx(s.skills[key] % 3 === 0 ? "evolve" : "upgrade", s.x, s.y, { key });
    return true;
  }
  weapons() {
    const s = this.s,
      ship = SHIPS.find((c) => c.id === s.ship),
      lv = s.skills;
    for (const k of Object.keys(s.cool)) s.cool[k] -= STEP;
    const near = s.enemies
      .filter((e) => e.hp > 0)
      .sort((a, b) => distance(s, a) - distance(s, b));
    if (s.cool.gun <= 0) {
      s.cool.gun = ship.rate * (lv.volley >= 4 ? 0.85 : 1);
      const count =
        lv.volley >= 6
          ? 7
          : lv.volley >= 3
            ? 5
            : lv.volley
              ? 3
              : s.ship === "manta"
                ? 2
                : 1;
      for (let i = 0; i < count; i++)
        this.fire(
          s.x,
          s.y - 20,
          -Math.PI / 2 + (i - (count - 1) / 2) * 0.1,
          8 *
            ship.power *
            (1 + s.mods.power * 0.1) *
            (lv.volley >= 5 ? 1.7 : lv.volley >= 2 ? 1.25 : 1),
        );
      this.fx("muzzle", s.x, s.y - 22);
    }
    if (lv.laser && s.cool.laser <= 0) {
      s.cool.laser = lv.laser >= 4 ? 2.25 : 3;
      const n = lv.laser >= 6 ? 5 : lv.laser >= 3 ? 3 : 1;
      for (let i = 0; i < n; i++) {
        const x = s.x + (i - (n - 1) / 2) * 27;
        for (const e of s.enemies)
          if (e.y < s.y && Math.abs(e.x - x) < e.r + 7)
            this.hit(e, lv.laser >= 5 ? 64.8 : lv.laser >= 2 ? 40.5 : 27);
        this.fx("laser", x, s.y, { to: 0 });
      }
    }
    if (lv.missile && s.cool.missile <= 0 && near.length) {
      s.cool.missile = 2;
      const n =
        lv.missile >= 6 ? 5 : lv.missile >= 4 ? 3 : lv.missile >= 2 ? 2 : 1;
      const target = [...near].sort((a, b) => b.hp - a.hp)[0];
      for (let i = 0; i < n; i++)
        this.fire(
          s.x + (i - (n - 1) / 2) * 14,
          s.y,
          -Math.PI / 2,
          lv.missile >= 5 ? 48 : 30,
          "missile",
          { target: target.id, radius: lv.missile >= 3 ? 55 : 0 },
        );
    }
    if (lv.drone && s.cool.drone <= 0 && near.length) {
      s.cool.drone = lv.drone >= 4 ? 0.3 : 0.4;
      const n = lv.drone >= 6 ? 4 : lv.drone >= 3 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const x = s.x + (i - (n - 1) / 2) * 34,
          y = s.y + 12;
        this.fire(
          x,
          y,
          Math.atan2(near[0].y - y, near[0].x - x),
          lv.drone >= 5 ? 18 : lv.drone >= 2 ? 12 : 8,
          "drone",
        );
      }
    }
    if (lv.orbit) {
      const n = lv.orbit >= 6 ? 6 : lv.orbit >= 3 ? 4 : 2,
        r = lv.orbit >= 4 ? 65 : 45;
      for (let i = 0; i < n; i++) {
        const a = s.time * 2.7 + (i * Math.PI * 2) / n,
          p = { x: s.x + Math.cos(a) * r, y: s.y + Math.sin(a) * r };
        for (const e of near)
          if (e.orb <= 0 && distance(p, e) < e.r + 10) {
            this.hit(e, lv.orbit >= 5 ? 52.8 : lv.orbit >= 2 ? 33 : 22);
            e.orb = 0.25;
          }
        if (lv.orbit >= 6)
          for (const b of s.bullets) if (distance(p, b) < 13) b.life = 0;
      }
    }
    if (lv.arc && s.cool.arc <= 0 && near.length) {
      s.cool.arc = lv.arc >= 4 ? 1.65 : 2.2;
      let prev = { x: s.x, y: s.y };
      for (const e of near.slice(0, lv.arc >= 6 ? 10 : lv.arc >= 3 ? 6 : 3)) {
        this.hit(
          e,
          (lv.arc >= 5 ? 38.4 : lv.arc >= 2 ? 24 : 16) *
            (lv.arc === 6 && e.kind === "boss" ? 1.6 : 1),
        );
        this.fx("arc", prev.x, prev.y, { tx: e.x, ty: e.y });
        prev = e;
      }
    }
    if (lv.frost && s.cool.frost <= 0) {
      s.cool.frost = lv.frost >= 4 ? 3 : 4;
      const r = lv.frost >= 6 ? 800 : lv.frost >= 2 ? 170 : 140;
      for (const e of near)
        if (distance(s, e) < r) {
          e.slow = 2.5;
          this.hit(e, lv.frost >= 5 ? 35 : 22);
        }
      if (lv.frost >= 3)
        for (const b of s.bullets) if (distance(s, b) < r) b.slow = 2;
      this.fx("frost", s.x, s.y, { radius: Math.min(r, 350) });
    }
    if (lv.shield && s.cool.shield <= 0) {
      s.cool.shield = lv.shield >= 4 ? 8 : lv.shield >= 2 ? 10 : 12;
      s.shield = lv.shield >= 6 ? 2 : 1;
      if (lv.shield >= 3)
        for (const b of s.bullets) if (distance(s, b) < 100) b.life = 0;
      this.fx("shield", s.x, s.y);
    }
  }
  step(input = {}) {
    const s = this.s;
    if (s.phase !== "battle") return;
    s.time += STEP;
    s.inv = Math.max(0, s.inv - STEP);
    if (Number.isFinite(input.x) && Number.isFinite(input.y))
      this.target = {
        x: clamp(input.x, 16, W - 16),
        y: clamp(input.y, 40, H - 25),
      };
    const dx = this.target.x - s.x,
      dy = this.target.y - s.y,
      d = Math.hypot(dx, dy),
      speed = 420 * STEP;
    if (d > 0) {
      s.x += dx * Math.min(1, speed / d);
      s.y += dy * Math.min(1, speed / d);
    }
    s.spawn -= STEP;
    if (s.time < this.scene.duration && s.spawn <= 0) {
      this.formation();
      s.spawn = Math.max(
        2.1,
        4.1 - s.stage * 0.09 - (s.time / this.scene.duration) * 0.9,
      );
    }
    if (!s.bossSpawned && s.time >= this.scene.duration) {
      s.bossSpawned = true;
      this.spawn("boss", W / 2);
      s.bullets = [];
      this.fx("boss", W / 2, 90);
    }
    for (const e of s.enemies) {
      const oldAge = e.age;
      e.age += STEP;
      if (e.kind === "boss" && oldAge < 35 && e.age >= 35)
        this.fx("overheat", e.x, e.y);
      e.flash = Math.max(0, e.flash - STEP);
      e.slow = Math.max(0, e.slow - STEP);
      e.orb = Math.max(0, e.orb - STEP);
      const slow = e.slow > 0 ? 0.55 : 1;
      if (e.kind === "boss") {
        e.y += Math.min(70 - e.y, 40 * STEP);
        e.x = W / 2 + Math.sin(e.age * 0.65) * 88;
        if (e.y >= 65) {
          e.shoot -= STEP * slow;
          if (e.shoot <= 0) this.bossAttack(e);
        }
      } else {
        e.y += FOES[e.kind].speed * STEP * slow;
        if (e.wave) e.x = e.baseX + Math.sin(e.age * 1.8) * 25;
        if (e.vx) e.x = clamp(e.x + e.vx * STEP, 20, W - 20);
        if (FOES[e.kind].shot && e.y > 0 && e.y < H - 100) {
          e.shoot -= STEP * slow;
          if (e.shoot < 0.55 && !e.warned) {
            e.warned = true;
            this.fx("aim", e.x, e.y, { tx: s.x, ty: s.y });
          }
          if (e.shoot <= 0) {
            e.warned = false;
            e.shoot = FOES[e.kind].shot;
            const a = this.aim(e);
            for (
              let j = -(e.kind === "carrier" ? 1 : 0);
              j <= (e.kind === "carrier" ? 1 : 0);
              j++
            )
              this.enemyBullet(e.x, e.y + 10, a + j * 0.22, 90 + s.stage * 2);
          }
        }
      }
      if (distance(s, e) < e.r + 6) this.hurt(20);
      if (e.y > H + 40) {
        e.hp = 0;
        s.escaped++;
      }
    }
    if (s.phase === "lost") return;
    this.weapons();
    for (const p of s.shots) {
      p.life -= STEP;
      if (p.kind === "missile") {
        const target =
          s.enemies.find((e) => e.id === p.target && e.hp > 0) ||
          s.enemies.find((e) => e.hp > 0);
        if (target) {
          const a = Math.atan2(target.y - p.y, target.x - p.x);
          p.vx = Math.cos(a) * 260;
          p.vy = Math.sin(a) * 260;
        }
      }
      p.x += p.vx * STEP;
      p.y += p.vy * STEP;
      const e = s.enemies.find((e) => e.hp > 0 && distance(p, e) < e.r + p.r);
      if (e) {
        p.life = 0;
        if (p.radius) {
          for (const q of [...s.enemies])
            if (q.hp > 0 && distance(p, q) < p.radius + q.r)
              this.hit(q, p.damage);
          this.fx("blast", p.x, p.y, { radius: p.radius });
        } else {
          this.hit(e, p.damage);
          this.fx("spark", p.x, p.y);
        }
      }
    }
    for (const b of s.bullets) {
      b.life -= STEP;
      b.slow = Math.max(0, b.slow - STEP);
      const slow = b.slow > 0 ? 0.45 : 1;
      b.x += b.vx * STEP * slow;
      b.y += b.vy * STEP * slow;
      if (distance(s, b) < b.r + 5) {
        this.hurt(14);
        b.life = 0;
      }
    }
    for (const h of s.hazards) {
      h.life -= STEP;
      if (h.life < h.warning && h.life > h.warning - STEP)
        this.fx("beam", h.x, 0);
      if (h.life < 0.5 && Math.abs(s.x - h.x) < h.w / 2 + 5) this.hurt(25);
    }
    for (const d of s.drops) {
      d.life -= STEP;
      const dist = distance(d, s),
        range = 85 + s.mods.magnet * 15 + (s.ship === "bastion" ? 25 : 0);
      if (dist < range) {
        d.x += (s.x - d.x) * Math.min(1, STEP * 8);
        d.y += (s.y - d.y) * Math.min(1, STEP * 8);
      } else d.y += 22 * STEP;
      if (dist < 16) {
        if (d.kind === "heal")
          s.hp = Math.min(s.maxHp, s.hp + (s.skills.shield >= 5 ? 27 : 18));
        else s.xp += d.value;
        d.life = 0;
        this.fx("collect", s.x, s.y);
      }
    }
    s.enemies = s.enemies.filter((e) => e.hp > 0 && e.y < H + 40);
    s.shots = s.shots.filter(
      (p) =>
        p.life > 0 && p.y > -50 && p.y < H + 30 && p.x > -50 && p.x < W + 50,
    );
    s.bullets = s.bullets.filter(
      (b) =>
        b.life > 0 && b.x > -30 && b.x < W + 30 && b.y > -30 && b.y < H + 30,
    );
    s.drops = s.drops.filter((d) => d.life > 0 && d.y < H + 30).slice(-100);
    s.hazards = s.hazards.filter((h) => h.life > 0);
    if (
      s.phase === "battle" &&
      (s.xp >= s.nextXp || (s.level === 0 && s.time >= 8))
    ) {
      s.xp = Math.max(0, s.xp - s.nextXp);
      s.level++;
      s.nextXp = 30 + s.level * 12;
      this.offer();
    }
    this.events = this.events.slice(-150);
  }
  serialize() {
    return JSON.stringify(this.s);
  }
  static restore(raw) {
    try {
      const s = JSON.parse(raw);
      if (
        !s ||
        s.v !== 1 ||
        !["battle", "choice", "won", "lost"].includes(s.phase) ||
        !SHIPS.some((c) => c.id === s.ship)
      )
        return null;
      const g = new Game({
        stage: s.stage,
        ship: s.ship,
        hard: s.hard,
        mods: s.mods,
        seed: s.seed,
      });
      for (const k of [
        "x",
        "y",
        "hp",
        "maxHp",
        "time",
        "xp",
        "nextXp",
        "level",
        "id",
        "pulse",
        "inv",
        "seed",
        "hits",
        "kills",
        "damage",
        "spawn",
        "pulseKills",
        "escaped",
        "shield",
      ])
        if (!Number.isFinite(s[k])) return null;
      if (
        s.hp < 0 ||
        s.hp > s.maxHp ||
        s.maxHp > 250 ||
        s.x < 0 ||
        s.x > W ||
        s.y < 0 ||
        s.y > H ||
        s.time < 0 ||
        s.time > 10000 ||
        s.pulse < 0 ||
        s.pulse > 3 ||
        s.level < 0 ||
        s.level > 100 ||
        !Number.isInteger(s.seed)
      )
        return null;
      for (const k of Object.keys(SKILLS))
        if (
          !Number.isInteger(s.skills?.[k]) ||
          s.skills[k] < 0 ||
          s.skills[k] > 6
        )
          return null;
      for (const k of ["power", "hull", "magnet"])
        if (!Number.isInteger(s.mods?.[k]) || s.mods[k] < 0 || s.mods[k] > 3)
          return null;
      for (const k of Object.keys(g.s.cool))
        if (!Number.isFinite(s.cool?.[k])) return null;
      for (const [k, limit] of [
        ["enemies", 200],
        ["shots", 220],
        ["bullets", 280],
        ["drops", 100],
        ["hazards", 20],
      ]) {
        if (!Array.isArray(s[k]) || s[k].length > limit) return null;
        for (const o of s[k]) {
          if (!Number.isFinite(o.x) || !Number.isFinite(o.y)) return null;
          for (const v of Object.values(o))
            if (typeof v === "number" && !Number.isFinite(v)) return null;
        }
      }
      for (const e of s.enemies)
        if (
          !Object.hasOwn(FOES, e.kind) ||
          !["hp", "max", "r", "age", "shoot", "slow", "orb", "flash"].every(
            (k) => Number.isFinite(e[k]),
          ) ||
          e.hp <= 0 ||
          e.hp > e.max
        )
          return null;
      if (
        typeof s.hard !== "boolean" ||
        s.seed < 0 ||
        s.seed > 4294967295 ||
        s.nextXp <= 0 ||
        s.maxHp <= 0
      )
        return null;
      for (const p of s.shots)
        if (!Number.isFinite(p.damage) || p.damage < 0) return null;
      for (const d of s.drops)
        if (
          !["xp", "heal"].includes(d.kind) ||
          !Number.isFinite(d.value) ||
          !Number.isFinite(d.life)
        )
          return null;
      for (const h of s.hazards)
        if (!["w", "life", "warning"].every((k) => Number.isFinite(h[k])))
          return null;
      for (const p of [...s.shots, ...s.bullets])
        if (!["vx", "vy", "life", "r"].every((k) => Number.isFinite(p[k])))
          return null;
      if (
        !Array.isArray(s.choices) ||
        s.choices.length > 3 ||
        s.choices.some((k) => !Object.hasOwn(SKILLS, k) || s.skills[k] >= 6) ||
        new Set(s.choices).size !== s.choices.length ||
        (s.phase === "choice" && !s.choices.length)
      )
        return null;
      g.s = s;
      g.target = { x: s.x, y: s.y };
      return g;
    } catch {
      return null;
    }
  }
}
