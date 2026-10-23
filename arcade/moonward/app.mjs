import { Game } from "./engine.mjs";
import {
  RULES,
  TYPES,
  KEYS,
  PADS,
  PATH,
  LENGTH,
  pointAt,
  waveSpec,
  tierScale,
  SAVE_KEY,
} from "./data.mjs";
import { sprites, loadArt } from "./art.mjs";
const $ = (s) => document.querySelector(s),
  canvas = $("#canvas"),
  ctx = canvas.getContext("2d"),
  dialog = $("#dialog");
let game = new Game(),
  selected = 0,
  moving = false,
  paused = false,
  speed = 1,
  acc = 0,
  last = 0,
  raf = 0,
  effects = [],
  shots = [],
  flash = 0,
  bannerUntil = 0,
  lastSave = 0,
  lastUI = 0,
  disposed = false,
  audio = null,
  mute = true,
  reduced = matchMedia("(prefers-reduced-motion:reduce)").matches,
  saveOK = true;
const bg = new Image();
bg.src = "art/forest.webp";
function notice(text) {
  $("#hint").textContent = text;
}
function banner(text) {
  $("#banner").textContent = text;
  $("#banner").classList.add("show");
  bannerUntil = performance.now() + 2200;
}
function save() {
  if (saved) return;
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        version: 1,
        game: game.s,
        options: { mute, reduced },
        best: best,
      }),
    );
    saveOK = true;
  } catch {
    saveOK = false;
  }
  $("#saveStatus").textContent = saveOK
    ? "진행 자동 저장"
    : "저장 불가 · 브라우저 저장 공간 확인";
}
let best = 0,
  saved = null;
try {
  let raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
  if (raw) {
    saved = Game.restore(JSON.stringify(raw.game));
    best = Number.isInteger(raw.best) && raw.best >= 0 ? raw.best : 0;
    mute = raw.options?.mute !== false;
    reduced =
      typeof raw.options?.reduced === "boolean" ? raw.options.reduced : reduced;
    if (!saved) notice("저장 데이터를 읽지 못했어요. 새 판으로 시작합니다.");
  }
} catch {
  notice("저장 데이터를 읽지 못했어요. 새 판으로 시작합니다.");
}
function tone(freq = 440, duration = 0.06) {
  if (mute || document.hidden) return;
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") audio.resume();
    let o = audio.createOscillator(),
      g = audio.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(freq, audio.currentTime);
    o.frequency.exponentialRampToValueAtTime(
      freq * 0.6,
      audio.currentTime + duration,
    );
    g.gain.setValueAtTime(0.035, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    o.connect(g).connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + duration);
  } catch {}
}
function modal(html, closable = true) {
  paused = true;
  $("#dialogBody").innerHTML = html;
  $("#closeDialog").hidden = !closable;
  if (!dialog.open) dialog.showModal();
  update();
}
function close() {
  dialog.close();
  paused = false;
  acc = 0;
  last = performance.now();
  update();
}
$("#closeDialog").onclick = close;
dialog.addEventListener("cancel", (e) => {
  if ($("#closeDialog").hidden) e.preventDefault();
  else {
    paused = false;
    last = performance.now();
    acc = 0;
  }
});
function menu() {
  modal(
    '<div class="eyebrow">MOONWARD</div><h2>잠깐 쉬어가기</h2><p>진행은 자동 저장됩니다. 돌아오면 이어서 플레이하세요.</p><label class="setting">효과음<input id="sound" type="checkbox" ' +
      (!mute ? "checked" : "") +
      '></label><label class="setting">효과 줄이기<input id="motion" type="checkbox" ' +
      (reduced ? "checked" : "") +
      '></label><button id="restart">새로운 판 시작</button><button id="leave">저장하고 나가기</button>',
  );
  $("#sound").onchange = (e) => {
    mute = !e.target.checked;
    save();
    tone(600);
  };
  $("#motion").onchange = (e) => {
    reduced = e.target.checked;
    save();
  };
  $("#restart").onclick = confirmRestart;
  $("#leave").onclick = () => {
    save();
    dispose();
    location.href = "../index.html";
  };
}
function confirmRestart() {
  modal(
    '<h2>새로운 숲으로?</h2><p>현재 판의 진행은 새 판으로 바뀝니다. 최고 도달 웨이브는 유지됩니다.</p><button id="yesRestart" class="primary">현재 판을 끝내고 새로 시작</button>',
  );
  $("#yesRestart").onclick = () => {
    game = new Game();
    selected = 0;
    moving = false;
    effects = [];
    shots = [];
    flash = 0;
    bannerUntil = 0;
    $("#banner").classList.remove("show");
    acc = 0;
    close();
    save();
    notice("빈 제단을 선택하고 수호자를 소환하세요.");
  };
}
$("#menu").onclick = menu;
$("#speed").onclick = () => {
  speed = speed === 1 ? 2 : 1;
  $("#speed").textContent = speed + "×";
};
$("#exit").onclick = () => {
  save();
  dispose();
};
function unit() {
  return game.s.units.find((u) => u.pad === selected);
}
function emptyPad() {
  return PADS.findIndex((_, i) => !game.s.units.some((u) => u.pad === i));
}
function summon(kind) {
  let pad = unit() ? emptyPad() : selected;
  if (pad < 0) {
    notice("제단이 가득 찼어요. 합성하거나 판매해 공간을 만드세요.");
    return;
  }
  let u = game.summon(pad, kind);
  if (u) {
    selected = pad;
    tone(750);
    save();
    notice(TYPES[u.kind].name + " 소환! " + TYPES[u.kind].role);
  } else notice("달빛 조각이 부족해요. 적을 처치하면 얻습니다.");
  update();
}
$("#summon").onclick = () => summon();
$("#choose").onclick = () => {
  modal(
    "<h2>필요한 역할을 선택</h2><p>85 조각 · 확정 소환으로 조합을 완성하세요.</p>" +
      KEYS.map(
        (k) =>
          `<button class="choice" data-kind="${k}"><img src="${sprites[k].src}" alt=""><span>${TYPES[k].name}<small>${TYPES[k].role}</small></span></button>`,
      ).join(""),
  );
  dialog.querySelectorAll("[data-kind]").forEach(
    (b) =>
      (b.onclick = () => {
        close();
        summon(b.dataset.kind);
      }),
  );
};
$("#start").onclick = () => {
  if (game.start()) {
    save();
    notice("소환은 전투 중에도 가능해요. 같은 수호자 2명으로 합성하세요.");
  } else notice("수호자를 먼저 소환하세요.");
  update();
};
$("#move").onclick = () => {
  moving = !moving;
  notice(
    moving
      ? "이동할 제단을 누르세요. 다른 수호자가 있으면 자리를 교환합니다."
      : "이동을 취소했어요.",
  );
  update();
};
$("#merge").onclick = () => {
  let u = unit();
  if (!u) return;
  let partners = game.s.units.filter(
    (v) => v.id !== u.id && v.kind === u.kind && v.tier === u.tier,
  );
  if (!partners.length || u.tier >= 3) {
    notice("같은 종류·같은 등급 수호자 2명이 필요해요. 최고 등급은 ★★★입니다.");
    return;
  }
  modal(
    `<h2>${TYPES[u.kind].name} 합성</h2><p>선택한 ${"★".repeat(u.tier)} + 아래에서 고른 ${"★".repeat(u.tier)} → <b>${"★".repeat(u.tier + 1)}</b><br>공격력·독 피해 2.55배 / 범위·둔화·가속 유지<br>15 조각 · 선택한 제단에 남고 재료 1명이 사라집니다.</p>` +
      partners
        .map(
          (v) =>
            `<button data-merge="${v.id}">${v.pad + 1}번 제단 수호자를 재료로 합성</button>`,
        )
        .join(""),
  );
  dialog.querySelectorAll("[data-merge]").forEach(
    (b) =>
      (b.onclick = () => {
        let ok = game.merge(u.id, +b.dataset.merge);
        close();
        if (ok) {
          tone(950, 0.2);
          banner("수호자 각성 · " + "★".repeat(u.tier));
          save();
        } else notice("합성에 필요한 조각이 부족해요.");
        update();
      }),
  );
};
$("#sell").onclick = () => {
  let u = unit();
  if (!u) return;
  modal(
    `<h2>수호자를 돌려보낼까요?</h2><p>${TYPES[u.kind].name} ${"★".repeat(u.tier)}<br>${Math.floor(30 * 2 ** (u.tier - 1))} 조각을 돌려받습니다. 이 수호자는 사라집니다.</p><button id="confirmSell">판매 확정</button>`,
  );
  $("#confirmSell").onclick = () => {
    game.sell(u.id);
    close();
    save();
    update();
  };
};
$("#guide").onclick = () =>
  modal(
    "<h2>수호자 도감</h2><p>첫 소환은 궁수입니다. 랜덤 소환 네 번째마다 없는 역할을 우선 보장합니다. 랜덤 소환은 4% 확률로 2성입니다. 11회 연속 2성이 없으면 다음 랜덤 소환은 2성 보장. 지정 소환은 1성입니다. 같은 종류·등급 2명과 15 조각으로 합성하세요.</p>" +
      KEYS.map(
        (k) =>
          `<div class="choice"><img src="${sprites[k].src}" alt=""><p><b style="color:${TYPES[k].color}">${TYPES[k].name}</b><br>${TYPES[k].desc}</p></div>`,
      ).join("") +
      "<p>적이 성문에 도착하면 생명 −1, 보스는 −5. 6·12·18 웨이브에 보스가 등장합니다. 18 웨이브를 지키면 승리합니다.<br>별종의 가속은 중첩되지 않고 독은 가장 강한 피해로 갱신됩니다.</p>",
  );
PADS.forEach(([x, y], i) => {
  let b = document.createElement("button");
  b.className = "pad";
  b.style.left = (x / 360) * 100 + "%";
  b.style.top = (y / 460) * 100 + "%";
  b.setAttribute("aria-label", `${i + 1}번 빈 제단`);
  b.dataset.pad = i;
  b.onclick = () => {
    if (moving) {
      let u = unit();
      if (u) game.move(u.id, i);
      moving = false;
      save();
      notice("배치를 바꿨어요.");
    }
    selected = i;
    update();
  };
  $("#pads").append(b);
});
function update() {
  let s = game.s;
  $("#gold").textContent = s.gold;
  $("#lives").textContent = s.lives;
  $("#wave").innerHTML =
    String(Math.max(1, s.wave)).padStart(2, "0") + " <em>/ 18</em>";
  $("#progress").style.width = (s.wave / 18) * 100 + "%";
  $("#start").hidden = s.phase !== "ready";
  $("#start").disabled = !s.units.length;
  $("#summon").disabled =
    s.gold < 50 || s.units.length === PADS.length || !!s.result;
  $("#choose").disabled =
    s.gold < 85 || s.units.length === PADS.length || !!s.result;
  let u = unit();
  $("#unitActions").hidden = !u || !!s.result;
  if (u) {
    let t = TYPES[u.kind];
    $("#selection").innerHTML =
      `<strong>${t.name} <span style="display:inline;color:${t.color}">${"★".repeat(u.tier)}</span></strong><span>${t.role} · 공격 ${Math.round(t.damage * tierScale(u.tier))} / ${t.interval}초</span>`;
    let pair = s.units.some(
      (v) => v.id !== u.id && v.kind === u.kind && v.tier === u.tier,
    );
    $("#merge").disabled = u.tier === 3 || !pair || s.gold < 15;
    $("#merge").textContent = u.tier === 3 ? "최고 등급" : "합성 · 15";
    $("#move").textContent = moving ? "이동 취소" : "이동 / 교환";
  } else
    $("#selection").innerHTML =
      `<strong>${selected + 1}번 달빛 제단</strong><span>랜덤 50 · 지정 85 / 같은 수호자 2명으로 합성</span>`;
  document.querySelectorAll(".pad").forEach((b, i) => {
    let v = s.units.find((u) => u.pad === i);
    b.classList.toggle("selected", i === selected);
    b.innerHTML = v ? "<span>" + "★".repeat(v.tier) + "</span>" : "";
    b.setAttribute(
      "aria-label",
      v ? `${i + 1}번 ${TYPES[v.kind].name} ${v.tier}성` : `${i + 1}번 빈 제단`,
    );
    b.setAttribute("aria-pressed", String(i === selected));
  });
  $("#pauseLabel").hidden = !paused || dialog.open;
  if (s.phase === "rest")
    notice(
      `${s.wave} 웨이브 방어! ${Math.ceil(s.wait)}초 뒤 ${waveSpec(s.wave + 1).label} · 배치를 정비하세요.`,
    );
}
function result() {
  let s = game.s,
    r = s.result;
  best = Math.max(best, r.wave);
  save();
  let reason =
    s.units.length < 6
      ? "제단을 더 채워 여러 구간에서 공격해 보세요."
      : !s.units.some((u) => u.kind === "frost")
        ? "서리 마녀로 적을 늦추면 공격할 시간이 늘어나요."
        : !s.units.some((u) => u.kind === "ember")
          ? "잿불 연금술사로 밀집한 적을 함께 처치해 보세요."
          : "공격 범위가 겹치는 안쪽 제단에 강한 수호자를 배치해 보세요.";
  modal(
    `<div class="eyebrow">${r.win ? "THE FOREST REMEMBERS" : "ANOTHER MOON WILL RISE"}</div><h2>${r.win ? "새벽을 지켜냈어요" : "성문의 불빛이 꺼졌어요"}</h2><p>${r.win ? "18번의 습격을 막았습니다. 다음 판에는 다른 조합으로 숲을 지켜보세요." : reason}</p><div class="resultStats"><div>도달 웨이브<b>${r.wave}</b></div><div>처치<b>${r.kills}</b></div><div>전투 시간<b>${Math.floor(r.seconds / 60)}:${String(r.seconds % 60).padStart(2, "0")}</b></div></div><p>최고 도달 ${best} 웨이브 · 성문 피해 ${s.leaks}</p><button id="again" class="primary">다른 조합으로 다시 도전</button><button id="resultExit">아케이드로 돌아가기</button>`,
    false,
  );
  $("#again").onclick = () => {
    game = new Game();
    selected = 0;
    moving = false;
    effects = [];
    shots = [];
    flash = 0;
    bannerUntil = 0;
    $("#banner").classList.remove("show");
    close();
    save();
    notice("새로운 조합으로 숲을 지켜보세요.");
  };
  $("#resultExit").onclick = () => {
    save();
    dispose();
    location.href = "../index.html";
  };
}
function events() {
  for (let ev of game.drain()) {
    if (ev.type === "shot") {
      shots.push({ ...ev, life: 0.18 });
      if (shots.length > 80) shots.shift();
    } else if (ev.type === "death") {
      effects.push({ ...ev, life: 0.45, color: "#a0d0bf" });
    } else if (ev.type === "summon" || ev.type === "merge") {
      let [x, y] = PADS[ev.pad];
      effects.push({ x, y, life: 0.7, color: TYPES[ev.kind].color, big: true });
      if (ev.type === "summon" && ev.tier === 2) {
        banner("희귀 소환 · " + TYPES[ev.kind].name + " ★★");
        tone(1000, 0.3);
      }
    } else if (ev.type === "wave") {
      banner(
        ev.boss
          ? "월식의 파수꾼 · 보스 출현"
          : `WAVE ${String(ev.wave).padStart(2, "0")} · ${waveSpec(ev.wave).label}`,
      );
      if (ev.boss) tone(140, 0.5);
    } else if (ev.type === "leak") {
      flash = reduced ? 0 : 0.2;
      tone(120, 0.12);
    } else if (ev.type === "clear") {
      banner("방어 성공 · +" + ev.reward + " 조각");
      save();
    } else if (ev.type === "result") result();
  }
  effects = effects.slice(-80);
}
function strokePath() {
  ctx.beginPath();
  PATH.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
}
function render(t, dt) {
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  ctx.clearRect(0, 0, 360, 460);
  if (bg.complete && bg.naturalWidth) ctx.drawImage(bg, 0, 0, 360, 460);
  else {
    ctx.fillStyle = "#193332";
    ctx.fillRect(0, 0, 360, 460);
  }
  ctx.fillStyle = "#071b2433";
  ctx.fillRect(0, 0, 360, 460);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  strokePath();
  ctx.strokeStyle = "#071a22aa";
  ctx.lineWidth = 34;
  ctx.stroke();
  ctx.strokeStyle = "#65726a";
  ctx.lineWidth = 26;
  ctx.stroke();
  ctx.strokeStyle = "#394d4b";
  ctx.lineWidth = 22;
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.setLineDash([10, 3]);
  ctx.strokeStyle = "#91a18b30";
  ctx.lineWidth = 19;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineCap = "round";
  // Carved gate with warm moonstone, visually independent from the enemy sprites.
  ctx.fillStyle = "#263c46";
  ctx.fillRect(153, 428, 51, 32);
  ctx.fillStyle = "#81958d";
  ctx.fillRect(149, 426, 12, 34);
  ctx.fillRect(197, 426, 12, 34);
  ctx.fillStyle = "#b2af88";
  ctx.fillRect(146, 422, 18, 6);
  ctx.fillRect(194, 422, 18, 6);
  ctx.fillStyle = "#efca7f";
  ctx.fillRect(172, 439, 14, 21);
  ctx.strokeStyle = "#d6c89b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(179, 440, 18, Math.PI, 0);
  ctx.stroke();
  let sel = unit();
  if (sel) {
    let [x, y] = PADS[sel.pad];
    ctx.beginPath();
    ctx.arc(x, y, TYPES[sel.kind].range, 0, Math.PI * 2);
    ctx.fillStyle = TYPES[sel.kind].color + "0c";
    ctx.fill();
    ctx.strokeStyle = TYPES[sel.kind].color + "40";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  for (let i = 0; i < PADS.length; i++) {
    let [x, y] = PADS[i];
    ctx.fillStyle = "#0b2026aa";
    ctx.beginPath();
    ctx.ellipse(x, y + 10, 18, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#778f7a77";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y + 7, 16, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (!game.s.units.some((u) => u.pad === i)) {
      ctx.fillStyle = "#c0cbb78a";
      ctx.font = "16px serif";
      ctx.textAlign = "center";
      ctx.fillText("+", x, y + 5);
    }
  }
  for (let u of game.s.units) {
    let [x, y] = PADS[u.pad],
      bounce = reduced || paused ? 0 : Math.sin(t / 350 + u.id) * 1.2,
      attack = shots.some((s) => s.x === x && s.y === y && s.life > 0.12);
    let size = 49 + (u.tier - 1) * 3;
    ctx.save();
    ctx.translate(x, y);
    if (u.kind === "bell") {
      ctx.strokeStyle = "#d0b8ff33";
      ctx.beginPath();
      ctx.ellipse(0, 9, 21, 11, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.drawImage(
      sprites[u.kind],
      -size / 2,
      -size * 0.75 + bounce - (attack ? 2 : 0),
      size,
      size,
    );
    if (u.tier > 1) {
      ctx.strokeStyle = TYPES[u.kind].color + "99";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 10, 20, 10, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  for (let e of game.s.enemies) {
    let p = pointAt(e.d),
      size = e.boss ? 60 : 32,
      bob =
        reduced || paused
          ? 0
          : Math.sin(t / (e.kind === "wolf" ? 65 : 120) + e.id) * 1.4;
    ctx.fillStyle = "#07162388";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 8, size * 0.34, size * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(
      sprites[e.kind],
      p.x - size / 2,
      p.y - size * 0.68 + bob,
      size,
      size,
    );
    if (e.slow > 0) {
      ctx.strokeStyle = "#8ce7f299";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 9, size * 0.4, 5, 0, 0, 7);
      ctx.stroke();
    }
    if (e.poison > 0) {
      ctx.fillStyle = "#b4e584";
      ctx.beginPath();
      ctx.arc(p.x + size / 3, p.y - 10, 2.5, 0, 7);
      ctx.fill();
    }
    if (e.hp < e.max || e.boss) {
      let bw = e.boss ? 42 : 24;
      ctx.fillStyle = "#13222a";
      ctx.fillRect(p.x - bw / 2, p.y - size * 0.73 - 4, bw, 3);
      ctx.fillStyle = e.boss ? "#e1a2ca" : "#c6c993";
      ctx.fillRect(
        p.x - bw / 2,
        p.y - size * 0.73 - 4,
        bw * Math.max(0, e.hp / e.max),
        3,
      );
    }
  }
  for (let s of shots) {
    let k = 1 - s.life / 0.18;
    ctx.strokeStyle = TYPES[s.kind].color;
    ctx.lineWidth = s.kind === "ember" ? 3 : 1.5;
    ctx.globalAlpha = Math.min(1, s.life * 9);
    ctx.beginPath();
    ctx.moveTo(
      s.x + (s.tx - s.x) * Math.max(0, k - 0.3),
      s.y - 10 + (s.ty - s.y + 10) * Math.max(0, k - 0.3),
    );
    ctx.lineTo(s.x + (s.tx - s.x) * k, s.y - 10 + (s.ty - s.y + 10) * k);
    ctx.stroke();
    if (k > 0.65) {
      ctx.beginPath();
      ctx.arc(s.tx, s.ty, s.kind === "ember" ? 13 : 4, 0, 7);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (!paused) s.life -= dt;
  }
  for (let e of effects) {
    ctx.globalAlpha = Math.max(0, e.life * 1.5);
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(
      e.x,
      e.y,
      Math.max(1, (0.8 - e.life) * (e.big ? 45 : 20)),
      Math.max(1, (0.8 - e.life) * 15),
      0,
      0,
      7,
    );
    ctx.stroke();
    if (!reduced)
      for (let i = 0; i < 5; i++) {
        let a = i * 1.26;
        ctx.fillStyle = e.color;
        ctx.fillRect(
          e.x + Math.cos(a) * (0.8 - e.life) * 30,
          e.y + Math.sin(a) * (0.8 - e.life) * 30,
          2,
          2,
        );
      }
    ctx.globalAlpha = 1;
    if (!paused) e.life -= dt;
  }
  shots = shots.filter((s) => s.life > 0);
  effects = effects.filter((e) => e.life > 0);
  if (flash > 0) {
    ctx.fillStyle = `rgba(210,98,85,${flash})`;
    ctx.fillRect(0, 0, 360, 460);
    flash = Math.max(0, flash - dt);
  }
}
function frame(t) {
  if (disposed) return;
  let dt = Math.min(0.1, (t - (last || t)) / 1000);
  last = t;
  if (!paused && !document.hidden) {
    acc += dt * speed;
    let steps = 0;
    while (acc >= RULES.step && steps++ < 8) {
      game.step();
      acc -= RULES.step;
    }
    events();
  }
  render(t, dt);
  if (t - lastUI > 120) {
    update();
    lastUI = t;
  }
  if (t - lastSave > 4000 && !saved) {
    save();
    lastSave = t;
  }
  if (t > bannerUntil) $("#banner").classList.remove("show");
  raf = requestAnimationFrame(frame);
}
function dispose() {
  disposed = true;
  cancelAnimationFrame(raf);
  audio?.close();
  audio = null;
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    save();
    cancelAnimationFrame(raf);
    audio?.suspend();
    paused = true;
    last = 0;
  } else if (!disposed) {
    if (!dialog.open) menu();
    raf = requestAnimationFrame(frame);
  }
});
window.addEventListener("pagehide", () => {
  save();
  dispose();
});
window.addEventListener("pageshow", (e) => {
  if (e.persisted) {
    disposed = false;
    last = 0;
    menu();
    raf = requestAnimationFrame(frame);
  }
});
try {
  await loadArt();
  update();
  raf = requestAnimationFrame(frame);
  if (saved) {
    let restore = saved;
    modal(
      `<h2>숲으로 돌아왔군요</h2><p>${restore.s.wave || 1} 웨이브 · 성문 ${restore.s.lives} · ${restore.s.gold} 조각<br>저장한 판을 이어서 플레이할 수 있어요.</p><button id="resume" class="primary">${restore.s.result ? "지난 결과 보기" : "이어서 플레이"}</button><button id="fresh">새 판 시작</button>`,
      false,
    );
    $("#resume").onclick = () => {
      game = restore;
      saved = null;
      close();
      if (game.s.result) result();
    };
    $("#fresh").onclick = () => {
      saved = null;
      close();
      save();
    };
  }
} catch (err) {
  notice("게임 아트를 불러오지 못했어요. 새로고침해 주세요.");
  console.error(err);
}
// Opt-in test harness; absent during normal play. Uses the same engine and renderer.
if (new URLSearchParams(location.search).has("test"))
  window.moonward = {
    get game() {
      return game;
    },
    setGame(g) {
      game = g;
      effects = [];
      shots = [];
      bannerUntil = 0;
      $("#banner").classList.remove("show");
      update();
    },
    step(n) {
      for (let i = 0; i < n; i++) game.step();
      events();
      update();
    },
    pause(v) {
      paused = v;
    },
    Game,
    render,
    save,
    get metrics() {
      return { effects: effects.length, shots: shots.length, raf, disposed };
    },
  };
