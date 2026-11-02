import { Game } from "./engine.mjs";
import {
  STEP,
  SHIPS,
  SKILLS,
  REGIONS,
  MODS,
  stageFor,
  loadProfile,
  unlocked,
  medals,
  modCost,
  complete,
  PROFILE_KEY,
  RUN_KEY,
} from "./data.mjs";
import { paint, shipArt, icon } from "./art.mjs";
const $ = (id) => document.getElementById(id),
  ctx = $("field").getContext("2d");
function read(k) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function write(k, v) {
  try {
    localStorage.setItem(k, v);
  } catch {
    $("storage-note").hidden = false;
  }
}
function remove(k) {
  try {
    localStorage.removeItem(k);
  } catch {}
}
let profile = loadProfile(read(PROFILE_KEY)),
  selected = unlocked(profile),
  craft = "swift",
  game = null,
  paused = true,
  active = false,
  pointer = null,
  fx = [],
  last = 0,
  acc = 0,
  saveClock = 0,
  raf = 0,
  ended = false,
  modalPhase = "",
  muted = true,
  reduced = matchMedia("(prefers-reduced-motion: reduce)").matches,
  audio = null,
  toastTime = 0,
  keys = new Set();
const settingsKey = "firemate_skyforge_settings_v1";
try {
  const o = JSON.parse(read(settingsKey));
  if (o) {
    muted = o.muted !== false;
    reduced = o.reduced === true;
  }
} catch {}
function settings() {
  write(settingsKey, JSON.stringify({ muted, reduced }));
  $("sound").textContent = muted ? "소리 켜기" : "소리 끄기";
  $("motion").textContent = "효과 줄이기: " + (reduced ? "켬" : "끔");
}
function tone(freq = 440, duration = 0.08) {
  if (muted) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume();
    const o = audio.createOscillator(),
      g = audio.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(freq, audio.currentTime);
    o.frequency.exponentialRampToValueAtTime(
      freq * 0.7,
      audio.currentTime + duration,
    );
    g.gain.setValueAtTime(0.035, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    o.connect(g);
    g.connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + duration);
  } catch {}
}
function release() {
  pointer = null;
  keys.clear();
  if (game) game.target = { x: game.s.x, y: game.s.y };
}
function closeDialog() {
  $("lobby").inert = false;
  $("play").inert = false;
  $("veil").hidden = true;
  modalPhase = "";
  release();
  acc = 0;
}
function dialog(title, content, actions = []) {
  $("lobby").inert = true;
  $("play").inert = true;
  release();
  $("dialog").innerHTML =
    '<small>SKYFORGE / FLIGHT LOG</small><h2 id="dialog-title">' +
    title +
    "</h2>" +
    content;
  for (const [label, fn, primary] of actions) {
    const b = document.createElement("button");
    b.textContent = label;
    if (primary) b.className = "primary";
    b.onclick = fn;
    $("dialog").append(b);
  }
  $("veil").hidden = false;
  requestAnimationFrame(() => $("dialog").querySelector("button")?.focus());
}
function ask(title, body, fn) {
  dialog(title, "<p>" + body + "</p>", [
    [
      "계속",
      () => {
        closeDialog();
        fn();
      },
      true,
    ],
    ["취소", () => (active ? pause() : closeDialog())],
  ]);
}
function previewCanvas(id, w = 100, h = 80) {
  const c = document.createElement("canvas");
  c.width = w * 2;
  c.height = h * 2;
  const c2 = c.getContext("2d");
  c2.scale(2, 2);
  shipArt(c2, w / 2, h / 2 + 3, id, 1, 0.9, 0);
  return c;
}
function skillCanvas(k, level, size = 48) {
  const c = document.createElement("canvas");
  c.width = c.height = size * 2;
  const c2 = c.getContext("2d");
  c2.scale(2, 2);
  icon(c2, k, size / 2, size / 2, size * 0.7, level);
  return c;
}
function lobby() {
  active = false;
  paused = true;
  release();
  closeDialog();
  $("play").hidden = true;
  $("lobby").hidden = false;
  document.body.style.overflow = "";
  const unlock = unlocked(profile);
  selected = Math.min(selected, unlock);
  $("launch").textContent =
    selected + "탄 · " + stageFor(selected).name + " 출격";
  $("resume").hidden = !Game.restore(read(RUN_KEY));
  $("progress").textContent =
    Object.keys(profile.records).filter((k) => k.startsWith("normal:")).length +
    " / 12 항로";
  $("stages").replaceChildren();
  for (let r = 0; r < 3; r++) {
    const label = document.createElement("p");
    label.className = "region";
    label.textContent = `0${r + 1} / ${REGIONS[r].name}`;
    const grid = document.createElement("div");
    grid.className = "stage-grid";
    for (let id = r * 4 + 1; id <= r * 4 + 4; id++) {
      const b = document.createElement("button");
      b.className = "stage" + (selected === id ? " selected" : "");
      b.disabled = id > unlock;
      const stars = profile.records["normal:" + id] || 0;
      b.innerHTML =
        "<b>" +
        String(id).padStart(2, "0") +
        "</b><small>" +
        stageFor(id).name +
        '</small><small class="stars">' +
        (stars
          ? "★".repeat(stars) + "☆".repeat(3 - stars)
          : id > unlock
            ? "이전 항로 클리어"
            : "출격 가능") +
        "</small>";
      b.onclick = () => {
        selected = id;
        lobby();
        $("launch").focus();
      };
      grid.append(b);
    }
    $("stages").append(label, grid);
  }
  $("ships").replaceChildren();
  for (const ship of SHIPS) {
    const b = document.createElement("button");
    b.disabled = unlock < ship.unlock;
    b.className = craft === ship.id ? "selected" : "";
    b.append(previewCanvas(ship.id));
    const t = document.createElement("span");
    t.textContent = ship.name;
    b.append(t);
    const p = document.createElement("small");
    p.textContent = b.disabled
      ? `${ship.unlock - 1}탄 클리어로 해금`
      : ship.role;
    b.append(p);
    b.onclick = () => {
      craft = ship.id;
      lobby();
    };
    $("ships").append(b);
  }
  $("medals").textContent = "훈장 " + medals(profile);
  $("mods").replaceChildren();
  for (const mod of MODS) {
    const lv = profile.mods[mod.key],
      cost = modCost(lv),
      b = document.createElement("button");
    b.innerHTML =
      "<span>" +
      mod.name +
      " " +
      lv +
      "/3<small>" +
      mod.desc +
      "</small></span><span>" +
      (lv === 3 ? "완료" : cost + " 훈장") +
      "</span>";
    b.disabled = medals(profile) < cost;
    b.onclick = () => {
      if (medals(profile) >= cost && lv < 3) {
        profile.mods[mod.key]++;
        write(PROFILE_KEY, JSON.stringify(profile));
        lobby();
      }
    };
    $("mods").append(b);
  }
  const c = $("showcase").getContext("2d");
  c.clearRect(0, 0, 640, 250);
  c.save();
  c.translate(320, 125);
  for (let i = 0; i < 3; i++) {
    c.strokeStyle = i === 0 ? "#77919944" : "#77919922";
    c.lineWidth = 1;
    c.beginPath();
    c.ellipse(0, 0, 90 + i * 38, 45 + i * 24, -0.2, 0, Math.PI * 2);
    c.stroke();
  }
  c.restore();
  shipArt(c, 320, 135, craft, 1, 2.4, -0.08);
}
function start(stage = selected, hard = false) {
  if (
    stage > unlocked(profile) ||
    (hard && !profile.records["normal:" + stage])
  )
    return;
  game = new Game({
    stage,
    hard,
    ship: craft,
    mods: profile.mods,
    seed: crypto.getRandomValues(new Uint32Array(1))[0],
  });
  enter();
}
function enter() {
  ended = false;
  fx = [];
  saveClock = 0;
  acc = 0;
  active = true;
  paused = false;
  modalPhase = "";
  closeDialog();
  $("lobby").hidden = true;
  $("play").hidden = false;
  document.body.style.overflow = "hidden";
  $("toast").textContent = "";
  save();
  hud();
  if (game.s.phase === "choice") choices();
  tone(660, 0.15);
}
function save() {
  if (game && ["battle", "choice"].includes(game.s.phase))
    write(RUN_KEY, game.serialize());
}
function toast(text) {
  $("toast").textContent = text;
  toastTime = 2.5;
}
function choices() {
  if (modalPhase === "choice") return;
  modalPhase = "choice";
  dialog(
    "무기를 고르세요",
    "<p>같은 무기 3레벨마다 진화합니다. 전투는 멈춰 있습니다.</p>",
  );
  modalPhase = "choice";
  for (const key of game.s.choices) {
    const d = SKILLS[key],
      lv = game.s.skills[key] + 1,
      b = document.createElement("button");
    b.className = "choice";
    b.append(skillCanvas(key, lv));
    const text = document.createElement("span");
    text.innerHTML =
      "<strong>" +
      d.name +
      ' <small style="display:inline">Lv.' +
      lv +
      "</small></strong><small>" +
      d.role +
      '</small><small class="' +
      (lv % 3 === 0 ? "evolution" : "") +
      '">' +
      d.desc[lv - 1] +
      "</small>";
    b.append(text);
    b.onclick = () => {
      if (!game.choose(key)) return;
      closeDialog();
      save();
      hud();
      if (lv % 3 === 0) toast(d.name + " 진화!");
      tone(lv % 3 === 0 ? 980 : 660, 0.18);
    };
    $("dialog").append(b);
  }
}
function pause() {
  if (!active || ended) return;
  paused = true;
  save();
  dialog("잠시 숨 고르기", "<p>전투는 멈췄고 진행 상황은 저장됩니다.</p>", [
    [
      "계속 비행",
      () => {
        paused = false;
        closeDialog();
        if (game.s.phase === "choice") choices();
      },
      true,
    ],
    [
      "소리 " + (muted ? "켜기" : "끄기"),
      () => {
        muted = !muted;
        settings();
        pause();
      },
    ],
    [
      "효과 줄이기 " + (reduced ? "끄기" : "켜기"),
      () => {
        reduced = !reduced;
        settings();
        pause();
      },
    ],
    [
      "처음부터 재도전",
      () =>
        ask(
          "다시 출격할까요?",
          "현재 비행을 끝내고 같은 항로를 처음부터 시작합니다.",
          () => start(game.s.stage, game.s.hard),
        ),
    ],
    [
      "저장하고 격납고로",
      () => {
        save();
        lobby();
      },
    ],
  ]);
}
function result() {
  if (ended) return;
  ended = true;
  paused = true;
  release();
  remove(RUN_KEY);
  const s = game.s,
    won = s.phase === "won",
    before = medals(profile);
  if (won) {
    complete(profile, s);
    write(PROFILE_KEY, JSON.stringify(profile));
  }
  const score = profile.records[(s.hard ? "hard:" : "normal:") + s.stage] || 0;
  const info = won
    ? `<p class="stars">${"★".repeat(s.hits === 0 ? 3 : s.hp >= s.maxHp * 0.4 ? 2 : 1)}</p><p>새 훈장 +${medals(profile) - before} · 항로 최고 기록 ${score}별<br>무피격 3별 · 체력 40% 이상 2별</p>`
    : `<p>${s.level < 4 ? "보급 결정을 더 모아 무기를 성장시켜 보세요." : "손을 떼면 느려집니다. 탄막의 빈틈을 보고 움직여 보세요."}<br>${s.pulse ? "남은 펄스 " + s.pulse + "회 — 위험할 때 탄막을 지울 수 있어요." : "수호 장막과 서리 파동으로 방어를 보강해 보세요."}</p>`;
  const stats = `<div class="result-stats"><span><b>${s.kills}</b>격추</span><span><b>${s.hits}</b>피격</span><span><b>${Math.floor(s.time)}초</b>전투 시간</span></div>`;
  const actions = [];
  if (won && s.stage < 12 && !s.hard)
    actions.push([
      "다음 항로 · " + (s.stage + 1) + "탄",
      () => {
        selected = s.stage + 1;
        start(selected);
      },
      true,
    ]);
  actions.push(["같은 항로 재도전", () => start(s.stage, s.hard), !won]);
  if (won && !s.hard)
    actions.push(["도전 모드 · 적 체력 +30%", () => start(s.stage, true)]);
  actions.push([
    "격납고로",
    () => {
      selected = unlocked(profile);
      lobby();
    },
  ]);
  dialog(
    won ? (s.stage === 12 ? "하늘의 심장 격파" : "항로 돌파!") : "비행 종료",
    info + stats,
    actions,
  );
  tone(won ? 880 : 180, 0.3);
}
function hud() {
  if (!game) return;
  const s = game.s;
  $("stage-label").textContent =
    String(s.stage).padStart(2, "0") +
    " / " +
    game.scene.name +
    (s.hard ? " · 도전" : "");
  $("hp-label").textContent = "장갑 " + Math.ceil(s.hp) + " / " + s.maxHp;
  $("hp").max = s.maxHp;
  $("hp").value = s.hp;
  $("xp").max = s.nextXp;
  $("xp").value = s.xp;
  $("level").textContent = "Lv." + (s.level + 1);
  $("tempo").textContent = pointer || keys.size ? "비행 1×" : "감속 0.25×";
  $("pulse").textContent = "긴급 펄스 · " + s.pulse;
  $("pulse").disabled = !s.pulse || paused || s.phase !== "battle";
  const boss = s.enemies.find((e) => e.kind === "boss");
  $("boss").hidden = !boss;
  if (boss) {
    $("boss").querySelector("span").textContent =
      game.scene.boss +
      (boss.age >= 35 ? " · 장갑 과열 · 피해 3배 · " : " · ") +
      [
        "부채꼴 탄막 사이로 회피",
        "붉은 경고선을 벗어나세요",
        "회전 탄막의 빈틈으로 이동",
      ][game.scene.pattern];
    $("boss").querySelector("progress").value = (boss.hp / boss.max) * 100;
  }
  const signature = JSON.stringify(s.skills);
  if ($("loadout").dataset.signature !== signature) {
    $("loadout").dataset.signature = signature;
    $("loadout").replaceChildren();
    for (const [k, lv] of Object.entries(s.skills))
      if (lv) {
        const span = document.createElement("button");
        span.title = SKILLS[k].name + " Lv." + lv;
        span.setAttribute("aria-label", SKILLS[k].name + " Lv." + lv + " 설명");
        span.append(skillCanvas(k, lv, 26), document.createTextNode(lv));
        span.onclick = () => {
          paused = true;
          save();
          dialog(
            SKILLS[k].name + " Lv." + lv,
            "<p>" +
              SKILLS[k].role +
              "</p><p>" +
              SKILLS[k].desc.slice(0, lv).join("<br>") +
              "</p>",
            [
              [
                "계속 비행",
                () => {
                  paused = false;
                  closeDialog();
                },
                true,
              ],
            ],
          );
        };
        $("loadout").append(span);
      }
    if (!$("loadout").children.length)
      $("loadout").textContent = "보급 결정을 모아 새로운 무기를 선택하세요";
  }
}
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  if (active && game) {
    if (!paused && game.s.phase === "battle" && !document.hidden) {
      acc += dt * (pointer || keys.size ? 1 : 0.25);
      while (acc >= STEP) {
        let input = pointer?.target || {};
        if (keys.size)
          input = {
            x:
              game.s.x +
              ((keys.has("ArrowRight") || keys.has("d")) -
                (keys.has("ArrowLeft") || keys.has("a"))) *
                5,
            y:
              game.s.y +
              ((keys.has("ArrowDown") || keys.has("s")) -
                (keys.has("ArrowUp") || keys.has("w"))) *
                5,
          };
        game.step(input);
        acc -= STEP;
        if (game.s.phase !== "battle") {
          acc = 0;
          break;
        }
      }
      saveClock += dt;
      if (saveClock > 2) {
        save();
        saveClock = 0;
      }
    }
    for (const e of game.events.splice(0)) {
      if (e.type === "overheat") toast("장갑 과열\n보스에게 주는 피해 3배!");
      if (e.type === "boss") toast("보스 접근\n" + game.scene.boss);
      if (e.type === "hurt") tone(130, 0.1);
      if (e.type === "evolve") tone(980, 0.2);
      if (
        !reduced ||
        ["laser", "arc", "aim", "shield", "frost"].includes(e.type)
      )
        fx.push({
          ...e,
          age: 0,
          life: ["laser", "arc"].includes(e.type)
            ? 0.2
            : e.type === "aim"
              ? 0.55
              : 0.6,
        });
    }
    if (!paused) {
      for (const e of fx) e.age += dt;
      fx = fx.filter((e) => e.age < e.life).slice(-120);
      toastTime -= dt;
      if (toastTime <= 0) $("toast").textContent = "";
    }
    paint(ctx, game.s, fx, { reduced });
    hud();
    if (!paused) {
      if (game.s.phase === "choice") choices();
      if (["won", "lost"].includes(game.s.phase)) result();
    }
  }
  raf = requestAnimationFrame(frame);
}
$("field").addEventListener("pointerdown", (e) => {
  if (!active || paused || game.s.phase !== "battle") return;
  e.preventDefault();
  const r = $("field").getBoundingClientRect();
  pointer = {
    id: e.pointerId,
    x: e.clientX,
    y: e.clientY,
    sx: game.s.x,
    sy: game.s.y,
    scale: 600 / r.height,
    target: { x: game.s.x, y: game.s.y },
  };
  $("field").setPointerCapture(e.pointerId);
  tone(340, 0.025);
});
$("field").addEventListener("pointermove", (e) => {
  if (pointer?.id !== e.pointerId) return;
  pointer.target = {
    x: pointer.sx + (e.clientX - pointer.x) * pointer.scale,
    y: pointer.sy + (e.clientY - pointer.y) * pointer.scale,
  };
});
for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
  $("field").addEventListener(type, () => release());
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (active) pause();
    return;
  }
  if (!active || paused || game.s.phase !== "battle") return;
  if (
    [
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "w",
      "a",
      "s",
      "d",
    ].includes(e.key)
  ) {
    keys.add(e.key);
    e.preventDefault();
  }
  if (e.code === "Space") {
    e.preventDefault();
    if (!e.repeat) game.pulse();
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.key));
window.addEventListener("blur", () => {
  if (active && !paused) pause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && active) pause();
});
$("pause").onclick = pause;
$("pulse").onclick = () => {
  if (game.pulse()) tone(160, 0.25);
};
$("launch").onclick = () => {
  if (Game.restore(read(RUN_KEY)))
    ask("새 비행 시작", "저장된 비행을 새 출격으로 바꿉니다.", () => start());
  else start();
};
$("resume").onclick = () => {
  const saved = Game.restore(read(RUN_KEY));
  if (saved) {
    game = saved;
    craft = game.s.ship;
    enter();
    pause();
  } else {
    remove(RUN_KEY);
    lobby();
  }
};
$("sound").onclick = () => {
  muted = !muted;
  settings();
  tone();
};
$("motion").onclick = () => {
  reduced = !reduced;
  settings();
};
$("respec").onclick = () =>
  ask(
    "정비 초기화",
    "훈장을 모두 돌려받고 다른 정비에 배분할 수 있습니다.",
    () => {
      profile.mods = { power: 0, hull: 0, magnet: 0 };
      write(PROFILE_KEY, JSON.stringify(profile));
      lobby();
    },
  );
window.addEventListener("pagehide", () => {
  save();
  cancelAnimationFrame(raf);
  release();
  audio?.close();
  audio = null;
});
window.addEventListener("pageshow", (e) => {
  if (e.persisted) {
    last = 0;
    raf = requestAnimationFrame(frame);
    if (active) pause();
  }
});
// Explicit local QA opt-in. Never enabled by a URL or production session.
if (window.__skyforgeTest)
  window.__skyforge = {
    get game() {
      return game;
    },
    get profile() {
      return profile;
    },
    get paused() {
      return paused;
    },
    start,
    load(g) {
      game = g;
      enter();
    },
    Game,
    save,
    pause,
    lobby,
  };
settings();
lobby();
raf = requestAnimationFrame(frame);
