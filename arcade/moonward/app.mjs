import { supported, forecast, coaching, debrief } from "./feedback.mjs";
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
  BOONS,
  boonCount,
  EVOLUTIONS,
  unitName,
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
  dialog.classList.remove("boonDialog");
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
  if (game.s.pendingBoon && !saved) return offerBoon();
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
function evolvePreview(u) {
  const rule = EVOLUTIONS[u.kind];
  modal(
    `<div class="eyebrow">FINAL EVOLUTION</div><h2>${rule.name}</h2><div class="evolutionPortrait"><img src="${sprites[u.kind].src}" alt="진화 전 ${TYPES[u.kind].name}"><span>→</span><img src="${sprites[rule.art].src}" alt="진화 후 ${rule.name}"></div><p><b>${rule.desc}</b></p><p>${rule.detail}</p><p>3성 수호자 유지 · 위치와 축복 유지<br>진화 비용 ${rule.cost} · 보유 ${game.s.gold} 조각<br>판매 시 진화 비용은 돌려받지 않습니다.</p><button id="confirmEvolve" class="primary" ${game.s.gold < rule.cost ? "disabled" : ""}>${game.s.gold < rule.cost ? rule.cost - game.s.gold + " 조각 더 필요" : rule.cost + " 조각으로 진화 확정"}</button>`,
  );
  $("#confirmEvolve").onclick = () => {
    if (!game.evolve(u.id)) return;
    save();
    close();
    tone(1100, 0.25);
    notice(rule.desc);
  };
}
$("#merge").onclick = () => {
  let u = unit();
  if (!u) return;
  if (u.tier === 3 && EVOLUTIONS[u.kind] && !u.evolved) return evolvePreview(u);
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
    `<h2>수호자를 돌려보낼까요?</h2><p>${unitName(u)} ${"★".repeat(u.tier)}<br>${Math.floor(30 * 2 ** (u.tier - 1))} 조각을 돌려받습니다. 이 수호자는 사라집니다.</p><button id="confirmSell">판매 확정</button>`,
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
      "<p>3성 궁수·잿불은 선택 후 진화 버튼에서 최종 진화를 미리 볼 수 있어요. 각 200 조각이 필요하며 새 판에서는 초기화됩니다.</p><p>적이 성문에 도착하면 생명 −1, 보스는 −5. 6·12·18 웨이브에 보스가 등장합니다. 18 웨이브를 지키면 승리합니다.<br>별종의 가속은 중첩되지 않고 독은 가장 강한 피해로 갱신됩니다.</p>",
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
$("#scout").onclick = () => {
  const s = game.s;
  const w = forecast(Math.min(RULES.waves, s.wave + 1));
  modal(
    `<div class="eyebrow">시간이 멈췄어요 · 작전 정비</div><h2>${w.wave} 웨이브 · ${w.label}</h2><p>${w.composition}</p><p>${w.advice}</p><p>방어 보상 ${w.reward} 조각 + 처치 보상<br>보유 ${s.gold} · 랜덤 50 / 지정 85 / 합성 15</p><button id="planChoice" class="primary" ${s.gold < 85 || s.units.length === PADS.length || s.result ? "disabled" : ""}>역할을 골라 지정 소환</button><p>이번 판 축복: ${boonSummary()}</p><p>6·12웨이브 보스를 처치하고 방어하면 축복을 선택합니다.</p><p>돌아가서 제단을 선택하면 무료 이동·교환과 합성을 할 수 있어요.</p>`,
  );
  $("#planChoice").onclick = () => $("#choose").click();
};
function update() {
  let s = game.s;
  const preview = forecast(Math.min(RULES.waves, s.wave + 1));
  $("#forecastTitle").textContent =
    `${s.wave < RULES.waves ? "다음" : "최종"} ${preview.wave} · ${preview.label}`;
  $("#forecastSummary").textContent = preview.composition;
  $("#scout").textContent =
    s.phase === "rest" ? "정비 · 시간 정지" : "작전 보기";
  $("#scout").disabled = !!s.result;
  $("#coach").textContent = coaching(s);
  $("#coach").hidden = !coaching(s);
  $("#boonStatus").hidden = !s.boons.length;
  $("#boonStatus").textContent = "축복 · " + boonSummary();
  $("#summon").classList.toggle(
    "guided",
    s.phase === "ready" && !s.units.length,
  );
  $("#start").classList.toggle(
    "guided",
    s.phase === "ready" && s.units.length >= 3,
  );
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
    let t = TYPES[u.kind],
      boosted = supported(s.units, u);
    $("#selection").innerHTML =
      `<strong>${unitName(u)} <span style="display:inline;color:${t.color}">${"★".repeat(u.tier)}</span></strong><span>${u.evolved ? (u.kind === "archer" ? "관통 · 직선 밀집" : "광역 · 잔불 지대") : t.role} · 공격 ${Math.round(t.damage * tierScale(u.tier))} / ${(t.interval / (boosted ? 1.25 : 1)).toFixed(2)}초${boosted ? " · 가속 +25%" : ""}${u.kind === "thorn" && boonCount(s, "venom") ? " · 독 강화 " + boonCount(s, "venom") + "단계" : ""}${u.kind === "archer" && boonCount(s, "hunt") ? " · 서리 추격 " + boonCount(s, "hunt") + "단계" : ""}</span>`;
    let pair = s.units.some(
      (v) => v.id !== u.id && v.kind === u.kind && v.tier === u.tier,
    );
    const evolution = u.tier === 3 && EVOLUTIONS[u.kind];
    $("#merge").disabled = evolution
      ? !!u.evolved
      : u.tier === 3 || !pair || s.gold < 15;
    $("#merge").textContent = evolution
      ? u.evolved
        ? "진화 완료"
        : "진화 · " + evolution.cost
      : u.tier === 3
        ? "최고 등급"
        : "합성 · 15";
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
      v ? `${i + 1}번 ${unitName(v)} ${v.tier}성` : `${i + 1}번 빈 제단`,
    );
    b.setAttribute("aria-pressed", String(i === selected));
  });
  $("#pauseLabel").hidden = !paused || dialog.open;
  if (s.phase === "rest")
    notice(
      `${s.wave} 웨이브 방어! ${Math.ceil(s.wait)}초 뒤 ${waveSpec(s.wave + 1).label} · 배치를 정비하세요.`,
    );
}
function boonSummary() {
  return game.s.boons.length
    ? game.s.boons
        .map((b) => `${b.wave}웨이브 ${BOONS[b.key].name}`)
        .join(" · ")
    : "아직 선택한 축복이 없어요";
}
function offerBoon() {
  if (!game.s.pendingBoon) return;
  save();
  modal(
    `<div class="boonScroll"><div class="eyebrow">BOSS REWARD · ${game.s.pendingBoon} WAVE</div><h2>숲이 건네는 축복</h2><p>세 가지 중 하나 · 이번 판에만 적용<br>고르는 동안 전투는 멈춰 있어요.</p><div class="boonChoices">${Object.entries(
      BOONS,
    )
      .map(([key, b]) => {
        const count = boonCount(game.s, key);
        const relevant =
          key === "venom"
            ? game.s.units.filter((u) => u.kind === "thorn").length +
              "명의 가시 사냥꾼 보유"
            : key === "hunt"
              ? `궁수 ${game.s.units.filter((u) => u.kind === "archer").length}명 · 서리 ${game.s.units.filter((u) => u.kind === "frost").length}명 보유`
              : `보유 ${game.s.gold} → ${game.s.gold + b.gold} 조각`;
        return `<button class="choice boonChoice" data-boon="${key}" aria-pressed="false"><img src="${sprites[b.art].src}" alt=""><span><b>${b.name}</b><small>${b.desc}</small><small>${relevant}${count ? " · 이전 선택 " + count + "회" : ""}</small></span></button>`;
      })
      .join(
        "",
      )}</div><p id="boonDetail">축복을 눌러 효과를 확인한 뒤 확정하세요. 같은 축복을 다시 고르면 효과를 더합니다.</p></div><button id="confirmBoon" class="primary" disabled>축복을 먼저 선택하세요</button>`,
    false,
  );
  dialog.classList.add("boonDialog");
  let chosen = null;
  dialog.querySelectorAll("[data-boon]").forEach(
    (b) =>
      (b.onclick = () => {
        chosen = b.dataset.boon;
        dialog
          .querySelectorAll("[data-boon]")
          .forEach((v) => v.setAttribute("aria-pressed", String(v === b)));
        const count = boonCount(game.s, chosen) + 1;
        const total =
          chosen === "venom"
            ? `선택 후 누적: 독 피해 +${Math.round(count * BOONS.venom.poisonBonus * 100)}%, 지속 +${count * BOONS.venom.duration}초.`
            : chosen === "hunt"
              ? `선택 후 누적: 둔화된 적에게 궁수 피해 +${Math.round(count * BOONS.hunt.damageBonus * 100)}%.`
              : "재화는 확정할 때 한 번 지급됩니다.";
        $("#boonDetail").textContent = BOONS[chosen].detail + " " + total;
        $("#confirmBoon").disabled = false;
        $("#confirmBoon").textContent = BOONS[chosen].name + " 확정";
      }),
  );
  $("#confirmBoon").onclick = () => {
    if (!game.chooseBoon(chosen)) return;
    save();
    close();
    banner(BOONS[chosen].name + " · 축복 획득");
    tone(880, 0.2);
    notice(BOONS[chosen].desc);
  };
}
function result() {
  let s = game.s,
    r = s.result;
  best = Math.max(best, r.wave);
  save();
  const report = debrief(s);
  modal(
    `<div class="eyebrow">${r.win ? "THE FOREST REMEMBERS" : "ANOTHER MOON WILL RISE"}</div><h2>${r.win ? "새벽을 지켜냈어요" : "성문의 불빛이 꺼졌어요"}</h2><p>${r.win ? "18번의 습격을 막았습니다. 다음 판에는 다른 조합으로 숲을 지켜보세요." : report.fact + "<br>" + report.tip}</p><div class="resultStats"><div>도달 웨이브<b>${r.wave}</b></div><div>처치<b>${r.kills}</b></div><div>전투 시간<b>${Math.floor(r.seconds / 60)}:${String(r.seconds % 60).padStart(2, "0")}</b></div></div><p>이번 판 축복: ${boonSummary()}</p><p>최고 도달 ${best} 웨이브 · 성문 피해 ${s.leaks}</p><button id="again" class="primary">다른 조합으로 다시 도전</button><button id="resultExit">아케이드로 돌아가기</button>`,
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
    } else if (
      ev.type === "summon" ||
      ev.type === "merge" ||
      ev.type === "evolve"
    ) {
      let [x, y] = PADS[ev.pad];
      effects.push({ x, y, life: 0.7, color: TYPES[ev.kind].color, big: true });
      if (ev.type === "evolve")
        banner("최종 진화 · " + EVOLUTIONS[ev.kind].name);
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
    } else if (ev.type === "boonOffer") offerBoon();
    else if (ev.type === "result") result();
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
  if (game.s.wave <= 1) {
    ctx.fillStyle = "#f4e2bd";
    ctx.font = "bold 11px system-ui";
    ctx.textAlign = "left";
    ctx.fillText("침입 →", 8, 55);
    ctx.textAlign = "center";
    ctx.fillText("성문 보호", 179, 416);
    ctx.strokeStyle = "#eed195";
    ctx.lineWidth = 2;
    for (const x of [26, 46]) {
      ctx.beginPath();
      ctx.moveTo(x - 4, 68);
      ctx.lineTo(x, 72);
      ctx.lineTo(x - 4, 76);
      ctx.stroke();
    }
  }
  for (const f of game.s.fields) {
    ctx.save();
    const r = EVOLUTIONS.ember.radius;
    ctx.globalAlpha = Math.min(1, f.life * 2) * 0.8;
    const glow = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, r);
    glow.addColorStop(0, "#ffad433a");
    glow.addColorStop(0.7, "#db531c55");
    glow.addColorStop(1, "#a62b0000");
    ctx.fillStyle = glow;
    ctx.fillRect(f.x - r, f.y - r, r * 2, r * 2);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.399,
        radius = (((i % 3) + 1) * r) / 4;
      const x = f.x + Math.cos(a) * radius,
        y = f.y + Math.sin(a) * radius;
      const height = reduced || paused ? 8 : 8 + Math.sin(t / 150 + i) * 2;
      ctx.fillStyle = i % 2 ? "#ffbf62" : "#eb6e35";
      ctx.beginPath();
      ctx.moveTo(x - 3, y + 3);
      ctx.quadraticCurveTo(x - 5, y - 2, x + 1, y - height);
      ctx.quadraticCurveTo(x - 1, y - 1, x + 4, y - 4);
      ctx.quadraticCurveTo(x + 6, y + 4, x - 3, y + 3);
      ctx.fill();
    }
    ctx.restore();
  }
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
  if (sel?.kind === "bell") {
    const [x, y] = PADS[sel.pad];
    ctx.save();
    ctx.strokeStyle = "#d0b8ff88";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(x, y, TYPES.bell.aura, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const v of game.s.units) {
      const [vx, vy] = PADS[v.pad];
      if (v.id !== sel.id && Math.hypot(vx - x, vy - y) <= TYPES.bell.aura) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(vx, vy);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  for (let u of game.s.units) {
    let [x, y] = PADS[u.pad],
      bounce = reduced || paused ? 0 : Math.sin(t / 350 + u.id) * 1.2,
      attack = shots.some((s) => s.x === x && s.y === y && s.life > 0.12);
    let size = u.evolved ? 59 : 49 + (u.tier - 1) * 3;
    ctx.save();
    ctx.translate(x, y);
    if (u.kind === "bell") {
      ctx.strokeStyle = "#d0b8ff33";
      ctx.beginPath();
      ctx.ellipse(0, 9, 21, 11, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (supported(game.s.units, u)) {
      ctx.strokeStyle = "#d0b8ff";
      ctx.lineWidth = 1.5;
      for (const offset of [-5, 2]) {
        ctx.beginPath();
        ctx.moveTo(14, offset);
        ctx.lineTo(18, offset - 4);
        ctx.lineTo(22, offset);
        ctx.stroke();
      }
    }
    ctx.drawImage(
      sprites[u.evolved ? EVOLUTIONS[u.kind].art : u.kind],
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
      ctx.strokeStyle = "#a8f3ff";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const x = p.x + Math.cos(angle) * size * 0.36,
          y = p.y + 7 + Math.sin(angle) * 6;
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * 4, y + Math.sin(angle) * 4);
      }
      ctx.stroke();
    }
    if (e.poison > 0) {
      ctx.fillStyle = "#b4e584";
      const x = p.x + size / 3,
        y = p.y - 9;
      ctx.beginPath();
      ctx.moveTo(x, y - 7);
      ctx.bezierCurveTo(x - 7, y, x - 4, y + 4, x, y + 4);
      ctx.bezierCurveTo(x + 4, y + 4, x + 7, y, x, y - 7);
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
    if (s.evolved && s.kind === "archer") {
      ctx.save();
      ctx.globalAlpha = Math.max(0, s.life / 0.18);
      ctx.strokeStyle = "#93e5ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.tx, s.ty);
      ctx.stroke();
      ctx.strokeStyle = "#fff3ce";
      ctx.lineWidth = 1;
      ctx.stroke();
      const a = Math.atan2(s.ty - s.y, s.tx - s.x);
      ctx.beginPath();
      ctx.moveTo(s.tx - 9 * Math.cos(a - 0.45), s.ty - 9 * Math.sin(a - 0.45));
      ctx.lineTo(s.tx, s.ty);
      ctx.lineTo(s.tx - 9 * Math.cos(a + 0.45), s.ty - 9 * Math.sin(a + 0.45));
      ctx.stroke();
      ctx.restore();
      if (!paused) s.life -= dt;
      continue;
    }
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
      if (s.kind === "ember") {
        ctx.arc(s.tx, s.ty, reduced ? 12 : 8 + k * 12, 0, Math.PI * 2);
      } else {
        const rays = s.kind === "frost" ? 6 : s.kind === "bell" ? 4 : 3;
        for (let i = 0; i < rays; i++) {
          const a = (i * Math.PI * 2) / rays;
          ctx.moveTo(s.tx + Math.cos(a) * 2, s.ty + Math.sin(a) * 2);
          ctx.lineTo(s.tx + Math.cos(a) * 7, s.ty + Math.sin(a) * 7);
        }
      }
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
      else if (game.s.pendingBoon) offerBoon();
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
