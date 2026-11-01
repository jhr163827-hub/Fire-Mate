import { PATH, W, H, TOWERS, FOES, stats } from "./data.mjs";
const poly = (c, pts, fill, stroke = "#263d3f", width = 2) => {
  c.beginPath();
  pts.forEach((p, i) => (i ? c.lineTo(...p) : c.moveTo(...p)));
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = width;
    c.stroke();
  }
};
const oval = (c, x, y, rx, ry, fill, stroke) => {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, 7);
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = 2;
    c.stroke();
  }
};
const line = (c, pts, color, width) => {
  c.beginPath();
  pts.forEach((p, i) => (i ? c.lineTo(...p) : c.moveTo(...p)));
  c.strokeStyle = color;
  c.lineWidth = width;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.stroke();
};
export function tower(c, t, scale = 1) {
  c.save();
  c.translate(t.x, t.y);
  c.scale(scale, scale);
  const color = TOWERS[t.kind].color,
    n = t.level || 0;
  oval(c, 1, 10, 23, 10, "#23453644");
  poly(
    c,
    [
      [-18, 0],
      [-10, -13],
      [13, -13],
      [20, 0],
      [12, 13],
      [-11, 13],
    ],
    "#667c75",
  );
  poly(
    c,
    [
      [-14, -2],
      [-7, -12],
      [9, -12],
      [15, -2],
      [9, 7],
      [-8, 7],
    ],
    "#b9c6a9",
  );
  for (let i = 0; i < n; i++)
    poly(
      c,
      [
        [-14 + i * 10, 9],
        [-10 + i * 10, 5],
        [-6 + i * 10, 9],
        [-10 + i * 10, 13],
      ],
      "#fff1ab",
    );
  if (t.kind === "dart" || t.kind === "bomb") {
    c.save();
    c.translate(0, -5);
    c.rotate(t.angle || -0.5);
    oval(c, 0, 0, 14, 13, color, "#384746");
    poly(
      c,
      [
        [0, -6],
        [26, -6],
        [28, -3],
        [28, 3],
        [26, 6],
        [0, 6],
      ],
      t.kind === "dart" ? "#486464" : "#394650",
    );
    poly(
      c,
      [
        [7, -5],
        [25, -5],
        [25, -1],
        [7, -1],
      ],
      "#aec9ba",
      null,
    );
    line(
      c,
      [
        [26, -6],
        [26, 6],
      ],
      "#1d343b",
      4,
    );
    if (n >= 2 && t.branch === 0) {
      line(
        c,
        [
          [3, 10],
          [24, 10],
        ],
        "#344f52",
        6,
      );
      line(
        c,
        [
          [3, -10],
          [24, -10],
        ],
        "#344f52",
        6,
      );
    }
    if (t.kind === "bomb") {
      poly(
        c,
        [
          [-2, -10],
          [17, -12],
          [22, -9],
          [22, 9],
          [17, 12],
          [-2, 10],
        ],
        "#53656b",
      );
      line(
        c,
        [
          [20, -10],
          [20, 10],
        ],
        "#263e43",
        5,
      );
      line(
        c,
        [
          [4, -8],
          [16, -9],
        ],
        "#c4cba6",
        3,
      );
    }
    if (t.kind === "bomb") {
      oval(c, -4, 0, 9, 9, "#d88d44", "#4b4636");
      poly(
        c,
        [
          [-8, -3],
          [-1, -3],
          [-1, 3],
          [-8, 3],
        ],
        "#ffe7a4",
        null,
      );
    } else oval(c, -4, 0, 6, 6, "#ffe797");
    c.restore();
  } else if (t.kind === "ice") {
    poly(
      c,
      [
        [-10, 3],
        [-8, -17],
        [8, -17],
        [11, 3],
      ],
      "#367e95",
    );
    poly(
      c,
      [
        [0, -36],
        [10, -22],
        [0, -8],
        [-10, -22],
      ],
      "#b7faff",
      "#40859a",
    );
    line(
      c,
      [
        [0, -31],
        [0, -12],
      ],
      "#fff",
      2,
    );
    for (let i = 0; i < 3; i++) {
      let y = -10 + i * 5;
      line(
        c,
        [
          [-12, y],
          [12, y],
        ],
        "#6be4ed",
        3,
      );
    }
    if (n >= 2) {
      poly(
        c,
        [
          [-16, -27],
          [-11, -17],
          [-17, -9],
          [-21, -17],
        ],
        "#a3f3ed",
      );
      poly(
        c,
        [
          [17, -27],
          [22, -17],
          [17, -9],
          [11, -17],
        ],
        "#a3f3ed",
      );
    }
  } else {
    poly(
      c,
      [
        [-10, 3],
        [-7, -22],
        [7, -22],
        [10, 3],
      ],
      "#716184",
    );
    for (let i = 0; i < 4; i++)
      oval(c, 0, -6 - i * 5, 11 - i, 3, "#c9b6e2", "#725886");
    oval(c, 0, -28, 8, 8, "#f0d6ff", "#796492");
    line(
      c,
      [
        [-3, -34],
        [3, -28],
        [-2, -23],
      ],
      "#fff",
      2,
    );
    if (n >= 2) {
      line(
        c,
        [
          [-16, 0],
          [-16, -20],
          [0, -28],
          [16, -20],
          [16, 0],
        ],
        "#afa1c4",
        4,
      );
    }
  }
  if (n === 3) {
    c.strokeStyle = color;
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(0, 3, 23, 14, 0, 0, 7);
    c.stroke();
  }
  c.restore();
}
function foe(c, e, time) {
  c.save();
  c.translate(e.x, e.y);
  const wob = Math.sin(time * 9 + e.id) * 1.5,
    boss = e.kind === "boss";
  oval(c, 0, 8, boss ? 27 : 13, boss ? 12 : 6, "#173e4c30");
  c.translate(0, wob);
  if (e.kind === "bud") {
    poly(
      c,
      [
        [-13, 5],
        [-14, -2],
        [-9, -12],
        [0, -17],
        [10, -11],
        [14, -2],
        [11, 6],
      ],
      "#a6cc58",
      "#46734a",
    );
    poly(
      c,
      [
        [0, -15],
        [-7, -25],
        [3, -22],
        [8, -27],
        [7, -16],
      ],
      "#3f9c60",
      "#427649",
    );
  } else if (e.kind === "runner" || e.kind === "armor") {
    for (const side of [-1, 1])
      for (let i = 0; i < 3; i++)
        line(
          c,
          [
            [side * 9, -8 + i * 7],
            [
              side * (18 + (i % 2 ? 2 : 0)),
              -12 + i * 10 + Math.sin(time * 18 + i) * 3,
            ],
          ],
          "#354e51",
          2,
        );
    oval(
      c,
      0,
      -2,
      13,
      17,
      e.kind === "armor" ? "#7d8e9b" : "#d77c4f",
      "#3b5055",
    );
    if (e.kind === "armor") {
      poly(
        c,
        [
          [-11, -7],
          [0, -15],
          [11, -7],
          [10, 5],
          [0, 11],
          [-10, 5],
        ],
        e.broken ? "#ada8a1" : "#bfd0cf",
        "#58727b",
      );
      line(
        c,
        [
          [0, -13],
          [0, 9],
        ],
        "#647d85",
        2,
      );
    } else {
      line(
        c,
        [
          [-8, -9],
          [7, -9],
        ],
        "#f9cd77",
        3,
      );
      line(
        c,
        [
          [-8, -2],
          [7, -2],
        ],
        "#f9cd77",
        3,
      );
    }
  } else if (e.kind === "pod") {
    oval(c, 0, -3, 20, 21, "#c5a362", "#6c6651");
    for (let i = -1; i <= 1; i++)
      line(
        c,
        [
          [i * 7, -21],
          [i * 10, 10],
        ],
        "#826f4e",
        2,
      );
    poly(
      c,
      [
        [0, -25],
        [-10, -34],
        [3, -29],
        [14, -34],
        [11, -23],
      ],
      "#558b58",
      "#426650",
    );
  } else {
    for (const x of [-22, 22])
      for (let i = 0; i < 3; i++)
        oval(c, x, -10 + i * 11, 8, 8, "#42545a", "#283a41");
    poly(
      c,
      [
        [-25, -20],
        [-14, -31],
        [16, -31],
        [26, -19],
        [26, 12],
        [15, 20],
        [-15, 20],
        [-26, 10],
      ],
      "#8a705b",
      "#3c4d44",
      3,
    );
    poly(
      c,
      [
        [-17, -18],
        [0, -28],
        [18, -18],
        [16, 8],
        [0, 16],
        [-18, 8],
      ],
      "#77a669",
      "#405d4e",
    );
    line(
      c,
      [
        [0, -25],
        [0, 13],
      ],
      "#395548",
      3,
    );
    poly(
      c,
      [
        [-17, -24],
        [-21, -41],
        [-9, -31],
        [0, -40],
        [9, -31],
        [23, -42],
        [18, -24],
      ],
      "#b0c77b",
      "#476d53",
    );
  }
  const eyeY = e.kind === "pod" ? 2 : boss ? -3 : -3;
  for (const x of [-5, 5]) {
    oval(c, x, eyeY, 3, 4, "#fff2be");
    oval(c, x + 1, eyeY, 1.5, 2.5, "#233f46");
  }
  if (e.slow) {
    c.strokeStyle = "#a8faff";
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(0, 5, boss ? 29 : 17, boss ? 18 : 12, 0, 0, 7);
    c.stroke();
  }
  if (e.flash) {
    c.globalAlpha = 0.35;
    oval(c, 0, -3, boss ? 24 : 14, boss ? 25 : 15, "#fff");
    c.globalAlpha = 1;
  }
  if (e.hp < e.max || boss) {
    let w = boss ? 56 : 28;
    c.fillStyle = "#334b4d";
    c.fillRect(-w / 2, boss ? -48 : -32, w, 4);
    c.fillStyle = e.broken ? "#ffd28b" : "#d9f78b";
    c.fillRect(-w / 2, boss ? -48 : -32, (w * e.hp) / e.max, 4);
  }
  c.restore();
}
let background;
function landscape() {
  const c = document.createElement("canvas");
  c.width = W * 2;
  c.height = H * 2;
  const g = c.getContext("2d");
  g.scale(2, 2);
  g.fillStyle = "#91b875";
  g.fillRect(0, 0, W, H);
  let seed = 17;
  const r = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 450; i++) {
    let x = r() * W,
      y = r() * H;
    oval(
      g,
      x,
      y,
      1 + r() * 4,
      0.6 + r() * 1.4,
      r() > 0.5 ? "#bdd28e66" : "#427c4b22",
    );
  }
  line(g, PATH, "#526f4f", 49);
  line(g, PATH, "#c49b63", 43);
  line(g, PATH, "#e7c28a", 35);
  line(g, PATH, "#ebcd98", 25);
  for (let d = 0; d < 70; d++) {
    let i = Math.floor(r() * (PATH.length - 1)),
      a = PATH[i],
      b = PATH[i + 1],
      q = r();
    oval(
      g,
      a[0] + (b[0] - a[0]) * q + (r() - 0.5) * 14,
      a[1] + (b[1] - a[1]) * q + (r() - 0.5) * 14,
      1.5,
      0.8,
      "#9d7e5133",
    );
  }
  for (const [x, y] of [
    [15, 15],
    [40, 20],
    [590, 20],
    [625, 30],
    [610, 240],
    [620, 280],
    [15, 160],
    [32, 200],
    [25, 360],
    [45, 385],
    [290, 380],
    [330, 390],
  ]) {
    oval(g, x + 3, y + 13, 18, 8, "#386c4433");
    line(
      g,
      [
        [x, y],
        [x, y + 16],
      ],
      "#715d3d",
      5,
    );
    for (const [a, b, z] of [
      [-8, 0, 15],
      [9, -2, 15],
      [0, -14, 17],
    ])
      oval(g, x + a, y + b, z, z * 0.82, "#477f54", "#3e744d");
    oval(g, x - 4, y - 19, 9, 6, "#77a85e");
  }
  for (const [x, y] of [
    [470, 270],
    [310, 135],
    [205, 270],
  ]) {
    oval(g, x, y, 15, 7, "#547b5555");
    poly(
      g,
      [
        [x - 11, y],
        [x - 6, y - 10],
        [x + 5, y - 12],
        [x + 13, y - 2],
        [x + 7, y + 3],
      ],
      "#9ca98c",
      "#748c77",
      1,
    );
  }
  // Hand-built entrance banner and exit workshop.
  line(
    g,
    [
      [24, 42],
      [24, 17],
    ],
    "#6a563f",
    3,
  );
  poly(
    g,
    [
      [25, 17],
      [48, 20],
      [42, 27],
      [25, 26],
    ],
    "#efb653",
    "#675a41",
    1,
  );
  poly(
    g,
    [
      [603, 355],
      [603, 314],
      [635, 314],
      [635, 355],
    ],
    "#49696b",
  );
  poly(
    g,
    [
      [596, 316],
      [619, 297],
      [642, 316],
    ],
    "#c16c4b",
    "#4c5853",
  );
  poly(
    g,
    [
      [613, 355],
      [613, 334],
      [625, 334],
      [625, 355],
    ],
    "#233f45",
  );
  g.fillStyle = "#fff0bc";
  g.fillRect(608, 321, 6, 6);
  g.fillRect(626, 321, 6, 6);
  return c;
}
export function paint(c, s, ui, fx, now) {
  if (!background) background = landscape();
  c.clearRect(0, 0, 1280, 800);
  c.save();
  c.scale(2, 2);
  c.drawImage(background, 0, 0, W, H);
  const t = s.towers.find((t) => t.id === ui.selected),
    preview = ui.preview;
  if (t || preview) {
    let p = preview || t,
      a = stats(preview ? { kind: ui.build, level: 0, branch: -1 } : t);
    c.beginPath();
    c.arc(p.x, p.y, a.range, 0, 7);
    c.fillStyle = preview && !ui.valid ? "#ed635533" : "#efffdc30";
    c.fill();
    c.strokeStyle = preview && !ui.valid ? "#e26e56" : "#fff5bd";
    c.lineWidth = 2;
    c.setLineDash([5, 4]);
    c.stroke();
    c.setLineDash([]);
  }
  for (const f of s.fields) {
    oval(c, f.x, f.y, f.radius, f.radius * 0.7, "#f08c3e55");
    for (let i = 0; i < 6; i++) {
      let a = i * 2.4;
      poly(
        c,
        [
          [
            f.x + Math.sin(a) * f.radius * 0.6 - 4,
            f.y + Math.cos(a) * f.radius * 0.5,
          ],
          [
            f.x + Math.sin(a) * f.radius * 0.6,
            f.y + Math.cos(a) * f.radius * 0.5 - 12 - Math.sin(now * 8 + i) * 4,
          ],
          [
            f.x + Math.sin(a) * f.radius * 0.6 + 4,
            f.y + Math.cos(a) * f.radius * 0.5,
          ],
        ],
        "#ffd36b",
        null,
      );
    }
  }
  for (const o of [
    ...s.towers.map((t) => ({ ...t, unit: true })),
    ...s.enemies,
  ].sort((a, b) => a.y - b.y))
    o.unit ? tower(c, o) : foe(c, o, now);
  if (preview) {
    c.globalAlpha = 0.65;
    tower(c, { ...preview, kind: ui.build, level: 0 });
    c.globalAlpha = 1;
  }
  for (const p of s.shots) {
    let q = 1 - p.time / p.total,
      x = p.x + (p.tx - p.x) * q,
      y = p.y + (p.ty - p.y) * q;
    if (p.kind === "meteor") {
      x = p.tx + (1 - q) * 80;
      y = p.ty - (1 - q) * 200;
      line(
        c,
        [
          [x + 15, y - 35],
          [x, y],
        ],
        "#ffd489",
        8,
      );
      oval(c, x, y, 10, 10, "#ed7445", "#fff3bc");
    } else if (p.kind === "bomb") {
      y -= Math.sin(q * Math.PI) * 30;
      oval(c, x, y, 5, 5, "#354852", "#fff4bc");
    } else {
      line(
        c,
        [
          [
            x - 5 * Math.cos(Math.atan2(p.ty - p.y, p.tx - p.x)),
            y - 5 * Math.sin(Math.atan2(p.ty - p.y, p.tx - p.x)),
          ],
          [x, y],
        ],
        "#fff7d0",
        3,
      );
    }
  }
  for (const f of fx) {
    let q = f.life / f.max;
    c.globalAlpha = q;
    if (f.type === "arc") {
      line(
        c,
        [
          [f.x, f.y],
          [(f.x + f.tx) / 2 + 5, (f.y + f.ty) / 2 - 8],
          [f.tx, f.ty],
        ],
        "#f4e9ff",
        4,
      );
      line(
        c,
        [
          [f.x, f.y],
          [f.tx, f.ty],
        ],
        "#9c76dc",
        1,
      );
    } else if (f.type === "ice") {
      c.strokeStyle = "#cffaff";
      c.lineWidth = 3;
      c.beginPath();
      c.arc(f.x, f.y, f.radius * (1 - q), 0, 7);
      c.stroke();
    } else if (
      f.type === "blast" ||
      f.type === "build" ||
      f.type === "warning"
    ) {
      c.strokeStyle = f.type === "warning" ? "#f46b3f" : "#fff2ac";
      c.lineWidth = f.type === "blast" ? 5 : 2;
      c.beginPath();
      c.arc(f.x, f.y, (f.radius || 30) * (1 - q * 0.5), 0, 7);
      c.stroke();
    } else if (f.type === "pop") {
      for (let i = 0; i < 6; i++) {
        let a = (i * Math.PI) / 3;
        poly(
          c,
          [
            [
              f.x + Math.cos(a) * (1 - q) * 25,
              f.y + Math.sin(a) * (1 - q) * 25,
            ],
            [
              f.x + Math.cos(a) * (1 - q) * 25 + 3,
              f.y + Math.sin(a) * (1 - q) * 25 + 1,
            ],
            [
              f.x + Math.cos(a) * (1 - q) * 25,
              f.y + Math.sin(a) * (1 - q) * 25 + 4,
            ],
          ],
          "#fff0a1",
          null,
        );
      }
    } else if (f.type === "split") {
      c.font = "bold 12px sans-serif";
      c.fillStyle = "#214747";
      c.fillText("분열!", f.x - 14, f.y - 25 - (1 - q) * 12);
    }
    c.globalAlpha = 1;
  }
  if (ui.spell) {
    c.fillStyle = "#163e4e44";
    c.fillRect(0, 0, W, H);
    c.fillStyle = "#fff6cf";
    c.font = "bold 17px sans-serif";
    c.textAlign = "center";
    c.fillText("포격할 길목을 누르세요", 320, 30);
    c.textAlign = "left";
  }
  c.restore();
}
