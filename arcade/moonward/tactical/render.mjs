import { PATH, PADS, TYPES, pointAt, stats } from "./data.mjs";
export async function loadArt() {
  const images = {};
  await Promise.all(
    [
      "archer",
      "ember",
      "frost",
      "wisp",
      "wolf",
      "beetle",
      "boss",
      "forest",
    ].map(
      (k) =>
        new Promise((resolve, reject) => {
          const im = new Image();
          images[k] = im;
          im.onload = resolve;
          im.onerror = () => reject(new Error("아트 로딩 실패: " + k));
          im.src = "../art/" + k + ".webp";
        }),
    ),
  );
  return images;
}
export function paint(
  ctx,
  images,
  s,
  selected,
  effects,
  time,
  reduced,
  paused,
) {
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  ctx.clearRect(0, 0, 460, 300);
  const bg = images.forest;
  ctx.drawImage(
    bg,
    0,
    (bg.height - (bg.width * 300) / 460) / 2,
    bg.width,
    (bg.width * 300) / 460,
    0,
    0,
    460,
    300,
  );
  ctx.fillStyle = "#0a24272b";
  ctx.fillRect(0, 0, 460, 300);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  PATH.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.strokeStyle = "#122b32";
  ctx.lineWidth = 30;
  ctx.stroke();
  ctx.strokeStyle = "#7b8980";
  ctx.lineWidth = 24;
  ctx.stroke();
  ctx.strokeStyle = "#3b5556";
  ctx.lineWidth = 19;
  ctx.stroke();
  ctx.setLineDash([5, 10]);
  ctx.strokeStyle = "#c6cdae44";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#acb391";
  ctx.fillRect(442, 239, 9, 42);
  ctx.fillRect(457, 239, 9, 42);
  ctx.fillStyle = "#edca7e";
  ctx.fillRect(451, 253, 6, 26);
  ctx.font = "bold 10px system-ui";
  ctx.fillStyle = "#f5e3b8";
  ctx.textAlign = "left";
  ctx.fillText("침입 →", 8, 43);
  ctx.fillText("성문", 433, 231);
  const unit = s.units.find((u) => u.pad === selected);
  if (unit) {
    const [x, y] = PADS[unit.pad];
    ctx.beginPath();
    ctx.arc(x, y, stats(unit).range, 0, Math.PI * 2);
    ctx.fillStyle = TYPES[unit.kind].color + "10";
    ctx.fill();
    ctx.strokeStyle = TYPES[unit.kind].color + "88";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  for (const [i, [x, y]] of PADS.entries()) {
    ctx.beginPath();
    ctx.ellipse(x, y + 8, 18, 8, 0, 0, 7);
    ctx.fillStyle = "#142b31cc";
    ctx.fill();
    ctx.strokeStyle = "#b5c89d88";
    ctx.lineWidth = 1;
    ctx.stroke();
    if (!s.units.some((u) => u.pad === i)) {
      ctx.fillStyle = "#d1ddbc";
      ctx.textAlign = "center";
      ctx.font = "14px serif";
      ctx.fillText(String(i + 1), x, y + 4);
    }
  }
  const sprite = (kind, x, y, size, alpha = 1) => {
    ctx.globalAlpha = alpha;
    ctx.drawImage(images[kind], x - size / 2, y - size * 0.72, size, size);
    ctx.globalAlpha = 1;
  };
  for (const f of s.fields) {
    const glow = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, 37);
    glow.addColorStop(0, "#ffb74888");
    glow.addColorStop(1, "#f04c0000");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 37, 0, 7);
    ctx.fill();
    for (let i = 0; i < 5; i++) {
      const a = i * 2.4,
        x = f.x + Math.cos(a) * 22,
        y = f.y + Math.sin(a) * 15,
        h = reduced ? 8 : 8 + Math.sin(time / 100 + i) * 3;
      ctx.fillStyle = "#ffba60";
      ctx.beginPath();
      ctx.moveTo(x - 3, y + 3);
      ctx.quadraticCurveTo(x - 6, y - 3, x + 1, y - h);
      ctx.quadraticCurveTo(x + 6, y + 2, x - 3, y + 3);
      ctx.fill();
    }
  }
  for (const e of s.enemies) {
    const p = pointAt(e.d),
      size = e.kind === "boss" ? 54 : 31,
      bob = reduced || paused ? 0 : Math.sin(time / 120 + e.id) * 1.5;
    sprite(e.kind, p.x, p.y + bob, size);
    if (e.slow > 0) {
      ctx.strokeStyle = "#a9eeff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 6, size * 0.45, 7, 0, 0, 7);
      ctx.stroke();
      ctx.fillStyle = "#c7f6ff";
      ctx.font = "bold 9px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(
        "-" + Math.round(e.slowRate * 100) + "%",
        p.x,
        p.y - size * 0.7 - 7,
      );
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(p.x - 9 + i * 9, p.y + 5);
        ctx.lineTo(p.x - 6 + i * 9, p.y - 6);
        ctx.lineTo(p.x - 3 + i * 9, p.y + 5);
        ctx.stroke();
      }
    }
    if (e.flash > 0 && !reduced) {
      ctx.fillStyle = "#fff9";
      ctx.beginPath();
      ctx.arc(p.x, p.y - 8, 4, 0, 7);
      ctx.fill();
    }
    ctx.fillStyle = "#13262d";
    ctx.fillRect(p.x - size * 0.4, p.y - size * 0.7, size * 0.8, 3);
    ctx.fillStyle = e.kind === "boss" ? "#f1aebd" : "#b5df97";
    ctx.fillRect(
      p.x - size * 0.4,
      p.y - size * 0.7,
      (size * 0.8 * e.hp) / e.max,
      3,
    );
  }
  for (const u of s.units) {
    const [x, y] = PADS[u.pad],
      attack = effects.some(
        (e) => e.type === "attack" && e.x === x && e.y === y && e.life > 0.4,
      );
    sprite(u.kind, x, y - (attack && !reduced ? 3 : 0), u.upgrade ? 51 : 46);
    if (u.upgrade) {
      ctx.strokeStyle = TYPES[u.kind].color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y + 9, 20, 9, 0, 0, 7);
      ctx.stroke();
    }
  }
  for (const e of effects) {
    const k = 1 - e.life / e.total;
    ctx.globalAlpha = Math.max(0, 1 - k);
    if (e.type === "attack") {
      ctx.strokeStyle = TYPES[e.kind].color;
      ctx.fillStyle = TYPES[e.kind].color;
      ctx.lineWidth = e.kind === "ember" ? 3 : 2;
      if (k < 0.35) {
        const q = k / 0.35,
          x = e.x + (e.tx - e.x) * q,
          y = e.y - 12 + (e.ty - e.y + 12) * q;
        ctx.beginPath();
        ctx.moveTo(
          e.x + (e.tx - e.x) * Math.max(0, q - 0.22),
          e.y - 12 + (e.ty - e.y + 12) * Math.max(0, q - 0.22),
        );
        ctx.lineTo(x, y);
        ctx.stroke();
        if (e.kind === "ember") {
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 7);
          ctx.fill();
        } else if (e.kind === "archer") {
          const a = Math.atan2(e.ty - e.y + 12, e.tx - e.x);
          ctx.beginPath();
          ctx.moveTo(x - 7 * Math.cos(a - 0.4), y - 7 * Math.sin(a - 0.4));
          ctx.lineTo(x, y);
          ctx.lineTo(x - 7 * Math.cos(a + 0.4), y - 7 * Math.sin(a + 0.4));
          ctx.stroke();
        }
      } else if (e.kind === "ember") {
        const r = e.radius * (reduced ? 1 : Math.min(1, (k - 0.35) * 3));
        ctx.beginPath();
        ctx.arc(e.tx, e.ty, r, 0, 7);
        ctx.fillStyle = "#ff9b3833";
        ctx.fill();
        ctx.stroke();
        ctx.font = "bold 11px system-ui";
        ctx.textAlign = "center";
        ctx.fillStyle = e.combo ? "#b5f2ff" : "#ffe1b0";
        ctx.fillText(
          (e.combo ? "둔화 연계 · " : "") + e.victims.length + "명 명중",
          Math.max(60, Math.min(400, e.tx)),
          Math.max(24, e.ty - 27),
        );
      } else
        for (const p of e.victims) {
          ctx.beginPath();
          for (let i = 0; i < (e.kind === "frost" ? 6 : 3); i++) {
            const a = (i * Math.PI) / 3;
            ctx.moveTo(p.x + Math.cos(a) * 3, p.y + Math.sin(a) * 3);
            ctx.lineTo(p.x + Math.cos(a) * 12, p.y + Math.sin(a) * 12);
          }
          ctx.stroke();
        }
      if (e.upgrade === "pierce") {
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        for (const p of e.victims) ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
    } else if (e.type === "death")
      sprite(e.kind, e.x, e.y + 8 * k, 30 * (1 - k * 0.3), 1 - k);
    else if (e.type === "build") {
      const [x, y] = PADS[e.pad];
      ctx.strokeStyle = "#ffe6ae";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, 20 + k * 18, 10 + k * 9, 0, 0, 7);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  if (paused) {
    ctx.fillStyle = "#10252a25";
    ctx.fillRect(0, 0, 460, 300);
  }
}
