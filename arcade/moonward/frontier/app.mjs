import { Game } from "./engine.mjs";
import { KEY, STEP, WAVES, TOWERS, FOES, stats } from "./data.mjs";
import { paint, tower } from "./render.mjs";
const $ = (s) => document.querySelector(s),
  c = $("#canvas").getContext("2d"),
  dialog = $("#dialog");
let game = new Game(1),
  ui = { selected: 0, build: null, preview: null, valid: false, spell: false },
  paused = false,
  speed = 1,
  muted = true,
  reduced = matchMedia("(prefers-reduced-motion: reduce)").matches,
  fx = [],
  last = 0,
  acc = 0,
  raf = 0,
  disposed = false,
  lastUI = 0,
  lastSave = 0,
  bannerEnd = 0,
  result = "",
  detailKey = "",
  audio = null,
  beforeDialog = false;
const resize = new ResizeObserver(() => {
  const r = $("#stage").getBoundingClientRect();
  $("#board").style.width = Math.min(r.width, r.height * 1.6) + "px";
});
resize.observe($("#stage"));
function note(s) {
  $("#notice").textContent = s;
}
function banner(s) {
  $("#banner").textContent = s;
  $("#banner").classList.add("show");
  bannerEnd = performance.now() + 2200;
}
function save() {
  try {
    if (!game.s.towers.length && game.s.wave === 0)
      localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, game.serialize());
    $("#saved").textContent = "전용 자동 저장";
  } catch {
    $("#saved").textContent = "저장 공간 확인 필요";
  }
}
function sound(type) {
  if (muted) return;
  try {
    audio ??= new AudioContext();
    audio.resume().catch(() => {});
    let o = audio.createOscillator(),
      g = audio.createGain();
    o.type = type === "blast" ? "triangle" : "sine";
    o.frequency.value = type === "blast" ? 110 : 560;
    g.gain.setValueAtTime(0.025, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.1);
    o.connect(g);
    g.connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + 0.11);
  } catch {}
}
function show(html) {
  beforeDialog = paused;
  paused = true;
  $("#dialogBody").innerHTML = html;
  if (!dialog.open) dialog.showModal();
}
function close() {
  dialog.close();
  paused = beforeDialog;
  last = 0;
}
$("#close").onclick = close;
dialog.addEventListener("cancel", (e) => {
  e.preventDefault();
  close();
});
function fresh() {
  game = new Game(1);
  ui = { selected: 0, build: null, preview: null, valid: false, spell: false };
  fx = [];
  result = "";
  detailKey = "";
  acc = 0;
  speed = 1;
  paused = false;
  beforeDialog = false;
  if (dialog.open) dialog.close();
  save();
  update();
}
function settings() {
  show(
    '<h2>잠깐 쉬어가기</h2><p>전투가 정지했어요. 위치와 강화를 천천히 생각해 보세요.</p><div class="settingrow">소리<button id="sound"></button></div><div class="settingrow">효과 줄이기<button id="motion"></button></div><button id="restart">처음부터 다시</button><button id="exit">저장하고 아케이드로</button>',
  );
  $("#sound").textContent = muted ? "꺼짐" : "켜짐";
  $("#motion").textContent = reduced ? "켜짐" : "꺼짐";
  $("#sound").onclick = () => {
    muted = !muted;
    $("#sound").textContent = muted ? "꺼짐" : "켜짐";
  };
  $("#motion").onclick = () => {
    reduced = !reduced;
    $("#motion").textContent = reduced ? "켜짐" : "꺼짐";
  };
  $("#restart").onclick = () => {
    show(
      '<h2>새 방어선 만들기</h2><p>현재 전술전 진행만 초기화합니다. 기존 게임과 금융 데이터는 유지됩니다.</p><button id="confirmRestart" class="go">처음부터 시작</button>',
    );
    $("#confirmRestart").onclick = fresh;
    beforeDialog = true;
  };
  $("#exit").onclick = () => {
    save();
    location.href = "../../index.html";
  };
}
$("#settings").onclick = settings;
$("#pause").onclick = () => {
  paused = !paused;
  last = 0;
  update();
};
$("#speed").onclick = () => {
  speed = speed === 1 ? 2 : 1;
  update();
};
$("#start").onclick = () => {
  if (game.start()) {
    paused = false;
    ui.build = null;
    ui.preview = null;
    detailKey = "";
    banner(`${game.s.wave}웨이브 · ${WAVES[game.s.wave - 1].name}`);
    document.querySelector("aside").scrollTop = 0;
    save();
    update();
  }
};
$("#spell").onclick = () => {
  ui.spell = !ui.spell;
  ui.build = null;
  ui.preview = null;
  detailKey = "";
  note(
    ui.spell
      ? "전장을 눌러 포격하세요. 넓은 범위에 갑옷 무시 피해 260."
      : "포격 취소",
  );
  update();
};
$("#mapSpell").onclick = () => $("#spell").click();
$("#help").onclick = () =>
  show(
    '<h2>적을 보고 무기를 고르세요</h2><div class="encyclopedia">' +
      Object.entries(TOWERS)
        .map(([k, t]) => `<article><b>${t.name}</b><p>${t.hint}</p></article>`)
        .join("") +
      "</div><p><b>철갑벌레</b> · 일반 피해를65% 줄입니다. 번개·화염·저격 강화로 대응하세요.</p><p><b>수송체 / 전차</b> · 파괴되면 작은 적이 나옵니다. 전차가 통과하면 성문20을 잃습니다.</p><p>굽이 안쪽에서는 같은 포탑이 위·아래 길을 모두 공격해요. 전투 중 정지해도 구매와 강화는 가능합니다. 판매는 투자금75%를 돌려줍니다.</p><p>각 포탑은 두 강화 갈래 중 하나를 골라3단계까지 성장합니다. 긴급 포격은32초마다 다시 사용할 수 있어요.</p>",
  );
$("#shop").innerHTML = Object.entries(TOWERS)
  .map(
    ([k, t]) =>
      `<button data-buy="${k}" aria-label="${t.name} ${t.cost}동전 구매"><canvas width="110" height="98" aria-hidden="true"></canvas><strong>${t.name}</strong><span>${k === "dart" ? "빠른 단일" : k === "bomb" ? "넓은 폭발" : k === "ice" ? "무리 감속" : "갑옷 관통"}</span><b>${t.cost}</b></button>`,
  )
  .join("");
for (const b of document.querySelectorAll("[data-buy]")) {
  const k = b.dataset.buy,
    ctx = b.querySelector("canvas").getContext("2d");
  ctx.scale(2, 2);
  tower(ctx, { kind: k, x: 27, y: 31, level: 0, angle: -0.6 }, 1);
  b.onclick = () => {
    ui.build = ui.build === k ? null : k;
    document.querySelector("aside").scrollTop = 0;
    ui.selected = 0;
    ui.preview = null;
    ui.spell = false;
    detailKey = "";
    note(`${TOWERS[k].hint} · 길 옆을 눌러 설치 위치를 고르세요.`);
    update();
  };
}
$("#canvas").addEventListener("pointerup", (e) => {
  const r = e.currentTarget.getBoundingClientRect(),
    x = ((e.clientX - r.left) * 640) / r.width,
    y = ((e.clientY - r.top) * 400) / r.height;
  if (ui.spell) {
    if (game.meteor(x, y)) {
      ui.spell = false;
      banner("지원 포격!");
      save();
    }
    update();
    return;
  }
  if (ui.build) {
    ui.preview = { x: Math.round(x), y: Math.round(y) };
    ui.valid = game.legal(ui.preview.x, ui.preview.y);
    detailKey = "";
    update();
    return;
  }
  const radius = Math.max(22, (22 * 640) / r.width),
    t = game.s.towers
      .filter((t) => Math.hypot(x - t.x, y - t.y) < radius)
      .sort(
        (a, b) => Math.hypot(x - a.x, y - a.y) - Math.hypot(x - b.x, y - b.y),
      )[0];
  ui.selected = t?.id || 0;
  document.querySelector("aside").scrollTop = 0;
  detailKey = "";
  update();
});
function detail() {
  const t = game.s.towers.find((t) => t.id === ui.selected),
    key = JSON.stringify([
      t?.id,
      t?.level,
      t?.target,
      ui.build,
      ui.preview,
      ui.valid,
      game.s.gold,
      game.s.phase,
    ]);
  if (key === detailKey) {
    if (t) {
      $("#damage").textContent = Math.round(t.damage);
      $("#kills").textContent = t.kills;
    }
    return;
  }
  detailKey = key;
  if (ui.build) {
    const a = TOWERS[ui.build];
    $("#detail").innerHTML =
      `<div class="placement"><h3>${a.name} 설치</h3><p>${ui.preview ? (ui.valid ? "여기에 설치할 수 있어요. 사거리 안의 길을 확인하세요." : "길 위·포탑 바로 옆에는 설치할 수 없어요.") : "길 옆 빈 땅을 누르면 사거리와 설치 위치가 보여요."}</p><div class="actions"><button id="place" class="go" ${!ui.preview || !ui.valid || game.s.gold < a.cost ? "disabled" : ""}>설치 · ${a.cost}</button><button id="cancelBuild">취소</button></div></div>`;
    $("#place").onclick = () => {
      const p = ui.preview,
        t = game.buy(ui.build, p.x, p.y);
      if (t) {
        ui.selected = t.id;
        ui.build = null;
        ui.preview = null;
        banner(`${TOWERS[t.kind].name} 배치!`);
        note("포탑을 누르면 강화·타깃을 바꿀 수 있어요.");
        save();
        detailKey = "";
        update();
      }
    };
    $("#cancelBuild").onclick = () => {
      ui.build = null;
      ui.preview = null;
      detailKey = "";
      update();
    };
    return;
  }
  if (!t) {
    $("#detail").innerHTML =
      "<h3>길목이 전략이에요</h3><p>굽이 안쪽에 설치하면 위·아래 길을 함께 공격합니다. <b>포탑을 누르면 사거리와 강화</b>를 볼 수 있어요.</p>";
    return;
  }
  const a = stats(t),
    type = TOWERS[t.kind];
  $("#detail").innerHTML =
    `<h3>${type.name} ${t.level ? `· ${type.branches[t.branch].name} ${t.level}` : ""}</h3><small>${type.hint}</small><div class="metrics"><span>피해 ${Math.round(a.damage)} / ${a.rate.toFixed(2)}초</span><span>사거리 ${a.range}</span><span>누적 <b id="damage">${Math.round(t.damage)}</b> · 처치 <b id="kills">${t.kills}</b></span></div><div class="targets">타깃 ${[
      ["first", "선두"],
      ["strong", "강한 적"],
      ["last", "후미"],
    ]
      .map(
        ([k, n]) =>
          `<button data-target="${k}" class="${t.target === k ? "active" : ""}">${n}</button>`,
      )
      .join("")}</div><div class="branches">${type.branches
      .map((b, i) => {
        let locked = t.level && t.branch !== i;
        return `<button data-upgrade="${i}" ${locked || t.level === 3 || game.s.gold < b.costs[t.level] ? "disabled" : ""}><strong>${b.name} ${locked ? "" : t.level === 3 ? "완성" : t.level + 1}</strong><em>${locked ? "다른 강화 갈래 선택됨" : t.level === 3 ? "최종 강화 완료" : b.descs[t.level]}</em><b>${locked || t.level === 3 ? "—" : b.costs[t.level] + " 동전"}</b></button>`;
      })
      .join(
        "",
      )}</div><button class="sell" id="sell">판매 · ${Math.floor(t.spent * 0.75)} 반환</button>`;
  for (const b of document.querySelectorAll("[data-target]"))
    b.onclick = () => {
      t.target = b.dataset.target;
      detailKey = "";
      save();
      update();
    };
  for (const b of document.querySelectorAll("[data-upgrade]"))
    b.onclick = () => {
      let branch = +b.dataset.upgrade,
        u = type.branches[branch];
      show(
        `<h2>${u.name} ${t.level + 1}</h2><p>${u.descs[t.level]}</p><p>${t.level ? "강화를 이어갑니다." : "이 갈래를 선택하면 반대 갈래는 잠깁니다."} 비용 ${u.costs[t.level]}동전</p><button class="go" id="confirmUpgrade">강화 적용</button>`,
      );
      $("#confirmUpgrade").onclick = () => {
        if (game.upgrade(t.id, branch)) {
          close();
          banner("포탑 강화!");
          detailKey = "";
          save();
          update();
        }
      };
    };
  $("#sell").onclick = () => {
    show(
      `<h2>${type.name} 판매?</h2><p>${Math.floor(t.spent * 0.75)}동전을 돌려받습니다.</p><button id="confirmSell">판매하기</button>`,
    );
    $("#confirmSell").onclick = () => {
      game.sell(t.id);
      ui.selected = 0;
      detailKey = "";
      close();
      save();
      update();
    };
  };
}
function update() {
  document
    .querySelector("aside")
    .classList.toggle("focused", Boolean(ui.selected || ui.build));
  const s = game.s;
  document
    .querySelector("aside")
    .classList.toggle("battle", s.phase === "battle");
  $("#mapSpell").disabled = s.phase !== "battle" || s.spell > 0;
  $("#mapSpell").textContent =
    s.spell > 0 ? `포격 ${Math.ceil(s.spell)}초` : ui.spell ? "취소" : "포격";
  $("#gold").textContent = s.gold;
  $("#lives").textContent = s.lives;
  $("#wave").textContent = `${s.wave} / 12`;
  $("#speed").textContent = speed + "×";
  $("#pause").textContent = paused ? "재개" : "정지";
  let w = WAVES[Math.min(s.wave, 11)];
  $("#phase").textContent =
    s.phase === "battle"
      ? `방어 중 · 남은 적 ${s.enemies.length + s.queue.length}`
      : s.wave
        ? "웨이브 완료 · 재배치 시간"
        : "첫 방어선 준비";
  $("#next").textContent =
    s.phase === "battle"
      ? `${s.wave} · ${WAVES[s.wave - 1].name}`
      : `다음 ${s.wave + 1} · ${w.name}`;
  $("#hint").textContent =
    s.phase === "battle" ? WAVES[s.wave - 1].hint : w.hint;
  $("#start").disabled = s.phase !== "ready" || !s.towers.length;
  $("#start").textContent =
    s.phase === "battle" ? "방어 중" : `${s.wave + 1}웨이브 시작`;
  $("#spell").disabled = s.phase !== "battle" || s.spell > 0;
  $("#spell").textContent =
    s.spell > 0
      ? `포격 ${Math.ceil(s.spell)}초`
      : ui.spell
        ? "포격 취소"
        : "긴급 포격 · 조준";
  $("#mapNote").textContent = paused
    ? "작전 정지 · 설치와 강화 가능"
    : ui.build
      ? "길 옆을 누른 뒤 설치 버튼"
      : s.phase === "battle"
        ? "포탑을 눌러 타깃·강화 선택"
        : "길 옆 자유 배치 · 굽이를 활용하세요";
  for (const b of document.querySelectorAll("[data-buy]")) {
    b.disabled =
      s.gold < TOWERS[b.dataset.buy].cost ||
      !["ready", "battle"].includes(s.phase);
    b.classList.toggle("active", ui.build === b.dataset.buy);
  }
  detail();
  if (["won", "lost"].includes(s.phase) && result !== s.phase) {
    result = s.phase;
    save();
    const top = Object.entries(s.leaks).sort((a, b) => b[1] - a[1])[0]?.[0];
    const advice =
      top === "boss"
        ? "전차가 뚫렸어요. 저격포·집중 전류를 강한 적 우선으로 두고 포격을 겹쳐 보세요."
        : top === "runner"
          ? "빠른 적이 통과했어요. 뒤쪽 길목에 냉각탑과 속사포를 남겨 보세요."
          : top === "bud"
            ? "작은 적 무리가 샜어요. 수송체를 깨는 위치 뒤에 폭탄포를 두세요."
            : "갑옷과 무리의 균형을 살펴보세요. 전기탑과 폭탄포의 역할이 달라요.";
    show(
      `<h2>${s.phase === "won" ? "숲길을 지켜냈어요!" : "방어선이 뚫렸어요"}</h2><p>${s.wave}/12웨이브 · 처치 ${s.kills} · 성문 ${s.lives}</p><p>${s.phase === "won" ? "다른 강화 갈래와 배치로 다시 도전해 보세요." : advice}</p><button id="retry" class="go">새 방어선으로 재도전</button><button id="resultExit">아케이드로</button>`,
    );
    $("#retry").onclick = fresh;
    $("#resultExit").onclick = () => (location.href = "../../index.html");
  }
}
function drain() {
  for (const e of game.events) {
    if (e.type === "ready") {
      banner(`웨이브 완료 · +${WAVES[game.s.wave - 1].reward} 동전`);
      save();
    }
    if (
      [
        "blast",
        "arc",
        "ice",
        "pop",
        "build",
        "split",
        "warning",
        "leak",
      ].includes(e.type)
    ) {
      const life = reduced ? 0.15 : e.type === "split" ? 0.7 : 0.4;
      fx.push({ ...e, life, max: life });
      if (e.type === "blast" || e.type === "build") sound(e.type);
    }
  }
  game.events = [];
  fx = fx.slice(-120);
}
function frame(now) {
  if (disposed) return;
  let dt = Math.min(0.1, (now - (last || now)) / 1000);
  last = now;
  if (!paused && !document.hidden) {
    acc += dt * speed;
    while (acc >= STEP) {
      game.step();
      acc -= STEP;
    }
    drain();
    for (const f of fx) f.life -= dt * speed;
    fx = fx.filter((f) => f.life > 0);
  }
  paint(c, game.s, ui, fx, now / 1000);
  if (now - lastUI > 120) {
    update();
    lastUI = now;
  }
  if (now - lastSave > 2000) {
    save();
    lastSave = now;
  }
  if (now > bannerEnd) $("#banner").classList.remove("show");
  raf = requestAnimationFrame(frame);
}
function stop() {
  save();
  disposed = true;
  cancelAnimationFrame(raf);
  audio?.close().catch(() => {});
  audio = null;
}
addEventListener("pagehide", stop);
addEventListener("pageshow", (e) => {
  if (e.persisted) {
    disposed = false;
    paused = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    paused = true;
    save();
    audio?.suspend().catch(() => {});
  }
});
let raw;
try {
  raw = localStorage.getItem(KEY);
} catch {}
const restored = raw && Game.restore(raw);
if (restored) {
  game = restored;
  show(
    '<h2>방어선을 이어갈까요?</h2><p>이 게임의 전용 저장만 불러옵니다.</p><button id="resume" class="go">이어하기</button><button id="newGame">새로 시작</button>',
  );
  $("#resume").onclick = () => {
    beforeDialog = false;
    close();
    update();
  };
  $("#newGame").onclick = () => {
    show(
      '<h2>저장된 방어선을 초기화할까요?</h2><button id="confirmRestart">새로 시작</button>',
    );
    $("#confirmRestart").onclick = fresh;
  };
} else if (raw) {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  note("손상된 전술전 저장을 초기화했어요.");
}
update();
raf = requestAnimationFrame(frame);
if (new URLSearchParams(location.search).has("test"))
  window.frontier = {
    get game() {
      return game;
    },
    get ui() {
      return ui;
    },
    setGame(g) {
      game = g;
      ui.selected = 0;
      ui.build = null;
      ui.preview = null;
      result = "";
      detailKey = "";
      fx = [];
      update();
    },
    Game,
    step(n) {
      for (let i = 0; i < n; i++) {
        game.step();
        drain();
        for (const f of fx) f.life -= STEP;
        fx = fx.filter((f) => f.life > 0);
      }
      update();
    },
    pause(v) {
      paused = v;
      last = 0;
    },
    save,
    draw() {
      paint(c, game.s, ui, fx, performance.now() / 1000);
    },
    get disposed() {
      return disposed;
    },
  };
