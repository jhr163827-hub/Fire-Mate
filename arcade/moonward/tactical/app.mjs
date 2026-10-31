import { Battle } from "./engine.mjs";
import { SAVE_KEY, STEP, PADS, TYPES, ENEMIES, WAVES } from "./data.mjs";
import { loadArt, paint } from "./render.mjs";
const $ = (s) => document.querySelector(s),
  ctx = $("#canvas").getContext("2d"),
  dialog = $("#dialog");
const resize = new ResizeObserver(() => {
  const r = $("#stage").getBoundingClientRect();
  $("#field").style.width = Math.min(r.width, (r.height * 460) / 300) + "px";
});
resize.observe($("#stage"));
let game = new Battle(1),
  selected = 0,
  building = null,
  moving = false,
  paused = false,
  speed = 1,
  muted = true,
  reduced = matchMedia("(prefers-reduced-motion: reduce)").matches,
  raf = 0,
  last = 0,
  acc = 0,
  lastSave = 0,
  lastUI = 0,
  disposed = false,
  audio = null,
  effects = [],
  shownResult = "",
  callUntil = 0,
  pending = false,
  detailKey = "",
  images,
  preDialogPause = false;
function notice(t) {
  $("#notice").textContent = t;
}
function call(t) {
  $("#callout").textContent = t;
  $("#callout").classList.add("show");
  callUntil = performance.now() + 1700;
}
function unit() {
  return game.s.units.find((u) => u.pad === selected);
}
function save() {
  if (pending) return;
  try {
    if (!game.s.units.length && !game.s.wave) localStorage.removeItem(SAVE_KEY);
    else localStorage.setItem(SAVE_KEY, game.serialize());
    $("#saveStatus").textContent = "전술전 자동 저장";
  } catch {
    $("#saveStatus").textContent = "저장 실패 · 공간 확인";
  }
}
function tone(kind) {
  if (muted || disposed) return;
  try {
    audio ??= new AudioContext();
    audio.resume().catch(() => {});
    const o = audio.createOscillator(),
      g = audio.createGain();
    o.type = kind === "ember" ? "triangle" : "sine";
    o.frequency.value = kind === "ember" ? 130 : kind === "frost" ? 680 : 420;
    g.gain.setValueAtTime(0.025, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.1);
    o.connect(g);
    g.connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + 0.11);
  } catch {}
}
function open(html, closable = true) {
  if (!dialog.open) preDialogPause = paused;
  paused = true;
  $("#dialogBody").innerHTML = html;
  $("#close").hidden = !closable;
  if (!dialog.open) dialog.showModal();
}
function close() {
  dialog.close();
  paused = preDialogPause;
  last = 0;
  acc = 0;
  update();
}
$("#close").onclick = close;
dialog.addEventListener("cancel", (e) => {
  e.preventDefault();
  if (!$("#close").hidden) close();
});
function fresh() {
  game = new Battle(1);
  selected = 0;
  building = null;
  moving = false;
  effects = [];
  shownResult = "";
  pending = false;
  detailKey = "";
  paused = false;
  preDialogPause = false;
  close();
  save();
  notice("집중 또는 광역 선택 → 빈 제단. 처음엔 2명을 배치할 수 있어요.");
}
function restart() {
  open(
    '<h2>새 조합으로 도전할까요?</h2><p>전술전의 현재 판을 새로 시작합니다. 기존 랜덤 모드 저장은 그대로 남아요.</p><button id="confirmRestart" class="primary">새 판 시작</button>',
  );
  $("#confirmRestart").onclick = fresh;
}
function menu() {
  open(
    '<h2>작전 정비</h2><p>전투가 멈췄어요.</p><label><input id="sound" type="checkbox">효과음 켜기</label><label><input id="motion" type="checkbox">효과 줄이기</label><button id="restart">새 판 시작</button><a id="leave" href="../../index.html">저장하고 나가기</a>',
  );
  $("#sound").checked = !muted;
  $("#motion").checked = reduced;
  $("#sound").onchange = (e) => {
    muted = !e.target.checked;
    if (!muted) tone("archer");
  };
  $("#motion").onchange = (e) => (reduced = e.target.checked);
  $("#restart").onclick = restart;
  save();
}
$("#settings").onclick = menu;
$("#speed").onclick = () => {
  speed = speed === 1 ? 2 : 1;
  $("#speed").textContent = speed + "×";
};
$("#plan").onclick = () => {
  paused = !paused;
  acc = 0;
  update();
  save();
};
$("#help").onclick = () =>
  open(
    '<h2>붙잡고, 모아서, 터뜨리기</h2><p><img src="../art/frost.webp" alt="서리 마녀"> <b>둔화</b>는 적을 느리게 해요. 적 밑 얼음과 −45% 표시를 보세요.</p><p><img src="../art/ember.webp" alt="잿불 연금술사"> <b>광역</b>은 폭발 안의 적을 함께 때려요. “3명 명중”은 실제 맞은 수, “둔화 연계”는 느려진 적에게 폭발이 명중했다는 뜻이에요. 별도의 피해 보너스는 없어요.</p><p><img src="../art/archer.webp" alt="달빛 궁수"> <b>집중</b>은 선두를 마무리해요. 속사는 단일 적, 관통은 일렬로 모인 적에 유리해요.</p><p>원하는 역할 → 빈 제단을 눌러 구매. 배치된 수호자를 누르면 2가지 강화 방향 중 하나를 선택해요. 전투 사이에는 무료 이동·교환, 판매는 투자 조각의 75% 환급. 작전 정지 중에도 구매·강화할 수 있어요.</p>',
  );
$("#start").onclick = () => {
  if (game.start()) {
    building = null;
    moving = false;
    paused = false;
    call("WAVE " + game.s.wave + " · " + WAVES[game.s.wave - 1].name);
    save();
    update();
  }
};
PADS.forEach(([x, y], i) => {
  const b = document.createElement("button");
  b.className = "pad";
  b.dataset.pad = i;
  b.style.left = (x / 460) * 100 + "%";
  b.style.top = (y / 300) * 100 + "%";
  b.onclick = () => {
    if (building) {
      if (game.buy(building, i)) {
        notice(
          TYPES[building].verb + " · 수호자를 눌러 강화 방향을 선택하세요.",
        );
        building = null;
        save();
      } else notice("빈 제단과 보유 조각을 확인하세요.");
    } else if (moving) {
      const u = unit();
      if (u && game.move(u.id, i)) {
        notice("배치를 바꿨어요. 새 사거리를 확인하세요.");
        save();
      }
      moving = false;
    }
    selected = i;
    const chosen = unit();
    if (chosen) notice(TYPES[chosen.kind].verb);
    update();
  };
  $("#pads").append(b);
});
for (const [kind, t] of Object.entries(TYPES)) {
  const b = document.createElement("button");
  b.dataset.buy = kind;
  b.innerHTML = `<img src="../art/${kind}.webp" alt=""><span><b>${t.role}</b><small>${t.cost} 조각</small></span>`;
  b.setAttribute(
    "aria-label",
    `${t.role} ${t.name} ${t.cost} 조각 · ${t.verb}`,
  );
  b.onclick = () => {
    building = building === kind ? null : kind;
    moving = false;
    notice(
      building
        ? `${t.name} · ${t.verb}. 배치할 빈 제단을 누르세요.`
        : "구매 선택 취소",
    );
    update();
  };
  $("#shop").append(b);
}
function update() {
  const s = game.s,
    u = unit(),
    over = game.finished();
  $("#gold").textContent = s.gold;
  $("#lives").textContent = s.lives;
  $("#wave").textContent = s.wave + " / 5";
  $("#plan").textContent = paused ? "재개" : "정지";
  $("#plan").disabled = over;
  $("#phase").textContent =
    s.phase === "ready"
      ? "배치 시간 · 무료 이동"
      : paused
        ? "작전 정지 · 구매·강화 가능"
        : s.phase === "battle"
          ? "방어 중 · 구매·강화 가능"
          : "전투 종료";
  const nextIndex = s.phase === "battle" ? s.wave : Math.min(s.wave, 4),
    w = WAVES[nextIndex];
  $("#next").textContent = w
    ? `다음 ${nextIndex + 1} · ${w.name}`
    : "최종전 · 보스를 처치하세요";
  $("#tip").textContent = w ? w.tip : WAVES[4].tip;
  $("#battleNote").textContent = building
    ? TYPES[building].role + " 선택됨 · 빈 제단을 누르세요"
    : moving
      ? "옮길 제단을 누르세요"
      : s.phase === "battle"
        ? `남은 적 ${s.enemies.length + s.queue.length} · ${paused ? "작전 정지" : "방어 중"}`
        : "사거리를 겹쳐 둔화 → 광역 연계";
  $("#start").hidden = s.phase !== "ready";
  $("#start").disabled = !s.units.length;
  $("#start").textContent = s.wave + 1 + "웨이브 시작";
  for (const b of document.querySelectorAll("[data-buy]")) {
    b.disabled = s.gold < TYPES[b.dataset.buy].cost || over;
    b.classList.toggle("selected", building === b.dataset.buy);
  }
  for (const b of document.querySelectorAll(".pad")) {
    const v = s.units.find((u) => u.pad === +b.dataset.pad);
    b.classList.toggle("selected", +b.dataset.pad === selected);
    b.setAttribute("aria-pressed", String(+b.dataset.pad === selected));
    b.setAttribute(
      "aria-label",
      `${+b.dataset.pad + 1}번 ${v ? TYPES[v.kind].role + " " + (v.upgrade ? TYPES[v.kind].upgrades[v.upgrade].name : "") : "빈 제단"}`,
    );
    b.innerHTML = v
      ? `<em>${TYPES[v.kind].role}</em>${v.upgrade ? "<span>◆</span>" : ""}`
      : "";
  }
  const key = JSON.stringify([
    selected,
    u?.id,
    u?.upgrade,
    s.phase,
    moving,
    s.gold,
    building,
  ]);
  if (key !== detailKey) {
    detailKey = key;
    $("#detail").innerHTML = u
      ? `<h2>${TYPES[u.kind].name}${u.upgrade ? " · " + TYPES[u.kind].upgrades[u.upgrade].name : ""}</h2><p>${u.upgrade ? TYPES[u.kind].upgrades[u.upgrade].desc : TYPES[u.kind].verb}</p><p class="numbers" id="contribution"></p>${
          u.upgrade
            ? ""
            : `<div class="row upgrades">${Object.entries(
                TYPES[u.kind].upgrades,
              )
                .map(
                  ([k, o]) =>
                    `<button data-upgrade="${k}" ${s.gold < o.cost || over ? "disabled" : ""}>${o.name} · ${o.cost}<small>${o.desc}</small></button>`,
                )
                .join("")}</div>`
        }<div class="row"><button id="move" ${s.phase !== "ready" ? "disabled" : ""}>${moving ? "이동 취소" : "이동 / 교환"}</button><button id="sell" ${over ? "disabled" : ""}>판매 · ${Math.floor(u.spent * 0.75)}</button></div>`
      : `<h2>${selected + 1}번 빈 제단</h2><p>${building ? TYPES[building].verb + " · 빈 제단을 눌러 배치" : "위에서 원하는 역할을 고른 뒤 전장의 빈 제단을 누르세요."}</p>`;
    if (u) {
      $("#move").onclick = () => {
        building = null;
        moving = !moving;
        notice(
          moving
            ? "옮길 제단을 누르세요. 병력이 있으면 교환해요."
            : "이동 취소",
        );
        update();
      };
      $("#sell").onclick = () => {
        const id = u.id;
        open(
          `<h2>${TYPES[u.kind].name} 판매?</h2><p>투자 조각의 75%, ${Math.floor(u.spent * 0.75)} 조각을 돌려받아요.</p><button id="confirmSell">판매 확정</button>`,
        );
        $("#confirmSell").onclick = () => {
          game.sell(id);
          close();
          save();
        };
      };
      for (const b of document.querySelectorAll("[data-upgrade]"))
        b.onclick = () => {
          const k = b.dataset.upgrade,
            o = TYPES[u.kind].upgrades[k],
            id = u.id;
          open(
            `<h2>${o.name}</h2><p>${o.desc}</p><p>${o.cost} 조각 · 이 수호자는 다른 강화 방향을 선택할 수 없어요.</p><button id="confirmUpgrade" class="primary">${o.name} 강화 확정</button>`,
          );
          $("#confirmUpgrade").onclick = () => {
            if (game.upgrade(id, k)) {
              call(o.name + " 강화 완료");
              notice(o.desc);
            }
            close();
            save();
          };
        };
    }
  }
  if (u && $("#contribution"))
    $("#contribution").textContent =
      `누적 피해 ${Math.round(u.damage)} · ${u.kind === "frost" ? "이동 지연 " + u.slowTime.toFixed(1) + "초" : u.kind === "ember" ? "둔화 중 폭발 명중 " + u.combo + "회" : "명중 " + u.hits + "회"}`;
  if (over && shownResult !== s.phase) {
    shownResult = s.phase;
    save();
    open(
      `<h2>${s.phase === "won" ? "길목을 지켰어요" : "성문이 무너졌어요"}</h2><p>${s.wave}/5 웨이브 · 처치 ${s.kills} · 남은 성문 ${s.lives}<br>둔화 중 폭발 명중 ${s.units.reduce((n, u) => n + u.combo, 0)}회</p><p>${s.report?.advice || ""}</p><p>제단 위치와 강화 방향을 바꿔 다시 도전해 보세요.</p><button id="retry" class="primary">새 조합으로 재도전</button><a href="../../index.html">아케이드로</a>`,
      false,
    );
    $("#retry").onclick = fresh;
  }
}
function drain() {
  for (const e of game.events) {
    effects.push({ ...e, life: 0.65, total: 0.65 });
    if (e.type === "attack") tone(e.kind);
    if (e.type === "clear") {
      call("방어 성공 · +" + WAVES[game.s.wave - 1].reward + " 조각");
      notice(
        game.s.report.advice +
          (game.s.report.combo
            ? " 둔화 중 폭발 " + game.s.report.combo + "회 명중!"
            : ""),
      );
      save();
    }
    if (e.type === "leak")
      call(ENEMIES[e.kind].name + " 통과 · 배치를 점검하세요");
  }
  game.events = [];
  effects = effects.slice(-100);
}
function frame(now) {
  if (disposed) return;
  const dt = Math.min(0.1, (now - (last || now)) / 1000);
  last = now;
  if (!paused && !document.hidden) {
    acc += dt * speed;
    while (acc >= STEP) {
      game.step();
      acc -= STEP;
    }
    drain();
    for (const e of effects) e.life -= dt * speed;
    effects = effects.filter((e) => e.life > 0);
  }
  paint(
    ctx,
    images,
    game.s,
    selected,
    effects,
    now,
    reduced,
    paused && !dialog.open,
  );
  if (now - lastUI > 120) {
    update();
    lastUI = now;
  }
  if (now - lastSave > 2000) {
    save();
    lastSave = now;
  }
  if (now > callUntil) $("#callout").classList.remove("show");
  raf = requestAnimationFrame(frame);
}
function stop() {
  save();
  disposed = true;
  cancelAnimationFrame(raf);
  audio?.close().catch(() => {});
  audio = null;
}
window.addEventListener("pagehide", stop);
window.addEventListener("pageshow", (e) => {
  if (e.persisted) {
    disposed = false;
    last = 0;
    paused = true;
    if (!dialog.open) menu();
    raf = requestAnimationFrame(frame);
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    save();
    paused = true;
    cancelAnimationFrame(raf);
    audio?.suspend();
  } else if (!disposed && images) {
    last = 0;
    if (!dialog.open) menu();
    raf = requestAnimationFrame(frame);
  }
});
try {
  images = await loadArt();
  try {
    const raw = localStorage.getItem(SAVE_KEY),
      restored = raw && Battle.restore(raw);
    if (restored) {
      pending = true;
      open(
        `<h2>전술전을 이어할까요?</h2><p>${restored.s.wave}웨이브 · 성문 ${restored.s.lives} · 조각 ${restored.s.gold}</p><button id="resume" class="primary">이어서 플레이</button><button id="fresh">새 조합으로 시작</button>`,
        false,
      );
      $("#resume").onclick = () => {
        game = restored;
        pending = false;
        shownResult = "";
        preDialogPause = false;
        close();
      };
      $("#fresh").onclick = fresh;
    } else if (raw) notice("저장 데이터가 손상되어 새 전술전으로 시작해요.");
  } catch {
    notice("저장소를 사용할 수 없어요.");
  }
  update();
  raf = requestAnimationFrame(frame);
  if (new URLSearchParams(location.search).has("test"))
    window.tactics = {
      get game() {
        return game;
      },
      Battle,
      setGame(g) {
        game = g;
        effects = [];
        shownResult = "";
        pending = false;
        detailKey = "";
        update();
      },
      step(n) {
        for (let i = 0; i < n; i++) {
          game.step();
          drain();
          for (const e of effects) e.life -= STEP;
          effects = effects.filter((e) => e.life > 0);
        }
        update();
      },
      pause(v) {
        paused = v;
      },
      save,
      draw() {
        paint(ctx, images, game.s, selected, effects, 0, reduced, false);
      },
      get effects() {
        return effects;
      },
      get disposed() {
        return disposed;
      },
    };
} catch (e) {
  open(
    '<h2>아트를 불러오지 못했어요</h2><p>온라인 연결을 확인한 뒤 다시 시도해 주세요.</p><button id="reload">다시 불러오기</button>',
    false,
  );
  $("#reload").onclick = () => location.reload();
  console.error(e);
}
