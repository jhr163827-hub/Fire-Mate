import { W, H, SKILLS, SHIPS, REGIONS } from "./data.mjs";
const poly = (c, p, fill, stroke = "#142a3d", w = 1.5) => {
  c.beginPath();
  p.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = w;
    c.stroke();
  }
};
const ellipse = (c, x, y, rx, ry, fill, stroke) => {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, 7);
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = 1.5;
    c.stroke();
  }
};
const line = (c, p, col, w = 2) => {
  c.beginPath();
  p.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.strokeStyle = col;
  c.lineWidth = w;
  c.lineCap = "round";
  c.stroke();
};
export function shipArt(c, x, y, id = "swift", t = 0, scale = 1, bank = 0) {
  const col = SHIPS.find((s) => s.id === id)?.color || "#edc566";
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  c.rotate(bank);
  ellipse(c, 3, 10, 24, 9, "#07172145");
  for (const v of [-1, 1]) {
    const wide = id === "manta" ? 35 : id === "bastion" ? 28 : 24;
    poly(
      c,
      [
        [v * 5, -10],
        [v * wide, 8],
        [v * (wide - 3), 18],
        [v * 8, 11],
      ],
      col,
    );
    poly(
      c,
      [
        [v * 8, 4],
        [v * (wide - 3), 12],
        [v * (wide - 5), 15],
        [v * 8, 9],
      ],
      "#476878",
    );
    line(
      c,
      [
        [v * 12, -5],
        [v * 12, 13],
      ],
      "#d7ebe8",
      3,
    );
    poly(
      c,
      [
        [v * 8, 14],
        [v * 3, 30],
        [v * 14, 24],
      ],
      "#5e8995",
    );
    poly(
      c,
      [
        [v * 9, 19],
        [v * 7, 26 + Math.sin(t * 40 + v) * 4],
        [v * 5, 19],
      ],
      "#8becf1",
      null,
    );
  }
  poly(
    c,
    [
      [0, -29],
      [-8, -10],
      [-7, 18],
      [0, 26],
      [7, 18],
      [8, -10],
    ],
    col,
  );
  poly(
    c,
    [
      [0, -20],
      [-5, -6],
      [0, 0],
      [5, -6],
    ],
    "#a6e5e8",
    "#36536a",
  );
  line(
    c,
    [
      [0, 2],
      [0, 17],
    ],
    "#fff0bf",
    2,
  );
  ellipse(c, 0, -25, 2, 3, "#fff4cf");
  if (id === "bastion") {
    for (const v of [-1, 1])
      poly(
        c,
        [
          [v * 8, -14],
          [v * 17, -10],
          [v * 17, 15],
          [v * 9, 17],
        ],
        "#778997",
      );
  }
  c.restore();
}
export function enemyArt(c, e, t, pattern = 0) {
  c.save();
  c.translate(e.x, e.y);
  c.rotate(e.kind === "boss" ? Math.sin(t) * 0.025 : e.vx ? -0.15 : 0);
  const big = e.kind === "boss",
    color = big
      ? "#ad7275"
      : e.kind === "gunner"
        ? "#c19c80"
        : e.kind === "carrier"
          ? "#8c99b1"
          : "#bb806d";
  ellipse(c, 2, 8, big ? 43 : e.r, 8, "#06152945");
  if (big) {
    poly(
      c,
      [
        [-48, -10],
        [-27, -30],
        [0, -19],
        [27, -30],
        [48, -10],
        [38, 24],
        [13, 19],
        [0, 35],
        [-13, 19],
        [-38, 24],
      ],
      color,
    );
    for (const v of [-1, 1]) {
      poly(
        c,
        [
          [v * 10, -15],
          [v * 34, -19],
          [v * 40, 15],
          [v * 17, 11],
        ],
        "#526c85",
      );
      line(
        c,
        [
          [v * 29, 12],
          [v * 29, 27],
        ],
        "#e0b896",
        7,
      );
    }
    poly(
      c,
      [
        [-14, -15],
        [0, -27],
        [14, -15],
        [12, 20],
        [0, 30],
        [-12, 20],
      ],
      "#dbc49c",
    );
    ellipse(c, 0, 1, 10, 12, "#435a76", "#fff0bd");
    if (pattern === 1)
      for (const v of [-1, 1])
        poly(
          c,
          [
            [v * 17, -28],
            [v * 29, -36],
            [v * 38, -18],
            [v * 29, -4],
          ],
          "#b9b3b9",
        );
    if (pattern === 2) {
      c.save();
      c.rotate(t);
      for (let i = 0; i < 4; i++) {
        c.rotate(Math.PI / 2);
        poly(
          c,
          [
            [20, -4],
            [48, -10],
            [52, 1],
            [25, 8],
          ],
          "#b3a3d4",
        );
      }
      c.restore();
    }
    ellipse(c, 0, 2, 4, 5, "#ffb78d");
  } else {
    const r = e.r;
    poly(
      c,
      [
        [0, r + 10],
        [-r, -r * 0.6],
        [-r * 0.45, -r],
        [0, -r * 0.5],
        [r * 0.45, -r],
        [r, -r * 0.6],
      ],
      color,
    );
    poly(
      c,
      [
        [0, r + 3],
        [-5, -r * 0.4],
        [5, -r * 0.4],
      ],
      "#4e6880",
    );
    for (const v of [-1, 1])
      line(
        c,
        [
          [v * r * 0.65, -r * 0.3],
          [v * r * 0.65, r * 0.4],
        ],
        "#f1c3a0",
        2,
      );
    if (e.kind === "carrier")
      for (const v of [-1, 1])
        ellipse(c, v * 16, 2, 8, 12, "#76879e", "#c4b8a9");
    ellipse(c, 0, 3, 3, 5, "#ffcaa8");
  }
  if (e.slow) ellipse(c, 0, 0, e.r + 3, e.r + 3, "#a8d9ff18", "#b2e9ff");
  if (e.flash) {
    c.globalAlpha = 0.45;
    ellipse(c, 0, 0, e.r, e.r, "#fff4dd");
    c.globalAlpha = 1;
  }
  if (!big && e.hp < e.max) {
    line(
      c,
      [
        [-e.r, -e.r - 9],
        [e.r, -e.r - 9],
      ],
      "#19324c",
      3,
    );
    line(
      c,
      [
        [-e.r, -e.r - 9],
        [-e.r + (2 * e.r * e.hp) / e.max, -e.r - 9],
      ],
      "#ecc7a1",
      2,
    );
  }
  c.restore();
}
export function icon(c, key, x, y, size = 22, level = 0) {
  c.save();
  c.translate(x, y);
  c.scale(size / 22, size / 22);
  const color = SKILLS[key]?.color || "#f4d69e";
  if (key === "volley")
    for (let i = -1; i <= 1; i++) {
      poly(
        c,
        [
          [i * 10 - 3, 9],
          [i * 10 - 3, -8],
          [i * 10, -15],
          [i * 10 + 3, -8],
          [i * 10 + 3, 9],
        ],
        color,
      );
    }
  if (key === "laser") {
    line(
      c,
      [
        [-14, 14],
        [14, -14],
      ],
      color,
      6,
    );
    line(
      c,
      [
        [-17, 7],
        [7, -17],
      ],
      "#efffff",
      2,
    );
  }
  if (key === "missile") {
    poly(
      c,
      [
        [-9, 12],
        [-5, -7],
        [3, -15],
        [11, -6],
        [8, 8],
      ],
      color,
    );
    poly(
      c,
      [
        [-8, 8],
        [-15, 16],
        [-3, 14],
      ],
      "#e2b17c",
    );
    ellipse(c, 3, -5, 3, 4, "#37516b");
  }
  if (key === "drone") {
    for (const v of [-1, 1])
      poly(
        c,
        [
          [v * 3, -12],
          [v * 18, 8],
          [v * 7, 6],
          [v * 5, 15],
        ],
        color,
      );
  }
  if (key === "orbit") {
    for (let i = 0; i < 8; i++) {
      c.rotate(Math.PI / 4);
      poly(
        c,
        [
          [5, -4],
          [17, -4],
          [12, 5],
          [7, 5],
        ],
        color,
      );
    }
    ellipse(c, 0, 0, 6, 6, "#445b72", color);
  }
  if (key === "arc")
    poly(
      c,
      [
        [-3, -18],
        [-13, 3],
        [-2, 1],
        [-6, 18],
        [13, -5],
        [2, -3],
      ],
      color,
    );
  if (key === "frost") {
    for (let i = 0; i < 3; i++) {
      c.rotate(Math.PI / 3);
      line(
        c,
        [
          [0, -17],
          [0, 17],
        ],
        color,
        3,
      );
      line(
        c,
        [
          [-5, -12],
          [0, -7],
          [5, -12],
        ],
        color,
        2,
      );
    }
  }
  if (key === "shield")
    poly(
      c,
      [
        [-14, -13],
        [0, -17],
        [14, -13],
        [11, 6],
        [0, 17],
        [-11, 6],
      ],
      "#486676",
      color,
      3,
    );
  if (level >= 3) {
    ellipse(c, 15, -14, 4, 4, "#f6d48b");
    if (level >= 6) ellipse(c, -15, -14, 4, 4, "#f6d48b");
  }
  c.restore();
}
function backdrop(c, s) {
  const theme = REGIONS[Math.floor((s.stage - 1) / 4)],
    time = s.time;
  c.fillStyle = theme.sky;
  c.fillRect(0, 0, W, H);
  const grad = c.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, theme.haze + "80");
  grad.addColorStop(1, theme.sky);
  c.fillStyle = grad;
  c.fillRect(0, 0, W, H);
  for (let i = 0; i < 9; i++) {
    const y = ((i * 103 + time * (15 + (i % 3) * 8)) % 850) - 120,
      x = ((i * 137 + 43) % 420) - 30;
    c.globalAlpha = 0.22;
    ellipse(c, x, y, 50 + (i % 3) * 20, 18, theme.haze);
    ellipse(c, x + 25, y - 8, 32, 20, theme.haze);
  }
  c.globalAlpha = 1;
  for (let side = 0; side < 2; side++)
    for (let i = 0; i < 4; i++) {
      const x = side ? W + 20 : -20,
        y = ((i * 200 + time * 30) % 860) - 130;
      poly(
        c,
        [
          [x + (side ? -40 : 40), y - 90],
          [x + (side ? -55 : 55), y - 30],
          [x + (side ? -22 : 22), y + 20],
          [x + (side ? -45 : 45), y + 80],
          [x, y + 110],
          [x, y - 100],
        ],
        theme.land + "55",
        null,
      );
    }
  for (let i = 0; i < 18; i++) {
    const x = (i * 67 + 37) % W,
      y = (i * 107 + time * 50) % H;
    line(
      c,
      [
        [x, y],
        [x, y + 5],
      ],
      "#d9e8e81c",
      1,
    );
  }
}
export function paint(c, s, fx, opts = {}) {
  c.clearRect(0, 0, W * 2, H * 2);
  c.save();
  c.scale(2, 2);
  backdrop(c, s);
  for (const h of s.hazards) {
    const active = h.life < 0.5;
    c.fillStyle = active ? "#fff0c9bd" : "#f47b7b20";
    c.fillRect(h.x - h.w / 2, 0, h.w, H);
    line(
      c,
      [
        [h.x - h.w / 2, 0],
        [h.x - h.w / 2, H],
      ],
      active ? "#ffbe94" : "#ff9b8e",
      active ? 3 : 1,
    );
    if (!active) {
      c.fillStyle = "#ffc5aa";
      c.font = "bold 10px sans-serif";
      c.textAlign = "center";
      c.fillText("회피", h.x, 140);
    }
  }
  for (const d of s.drops) {
    const heal = d.kind === "heal";
    c.save();
    c.translate(d.x, d.y);
    c.rotate(s.time * 0.7);
    poly(
      c,
      [
        [-5, 0],
        [0, -7],
        [5, 0],
        [0, 7],
      ],
      heal ? "#9ee5c5" : "#8bcae2",
      "#d8f4ec",
      1,
    );
    if (heal) {
      line(
        c,
        [
          [-3, 0],
          [3, 0],
        ],
        "#fff",
        2,
      );
      line(
        c,
        [
          [0, -3],
          [0, 3],
        ],
        "#fff",
        2,
      );
    }
    c.restore();
  }
  for (const p of s.shots) {
    if (p.kind === "missile") {
      const a = Math.atan2(p.vy, p.vx);
      line(
        c,
        [
          [p.x - Math.cos(a) * 14, p.y - Math.sin(a) * 14],
          [p.x, p.y],
        ],
        "#f59e7160",
        6,
      );
      ellipse(c, p.x, p.y, 3, 6, "#ffcf94");
    } else {
      line(
        c,
        [
          [p.x, p.y + 9],
          [p.x, p.y - 4],
        ],
        p.kind === "drone" ? "#b6f1b0" : "#fff0aa",
        3,
      );
      line(
        c,
        [
          [p.x, p.y + 10],
          [p.x, p.y + 18],
        ],
        "#a8dce33a",
        2,
      );
    }
  }
  for (const e of s.enemies) enemyArt(c, e, s.time, thisPattern(s.stage));
  for (const b of s.bullets) {
    ellipse(c, b.x, b.y, b.r + 2, b.r + 2, "#1c293e");
    ellipse(c, b.x, b.y, b.r, b.r, b.slow ? "#b8ecff" : "#ff8c83");
    ellipse(c, b.x, b.y, b.r * 0.45, b.r * 0.45, "#fff1d7");
  }
  if (s.skills.orbit) {
    const n = s.skills.orbit >= 6 ? 6 : s.skills.orbit >= 3 ? 4 : 2,
      r = s.skills.orbit >= 4 ? 65 : 45;
    for (let i = 0; i < n; i++) {
      const a = s.time * 2.7 + (i * 6.283) / n;
      icon(c, "orbit", s.x + Math.cos(a) * r, s.y + Math.sin(a) * r, 10);
    }
  }
  if (s.skills.drone) {
    const n = s.skills.drone >= 6 ? 4 : s.skills.drone >= 3 ? 2 : 1;
    for (let i = 0; i < n; i++)
      shipArt(c, s.x + (i - (n - 1) / 2) * 34, s.y + 15, "manta", s.time, 0.35);
  }
  c.globalAlpha = s.inv > 0 ? 0.65 + 0.35 * Math.sin(s.time * 25) : 1;
  shipArt(c, s.x, s.y, s.ship, s.time, 1, opts.bank || 0);
  c.globalAlpha = 1;
  if (s.shield) {
    c.beginPath();
    c.ellipse(s.x, s.y, 25, 34, 0, 0, 7);
    c.strokeStyle = "#f4e8a8";
    c.lineWidth = 2;
    c.stroke();
  }
  ellipse(c, s.x, s.y, 4, 4, "#fff7d6", "#254a62");
  for (const f of fx) {
    const q = Math.max(0, 1 - f.age / f.life);
    c.globalAlpha = q;
    if (f.type === "laser") {
      line(
        c,
        [
          [f.x, f.y],
          [f.x, 0],
        ],
        "#8fe7ef55",
        18,
      );
      line(
        c,
        [
          [f.x, f.y],
          [f.x, 0],
        ],
        "#e4ffff",
        4,
      );
    } else if (f.type === "arc") {
      line(
        c,
        [
          [f.x, f.y],
          [(f.x + f.tx) / 2 + 10, (f.y + f.ty) / 2],
          [f.tx, f.ty],
        ],
        "#bcb1ff",
        4,
      );
      line(
        c,
        [
          [f.x, f.y],
          [f.tx, f.ty],
        ],
        "#fff1ff",
        1,
      );
    } else if (["pulse", "frost", "shield", "evolve"].includes(f.type)) {
      c.beginPath();
      c.arc(f.x, f.y, (1 - q) * (f.radius || 180) + 15, 0, 7);
      c.strokeStyle = f.type === "frost" ? "#a9e6ff" : "#f3dfa2";
      c.lineWidth = 2 + q * 3;
      c.stroke();
    } else if (f.type === "aim") {
      line(
        c,
        [
          [f.x, f.y],
          [f.tx, f.ty],
        ],
        "#ff9a7340",
        1,
      );
      ellipse(c, f.x, f.y, 12, 12, "#ffbf7835");
    } else if (["explode", "blast", "spark", "muzzle"].includes(f.type)) {
      const r = f.big
        ? 40
        : f.type === "blast"
          ? f.radius
          : f.type === "explode"
            ? 18
            : 6;
      for (let i = 0; i < 6; i++) {
        const a = i * 1.047;
        line(
          c,
          [
            [
              f.x + Math.cos(a) * r * (1 - q) * 0.4,
              f.y + Math.sin(a) * r * (1 - q) * 0.4,
            ],
            [f.x + Math.cos(a) * r * (1 - q), f.y + Math.sin(a) * r * (1 - q)],
          ],
          "#ffd49c",
          2,
        );
      }
      ellipse(c, f.x, f.y, r * q * 0.5, r * q * 0.5, "#fff2c9");
    }
    c.globalAlpha = 1;
  }
  if (s.time < 7) {
    c.fillStyle = "#d9e7e9";
    c.font = "12px sans-serif";
    c.textAlign = "center";
    c.fillText("드래그해서 이동 · 기체 중앙의 흰 점을 지키세요", W / 2, H - 30);
  }
  c.restore();
}
const thisPattern = (id) => (id - 1) % 3;
