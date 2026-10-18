/* Watermelon Garden physics. Original implementation; Matter.js is separately MIT licensed. */
(function (root, factory) {
  if (typeof module === "object" && module.exports)
    module.exports = factory(require("./vendor/matter-0.20.0.min.js"));
  else root.WatermelonPhysics = factory(root.Matter);
})(typeof globalThis !== "undefined" ? globalThis : this, function (M) {
  "use strict";
  if (!M)
    throw Error(
      "물리 엔진을 불러오지 못했습니다. 온라인에서 다시 열어 주세요.",
    );
  const { Engine, Bodies, Body, Composite, Events, Vertices, Sleeping } = M;
  const C = Object.freeze({
    width: 360,
    height: 500,
    left: 12,
    right: 348,
    floor: 488,
    dangerY: 60,
    spawnY: 27,
    step: 1000 / 120,
    dropCooldown: 420,
    dangerGrace: 2000,
    entryGrace: 1500,
    migrationGrace: 5000,
  });
  // Size anchors are approximated from the Nintendo gameplay still linked in WATERMELON_REBUILD.md.
  // Unpublished engine constants and interpolated sizes are our tuning, never claimed as original values.
  const FRUITS = [
    {
      name: "체리",
      r: 11,
      color: "#ef5e70",
      light: "#ffadb4",
      dark: "#c93953",
      shape: "round",
    },
    {
      name: "딸기",
      r: 15,
      color: "#fa7775",
      light: "#ffc0a7",
      dark: "#db4b61",
      shape: "berry",
    },
    {
      name: "포도",
      r: 22,
      color: "#9b7ddc",
      light: "#d4b7fc",
      dark: "#7750b5",
      shape: "grape",
    },
    {
      name: "감귤",
      r: 28,
      color: "#ffb34e",
      light: "#ffe29a",
      dark: "#e18b36",
      shape: "round",
    },
    {
      name: "감",
      r: 33,
      color: "#f58c48",
      light: "#ffd5a1",
      dark: "#d66f32",
      shape: "flat",
    },
    {
      name: "사과",
      r: 44,
      color: "#f16d69",
      light: "#ffb1a0",
      dark: "#d54d57",
      shape: "apple",
    },
    {
      name: "배",
      r: 50,
      color: "#d8c76a",
      light: "#fff0b3",
      dark: "#b09c43",
      shape: "pear",
    },
    {
      name: "복숭아",
      r: 58,
      color: "#f8a6b2",
      light: "#ffe0d9",
      dark: "#de819c",
      shape: "peach",
    },
    {
      name: "파인애플",
      r: 68,
      color: "#eac35e",
      light: "#fff1b5",
      dark: "#c99c3d",
      shape: "pine",
    },
    {
      name: "멜론",
      r: 80,
      color: "#a1c986",
      light: "#deedbe",
      dark: "#79a269",
      shape: "round",
    },
    {
      name: "수박",
      r: 91,
      color: "#63b78b",
      light: "#c5e6a1",
      dark: "#388a67",
      shape: "round",
    },
  ].map((x, i) => Object.freeze({ ...x, level: i, points: (i * (i + 1)) / 2 }));
  function outline(level) {
    const kind = FRUITS[level].shape,
      pts = [];
    for (let i = 0; i < 40; i++) {
      const a = (i * Math.PI * 2) / 40,
        s = Math.sin(a),
        c = Math.cos(a);
      let x = c,
        y = s;
      if (kind === "berry") {
        x *= 0.91 - 0.14 * s;
        y *= 1.04;
      }
      if (kind === "grape") {
        x *= 0.97;
        y *= 1.02;
      }
      if (kind === "flat") {
        x *= 1.04;
        y *= 0.92;
      }
      if (kind === "apple") {
        x *= 1 + 0.035 * Math.cos(2 * a);
        y *= 0.96;
      }
      if (kind === "pear") {
        x *= 0.91 + 0.13 * s;
        y *= 1.03;
      }
      if (kind === "peach") {
        x *= 1.02;
        y *= 0.96;
      }
      if (kind === "pine") {
        x *= 0.92;
        y *= 1.04;
      }
      pts.push({ x, y });
    }
    const hull = Vertices.hull(pts),
      center = Vertices.centre(hull);
    return hull.map((p) => ({ x: p.x - center.x, y: p.y - center.y }));
  }
  const OUTLINES = FRUITS.map((_, i) => outline(i));
  const finite = (n) => typeof n === "number" && Number.isFinite(n),
    clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  function validate(s) {
    if (
      !s ||
      typeof s !== "object" ||
      ![1, 2].includes(s.version) ||
      !Array.isArray(s.balls) ||
      s.balls.length > 256 ||
      !Number.isSafeInteger(s.score) ||
      s.score < 0
    )
      throw Error(
        "지원하지 않거나 손상된 이어하기 데이터입니다. 원본을 보존했습니다.",
      );
    if (
      !Number.isInteger(s.next) ||
      s.next < 0 ||
      s.next > (s.version === 1 ? 3 : 4)
    )
      throw Error("다음 과일 데이터가 올바르지 않습니다.");
    if (
      s.version === 2 &&
      (!Number.isInteger(s.current) ||
        s.current < 0 ||
        s.current > 4 ||
        !finite(s.elapsed) ||
        s.elapsed < 0)
    )
      throw Error("진행 상태의 시간이 올바르지 않습니다.");
    for (const b of s.balls)
      if (
        !b ||
        !Number.isInteger(b.level) ||
        b.level < 0 ||
        b.level >= FRUITS.length ||
        !["x", "y", "vx", "vy"].every((k) => finite(b[k])) ||
        Math.abs(b.x) > 10000 ||
        Math.abs(b.y) > 10000
      )
        throw Error(
          "과일 위치 데이터가 올바르지 않습니다. 원본을 보존했습니다.",
        );
    return s;
  }
  class Game {
    constructor({
      random = Math.random,
      onMerge = () => {},
      onEnd = () => {},
    } = {}) {
      this.random = random;
      this.onMerge = onMerge;
      this.onEnd = onEnd;
      this.events = [];
      this.uid = 0;
      this.elapsed = 0;
      this.lastDrop = -C.dropCooldown;
      this.danger = 0;
      this.migrationUntil = 0;
      this.score = 0;
      this.over = false;
      this.watermelons = 0;
      this.rules = "garden-v2";
      this.sessionId =
        Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
      this.recorded = false;
      this.aim = 180;
      this.current = this.roll();
      this.next = this.roll();
      this.mergeCount = 0;
      this.dropCount = 0;
      this.candidates = new Map();
      this.engine = Engine.create({
        enableSleeping: true,
        positionIterations: 24,
        velocityIterations: 8,
        constraintIterations: 2,
      });
      this.engine.gravity.y = 1;
      this.engine.gravity.scale = 0.001;
      const wall = {
        isStatic: true,
        friction: 0.25,
        frictionStatic: 0.8,
        restitution: 0.04,
        label: "garden-wall",
      };
      Composite.add(this.engine.world, [
        Bodies.rectangle(C.left - 30, 260, 60, 620, wall),
        Bodies.rectangle(C.right + 30, 260, 60, 620, wall),
        Bodies.rectangle(180, C.floor + 40, 420, 80, wall),
      ]);
      const collect = (e) => {
        for (const p of e.pairs) {
          const a = p.bodyA.parent,
            b = p.bodyB.parent;
          if (a.wm && b.wm && a.wm.level === b.wm.level) {
            const key = [a.id, b.id].sort((x, y) => x - y).join(":");
            this.candidates.set(key, [a, b]);
          }
          if (a.wm) a.wm.contacted = true;
          if (b.wm) b.wm.contacted = true;
        }
      };
      Events.on(this.engine, "collisionStart", collect);
      Events.on(this.engine, "collisionActive", collect);
    }
    roll() {
      return Math.min(4, Math.floor(this.random() * 5));
    }
    get bodies() {
      return Composite.allBodies(this.engine.world).filter((b) => b.wm);
    }
    make(level, x, y, extra = {}) {
      const f = FRUITS[level],
        vertices = OUTLINES[level].map((p) => ({ x: p.x * f.r, y: p.y * f.r }));
      const b = Bodies.fromVertices(
        x,
        y,
        [vertices],
        {
          friction: 0.18,
          frictionStatic: 0.8,
          frictionAir: 0.003,
          restitution: 0.07,
          density: 0.001,
          slop: 0.025,
          sleepThreshold: 90,
          label: "fruit-" + level,
        },
        false,
      );
      Body.setInertia(b, b.inertia * 1.5);
      b.wm = {
        id: ++this.uid,
        level,
        born: this.elapsed,
        entered: false,
        contacted: false,
        mergedAt: -1000,
        ...extra,
      };
      if (b.wm.id > this.uid) this.uid = b.wm.id;
      Composite.add(this.engine.world, b);
      return b;
    }
    setAim(x) {
      const f = FRUITS[this.current];
      this.aim = clamp(x, C.left + f.r + 2, C.right - f.r - 2);
      return this.aim;
    }
    canDrop() {
      return (
        !this.over &&
        this.elapsed - this.lastDrop >= C.dropCooldown &&
        this.bodies.length < 256
      );
    }
    drop(x = this.aim) {
      if (!this.canDrop()) return null;
      this.setAim(x);
      const b = this.make(
        this.current,
        this.aim,
        Math.max(C.spawnY, FRUITS[this.current].r * 1.3 + 3),
      );
      this.current = this.next;
      this.next = this.roll();
      this.lastDrop = this.elapsed;
      this.dropCount++;
      this.setAim(this.aim);
      return b;
    }
    merge(a, b) {
      if (!a.wm || !b.wm || a.wm.level !== b.wm.level) return;
      const level = a.wm.level,
        point = {
          x: (a.position.x + b.position.x) / 2,
          y: (a.position.y + b.position.y) / 2,
        };
      const vx =
          (a.velocity.x * a.mass + b.velocity.x * b.mass) / (a.mass + b.mass),
        vy =
          (a.velocity.y * a.mass + b.velocity.y * b.mass) / (a.mass + b.mass),
        // Average along the shorter arc: 359° and 1° must not create a 180° flip.
        angle =
          a.angle +
          Math.atan2(Math.sin(b.angle - a.angle), Math.cos(b.angle - a.angle)) /
            2;
      Composite.remove(this.engine.world, [a, b]);
      this.mergeCount++;
      let points,
        next = null;
      if (level === 10) {
        points = 110;
        this.watermelons++;
      } else {
        points = FRUITS[level + 1].points;
        next = this.make(level + 1, point.x, point.y, {
          mergedAt: this.elapsed,
          entered: a.wm.entered || b.wm.entered,
        });
        Body.setAngle(next, angle);
        this.keepInside(next);
        Body.setVelocity(next, { x: clamp(vx, -8, 8), y: clamp(vy, -8, 8) });
        Body.setAngularVelocity(
          next,
          clamp((a.angularVelocity + b.angularVelocity) / 2, -0.05, 0.05),
        );
      }
      // Merging changes the support graph, even with zero impact velocity.
      // Wake the pile so growth can displace neighbours and removing watermelons
      // cannot leave sleeping fruit suspended above an empty space. No extra impulse.
      for (const body of this.bodies) {
        if (body.isSleeping) Sleeping.set(body, false);
      }
      this.score += points;
      const event = {
        ...point,
        level: Math.min(10, level + 1),
        points,
        time: this.elapsed,
        double: level === 10,
      };
      this.events.push(event);
      this.onMerge(event, next);
    }
    keepInside(b, tolerance = 0) {
      // Bounds include a velocity margin for broadphase detection. Constrain the
      // actual silhouette instead, without creating a bounce or extra velocity.
      let minX = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      for (const v of b.vertices) {
        minX = Math.min(minX, v.x);
        maxX = Math.max(maxX, v.x);
        maxY = Math.max(maxY, v.y);
      }
      let dx = 0,
        dy = 0;
      if (minX < C.left - tolerance) dx = C.left - minX;
      else if (maxX > C.right + tolerance) dx = C.right - maxX;
      if (maxY > C.floor + tolerance) dy = C.floor - maxY;
      if (dx || dy) {
        Sleeping.set(b, false);
        Body.translate(b, { x: dx, y: dy });
      }
    }
    step(delta = C.step) {
      if (this.over) return;
      const dt = clamp(delta, 1, C.step);
      this.elapsed += dt;
      Engine.update(this.engine, dt);
      const used = new Set(),
        live = new Set(this.bodies);
      for (const [a, b] of this.candidates.values()) {
        if (
          used.has(a) ||
          used.has(b) ||
          !live.has(a) ||
          !live.has(b) ||
          this.elapsed - a.wm.mergedAt < 80 ||
          this.elapsed - b.wm.mergedAt < 80
        )
          continue;
        used.add(a);
        used.add(b);
        this.merge(a, b);
      }
      this.candidates.clear();
      let dangerous = false;
      for (const b of this.bodies) {
        if (!finite(b.position.x) || !finite(b.position.y) || !finite(b.angle))
          throw Error("유효하지 않은 물리 상태");
        // Dense merges can momentarily overwhelm an iterative wall contact.
        // A container-only safety projection prevents visible wall penetration;
        // all fruit-to-fruit contacts and motion remain Matter.js calculations.
        this.keepInside(b, 0.5);
        if (b.bounds.min.y > C.dangerY + 2) b.wm.entered = true;
        if (b.angularSpeed > 0.12)
          Body.setAngularVelocity(b, Math.sign(b.angularVelocity) * 0.12);
        if (b.speed > 28)
          Body.setVelocity(b, {
            x: (b.velocity.x * 28) / b.speed,
            y: (b.velocity.y * 28) / b.speed,
          });
        const aged = this.elapsed - b.wm.born > C.entryGrace;
        if (
          (b.wm.entered || (aged && b.wm.contacted)) &&
          b.bounds.min.y < C.dangerY &&
          this.elapsed > this.migrationUntil
        )
          dangerous = true;
      }
      this.danger = dangerous
        ? this.danger + dt
        : Math.max(0, this.danger - dt * 2);
      this.events = this.events.filter((e) => this.elapsed - e.time < 1000);
      if (this.danger >= C.dangerGrace) {
        this.over = true;
        this.onEnd(this.snapshot());
      }
    }
    advance(ms) {
      const n = Math.ceil(ms / C.step);
      for (let i = 0; i < n && !this.over; i++) this.step();
    }
    snapshot() {
      return {
        version: 2,
        engine: "matter-0.20.0",
        rules: this.rules,
        arena: { width: C.width, height: C.height },
        balls: this.bodies.map((b) => ({
          id: b.wm.id,
          level: b.wm.level,
          x: b.position.x,
          y: b.position.y,
          vx: b.velocity.x,
          vy: b.velocity.y,
          angle: b.angle,
          spin: b.angularVelocity,
          age: Math.max(0, this.elapsed - b.wm.born),
          entered: b.wm.entered,
          contacted: b.wm.contacted,
          sleeping: b.isSleeping,
        })),
        score: this.score,
        aim: this.aim,
        current: this.current,
        next: this.next,
        over: this.over,
        danger: this.danger,
        migrationGraceRemaining: Math.max(
          0,
          this.migrationUntil - this.elapsed,
        ),
        uid: this.uid,
        elapsed: this.elapsed,
        lastDrop: this.lastDrop,
        watermelons: this.watermelons,
        mergeCount: this.mergeCount,
        dropCount: this.dropCount,
        sessionId: this.sessionId,
        recorded: this.recorded,
        updated: Date.now(),
      };
    }
    restore(input) {
      const s = validate(input);
      for (const b of this.bodies) Composite.remove(this.engine.world, b);
      Engine.clear(this.engine);
      this.candidates.clear();
      this.elapsed = s.version === 2 ? s.elapsed : 0;
      this.score = s.score;
      this.current = s.version === 2 ? s.current : s.next;
      this.next = s.version === 2 ? s.next : this.roll();
      this.over = !!s.over;
      this.rules = s.rules || "legacy-score-preserved";
      this.danger =
        s.version === 2 && finite(s.danger)
          ? clamp(s.danger, 0, C.dangerGrace)
          : 0;
      this.uid = 0;
      this.events = [];
      for (const old of s.balls) {
        const legacy = s.version === 1,
          x = legacy ? C.left + (old.x / 360) * (C.right - C.left) : old.x,
          y = legacy
            ? C.dangerY + ((old.y - 27) / (390 - 27)) * (C.floor - C.dangerY)
            : old.y;
        const age = finite(old.age)
          ? Math.max(0, old.age) * (legacy ? 1000 / 60 : 1)
          : 0;
        const b = this.make(old.level, x, y, {
          id: Number.isSafeInteger(old.id) && old.id > 0 ? old.id : ++this.uid,
          born: this.elapsed - age,
          entered: legacy ? y - FRUITS[old.level].r > C.dangerY : !!old.entered,
          contacted: legacy ? age > 500 : !!old.contacted,
        });
        Body.setAngle(b, finite(old.angle) ? old.angle : 0);
        if (legacy) this.keepInside(b);
        Body.setVelocity(b, {
          x: clamp(old.vx * (legacy ? (C.right - C.left) / 360 : 1), -28, 28),
          y: clamp(
            old.vy * (legacy ? (C.floor - C.dangerY) / (390 - 27) : 1),
            -28,
            28,
          ),
        });
        Body.setAngularVelocity(
          b,
          finite(old.spin) ? clamp(old.spin, -0.12, 0.12) : 0,
        );
        if (old.sleeping) Sleeping.set(b, true);
      }
      this.uid = Math.max(this.uid, Number.isSafeInteger(s.uid) ? s.uid : 0);
      this.aim = finite(s.aim) ? s.aim : 180;
      this.setAim(this.aim);
      this.lastDrop =
        s.version === 2 && finite(s.lastDrop) ? s.lastDrop : -C.dropCooldown;
      this.migrationUntil =
        this.elapsed +
        (s.version === 1
          ? C.migrationGrace
          : finite(s.migrationGraceRemaining)
            ? clamp(s.migrationGraceRemaining, 0, C.migrationGrace)
            : 0);
      this.sessionId =
        typeof s.sessionId === "string" ? s.sessionId : this.sessionId;
      this.recorded = s.version === 1 ? !!s.over : !!s.recorded;
      this.watermelons = Number.isSafeInteger(s.watermelons)
        ? s.watermelons
        : 0;
      this.mergeCount = Number.isSafeInteger(s.mergeCount) ? s.mergeCount : 0;
      this.dropCount = Number.isSafeInteger(s.dropCount) ? s.dropCount : 0;
      return { migrated: s.version === 1, count: this.bodies.length };
    }
    destroy() {
      Events.off(this.engine);
      Composite.clear(this.engine.world, false);
      Engine.clear(this.engine);
    }
  }
  return { Game, FRUITS, OUTLINES, C, validate };
});
