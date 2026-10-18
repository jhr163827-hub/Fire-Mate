(() => {
  "use strict";
  const $ = (id) => document.getElementById(id),
    KEY = "firemate_arcade_watermelon_scores_v1",
    STATE = "firemate_arcade_watermelon_state_v1",
    BACKUP = STATE + "_legacy_backup";
  const canvas = $("game"),
    ctx = canvas.getContext("2d");
  let P = window.WatermelonPhysics,
    art = window.WatermelonArt,
    game,
    paused = false,
    raf = 0,
    last = 0,
    accumulator = 0,
    lastSaved = -Infinity,
    lastRendered = -1,
    dragId = null,
    soundEnabled = false,
    audio = null,
    saveBlocked = false,
    savedError = false,
    dialogResume = false;
  let frameSamples = [],
    inputCount = 0;
  function notice(s) {
    $("notice").textContent = s;
  }
  function error(s) {
    savedError = true;
    $("saveStatus").textContent = s;
    $("saveStatus").classList.add("error");
  }
  function scores() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(raw)
        ? raw
            .filter((x) => x && Number.isFinite(x.score) && x.score >= 0)
            .slice()
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
        : [];
    } catch {
      return [];
    }
  }
  function rank() {
    const list = scores();
    $("best").textContent = Math.max(
      game?.score || 0,
      ...list.map((x) => x.score),
      0,
    ).toLocaleString("ko-KR");
    const ol = $("scores");
    ol.replaceChildren();
    if (!list.length) {
      const li = document.createElement("li");
      li.textContent = "첫 기록을 기다리고 있어요";
      ol.append(li);
    }
    for (const item of list) {
      const li = document.createElement("li");
      li.append(
        document.createTextNode(item.score.toLocaleString("ko-KR") + "점"),
      );
      const span = document.createElement("span");
      span.textContent =
        (item.date || "") + (item.rules === "garden-v2" ? "" : " · 이전 규칙");
      li.append(span);
      ol.append(li);
    }
  }
  function recordScore() {
    if (!game || game.score <= 0 || game.recorded) return true;
    const list = scores();
    if (!list.some((x) => x.sessionId === game.sessionId))
      list.push({
        score: game.score,
        date: new Date().toLocaleDateString("ko-KR"),
        rules: game.rules,
        sessionId: game.sessionId,
      });
    list.sort((a, b) => b.score - a.score);
    try {
      localStorage.setItem(KEY, JSON.stringify(list.slice(0, 10)));
      game.recorded = true;
      rank();
      return true;
    } catch {
      error("랭킹 저장 실패 · 도움말에서 이어하기 데이터를 보관해 주세요");
      return false;
    }
  }
  function persist(force = false) {
    if (
      !game ||
      saveBlocked ||
      (!force && performance.now() - lastSaved < 1500)
    )
      return false;
    try {
      const snapshot = { ...game.snapshot(), sound: soundEnabled };
      const json = JSON.stringify(snapshot);
      localStorage.setItem(STATE, json);
      lastSaved = performance.now();
      savedError = false;
      $("saveStatus").classList.remove("error");
      $("saveStatus").textContent = "이 기기에 이어하기 자동 저장";
      return true;
    } catch {
      error(
        "저장 공간 부족 · 기존 저장은 유지됩니다. 도움말에서 내려받아 주세요",
      );
      return false;
    }
  }
  function overlay(title, text, kind = "pause") {
    $("overlayKicker").textContent =
      kind === "over"
        ? "오늘의 정원 기록"
        : kind === "error"
          ? "데이터를 보호하고 있어요"
          : "잠깐 쉬어가기";
    $("overlayTitle").textContent = title;
    $("overlayText").textContent = text;
    $("resume").textContent =
      kind === "over"
        ? "다시 한 판"
        : kind === "error"
          ? "저장 없이 시작"
          : "이어하기";
    $("overlayRestart").hidden = kind !== "pause";
    $("gameOverlay").hidden = false;
  }
  function pause(show = true) {
    if (!game || game.over) return;
    paused = true;
    dragId = null;
    last = 0;
    accumulator = 0;
    persist(true);
    $("pause").textContent = "이어하기";
    if (show) overlay("준비되면 이어서!", "과일과 점수는 그대로 있어요.");
    draw(performance.now());
  }
  function resume() {
    if (game?.over) {
      newGame();
      return;
    }
    if (!game) return;
    paused = false;
    last = 0;
    accumulator = 0;
    $("gameOverlay").hidden = true;
    $("pause").textContent = "일시정지";
    notice(
      game.migrationUntil > game.elapsed
        ? "이전 과일을 천천히 안정시키고 있어요."
        : "위치를 정하고 손을 떼면 톡, 떨어져요.",
    );
    startFrame();
  }
  function popSound(level) {
    if (!soundEnabled) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume();
      const o = audio.createOscillator(),
        g = audio.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(360 + level * 38, audio.currentTime);
      o.frequency.exponentialRampToValueAtTime(
        670 + level * 45,
        audio.currentTime + 0.065,
      );
      g.gain.setValueAtTime(0.035, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.14);
      o.connect(g);
      g.connect(audio.destination);
      o.start();
      o.stop(audio.currentTime + 0.15);
    } catch {}
  }
  function onMerge(e) {
    popSound(e.level);
    if (e.double) notice("수박 두 개가 만나 정원이 한결 넓어졌어요!");
    else if (e.level === 10)
      notice("커다란 수박이 자랐어요! 다음 수박도 도전해 보세요.");
    update();
  }
  function onEnd() {
    paused = true;
    dragId = null;
    const ranked = recordScore(),
      saved = persist(true);
    if (!ranked) error("랭킹 저장 실패 · 이어하기 데이터를 내려받아 주세요");
    overlay(
      game.score.toLocaleString("ko-KR") + "점",
      "위험선 위에 과일이 남았어요. 한 번 더 가꿔 볼까요?",
      "over",
    );
    notice(
      saved && ranked
        ? "게임 종료 · 기록과 과일 상태를 저장했습니다."
        : "게임 종료 · 저장 상태를 아래에서 확인해 주세요.",
    );
    $("pause").disabled = true;
    update();
  }
  function create() {
    return new P.Game({ onMerge, onEnd });
  }
  function newGame() {
    if (
      game &&
      !game.over &&
      game.bodies.length &&
      !confirm("지금의 과일 정원을 마치고 새로 시작할까요?")
    )
      return false;
    if (
      game &&
      game.score > 0 &&
      !recordScore() &&
      !confirm("현재 점수를 저장하지 못했어요. 그래도 새로 시작할까요?")
    )
      return false;
    if (saveBlocked) {
      let raw;
      try {
        raw = localStorage.getItem(STATE);
        if (raw) {
          localStorage.setItem(BACKUP, raw);
          if (localStorage.getItem(BACKUP) !== raw) throw Error("backup");
        }
      } catch {
        error("원본 보관에 실패했습니다. 저장 없이 플레이합니다.");
      }
    }
    game?.destroy();
    game = create();
    paused = false;
    last = 0;
    accumulator = 0;
    $("pause").disabled = false;
    $("pause").textContent = "일시정지";
    $("gameOverlay").hidden = true;
    notice("위치를 정하고 손을 떼면 톡, 떨어져요.");
    update();
    persist(true);
    startFrame();
    return true;
  }
  function update() {
    if (!game) return;
    $("score").textContent = game.score.toLocaleString("ko-KR");
    $("nextName").textContent = P.FRUITS[game.next].name;
    art.thumbnail($("next"), game.next);
    rank();
    document
      .querySelectorAll("#evolution>div")
      .forEach((el, i) => el.classList.toggle("current", i === game.current));
    const max = Math.max(game.current, ...game.bodies.map((b) => b.wm.level));
    $("discovered").textContent = max + 1 + "단계 과일이 자라는 중";
    canvas.setAttribute(
      "aria-label",
      "수박 정원. 현재 " +
        P.FRUITS[game.current].name +
        ", 다음 " +
        P.FRUITS[game.next].name +
        ". 방향키로 이동, 스페이스로 낙하.",
    );
  }
  function boardBackground(time) {
    const { C } = P;
    ctx.clearRect(0, 0, C.width, C.height);
    const bg = ctx.createLinearGradient(0, 0, 0, C.height);
    bg.addColorStop(0, "#f7f5df");
    bg.addColorStop(0.18, "#fffcef");
    bg.addColorStop(1, "#f8f0d9");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, C.width, C.height);
    ctx.strokeStyle = "#e7e8cf";
    ctx.lineWidth = 0.7;
    for (let y = 100; y < C.floor; y += 44) {
      ctx.beginPath();
      ctx.moveTo(C.left, y);
      ctx.lineTo(C.right, y);
      ctx.stroke();
    }
    ctx.fillStyle = "#d0dbb4";
    ctx.fillRect(0, C.dangerY, C.left, C.height - C.dangerY);
    ctx.fillRect(C.right, C.dangerY, C.width - C.right, C.height - C.dangerY);
    ctx.fillRect(0, C.floor, C.width, C.height - C.floor);
    ctx.fillStyle = "#b4c89d";
    ctx.fillRect(C.left - 2, C.dangerY, 2, C.floor - C.dangerY);
    ctx.fillRect(C.right, C.dangerY, 2, C.floor - C.dangerY);
    ctx.fillRect(C.left, C.floor, C.right - C.left, 2);
    ctx.save();
    const warn = game.danger > 0;
    ctx.strokeStyle = warn ? "#db7867" : "#d9a58b";
    ctx.globalAlpha = warn ? 0.6 + Math.sin(time / 130) * 0.2 : 0.6;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(C.left + 1, C.dangerY);
    ctx.lineTo(C.right - 1, C.dangerY);
    ctx.stroke();
    ctx.restore();
    ctx.font = "10px system-ui";
    ctx.fillStyle = game.danger > 0 ? "#bd6655" : "#b4a18b";
    ctx.textAlign = "left";
    ctx.fillText(
      game.danger > 0
        ? "잠깐! 과일이 내려올 공간을 만들어 주세요"
        : "넘치지 않게, 차근차근",
      C.left + 6,
      C.dangerY + 16,
    );
    if (game.danger > 0) {
      ctx.fillStyle = "#e39b83";
      ctx.fillRect(
        C.left,
        C.dangerY - 3,
        (C.right - C.left) * Math.min(1, game.danger / C.dangerGrace),
        3,
      );
    }
  }
  function draw(time) {
    if (!P || !art || !game) return;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    boardBackground(time);
    const { C } = P;
    if (!game.over) {
      ctx.save();
      ctx.strokeStyle = "#92ae8355";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      ctx.moveTo(game.aim, C.dangerY + 20);
      ctx.lineTo(game.aim, C.floor);
      ctx.stroke();
      ctx.restore();
    }
    for (const b of game.bodies)
      art.draw(ctx, b.wm.level, b.position.x, b.position.y, b.angle, 1, time);
    if (!game.over) {
      const ready = game.canDrop() && !paused;
      art.draw(
        ctx,
        game.current,
        game.aim,
        Math.max(C.spawnY, P.FRUITS[game.current].r * 1.3 + 3),
        0,
        ready ? 1 : 0.38,
        time,
      );
      if (dragId !== null) {
        ctx.fillStyle = "#87a378";
        ctx.beginPath();
        ctx.moveTo(game.aim - 4, 3);
        ctx.lineTo(game.aim + 4, 3);
        ctx.lineTo(game.aim, 8);
        ctx.fill();
      }
    }
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const e of game.events) {
      const age = game.elapsed - e.time;
      if (age > 700) continue;
      const t = age / 700,
        r = P.FRUITS[e.level].r;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = e.double ? "#74bb9c" : "#e4bb68";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, r * (0.75 + t * 0.65), 0, 7);
      ctx.stroke();
      if (!reduced)
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4 + e.time * 0.003;
          ctx.fillStyle = i % 2 ? "#f1c572" : "#aad191";
          ctx.beginPath();
          ctx.arc(
            e.x + Math.cos(a) * (r + 12 + t * 27),
            e.y + Math.sin(a) * (r + 12 + t * 27) - t * 10,
            2 * (1 - t) + 0.5,
            0,
            7,
          );
          ctx.fill();
        }
      ctx.fillStyle = "#55734a";
      ctx.textAlign = "center";
      ctx.font = "bold 15px system-ui";
      ctx.fillText("+" + e.points, e.x, e.y - r - 8 - t * 20);
      ctx.restore();
    }
  }
  function frame(now) {
    raf = 0;
    if (document.hidden) return;
    const started = performance.now();
    if (!paused && !game.over) {
      if (last) {
        accumulator += Math.min(80, now - last);
        let steps = 0;
        while (accumulator >= P.C.step && steps < 8 && !game.over) {
          game.step();
          accumulator -= P.C.step;
          steps++;
        }
        if (steps === 8) accumulator = 0;
      }
      last = now;
      persist();
    }
    if (lastRendered !== Math.floor(game.elapsed / 150)) {
      lastRendered = Math.floor(game.elapsed / 150);
      $("score").textContent = game.score.toLocaleString("ko-KR");
    }
    draw(now);
    frameSamples.push(performance.now() - started);
    if (frameSamples.length > 360) frameSamples.shift();
    if (!paused && !game.over) raf = requestAnimationFrame(frame);
  }
  function startFrame() {
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function point(e) {
    const rect = canvas.getBoundingClientRect();
    game.setAim(((e.clientX - rect.left) * P.C.width) / rect.width);
  }
  function drop() {
    if (paused || game.over) return false;
    const b = game.drop();
    if (!b) return false;
    inputCount++;
    notice(
      "다음 과일은 " +
        P.FRUITS[game.next].name +
        " · 같은 과일끼리 만나게 해 보세요.",
    );
    update();
    persist(true);
    startFrame();
    return true;
  }
  function showDialog(id) {
    dialogResume = !paused && !game.over;
    pause(false);
    $(id).showModal();
  }
  function closeDialog(id) {
    $(id).close();
    if (dialogResume && !game.over) resume();
    dialogResume = false;
  }
  try {
    if (!P || !art)
      throw Error(
        "게임 파일을 불러오지 못했습니다. 온라인에서 다시 열어 주세요.",
      );
    game = create();
    const evolution = $("evolution");
    for (const f of P.FRUITS) {
      const el = document.createElement("div"),
        icon = document.createElement("canvas"),
        n = document.createElement("small");
      el.title = f.name;
      art.thumbnail(icon, f.level);
      icon.setAttribute("role", "img");
      n.textContent = f.level + 1;
      el.append(icon, n);
      evolution.append(el);
    }
    let raw = null;
    try {
      raw = localStorage.getItem(STATE);
    } catch {
      saveBlocked = true;
      error("브라우저 저장소를 사용할 수 없습니다.");
    }
    if (raw) {
      try {
        const s = JSON.parse(raw);
        P.validate(s);
        if (s.version === 1) {
          try {
            if (localStorage.getItem(BACKUP) === null)
              localStorage.setItem(BACKUP, raw);
            if (!localStorage.getItem(BACKUP)) throw Error("backup");
          } catch {
            saveBlocked = true;
            error(
              "이전 상태의 보관 공간이 부족해 기존 저장을 덮어쓰지 않습니다.",
            );
          }
        }
        const restored = game.restore(s);
        soundEnabled = !!s.sound;
        paused = true;
        update();
        if (!saveBlocked) persist(true);
        if (game.over) {
          recordScore();
          overlay(
            game.score.toLocaleString("ko-KR") + "점",
            "지난 정원의 기록이에요. 새 게임을 시작할 수 있어요.",
            "over",
          );
          $("pause").disabled = true;
        } else {
          overlay(
            "다시 만나 반가워요",
            restored.migrated
              ? "이전 과일 " +
                  restored.count +
                  "개와 점수를 보존했어요. 새 물리로 이어갈 수 있어요."
              : "이전 과일과 점수에서 그대로 이어가요.",
          );
          $("pause").textContent = "이어하기";
          notice("이어하기를 누르면 과일이 다시 움직여요.");
        }
      } catch (e) {
        saveBlocked = true;
        paused = true;
        error("원본 이어하기 데이터 보존 중 · 도움말에서 내려받을 수 있어요");
        overlay("저장 데이터를 보존했어요", e.message, "error");
      }
    } else {
      update();
      if (!saveBlocked) persist(true);
    }
    $("sound").setAttribute("aria-pressed", String(soundEnabled));
    $("sound").textContent = soundEnabled ? "소리 켜짐" : "소리 꺼짐";
    canvas.addEventListener("pointerdown", (e) => {
      if (paused || game.over || dragId !== null || !e.isPrimary) return;
      e.preventDefault();
      dragId = e.pointerId;
      canvas.setPointerCapture(e.pointerId);
      point(e);
      draw(performance.now());
    });
    canvas.addEventListener("pointermove", (e) => {
      if (e.pointerId !== dragId) return;
      e.preventDefault();
      point(e);
      if (paused) draw(performance.now());
    });
    canvas.addEventListener("pointerup", (e) => {
      if (e.pointerId !== dragId) return;
      e.preventDefault();
      point(e);
      dragId = null;
      drop();
    });
    canvas.addEventListener("pointercancel", (e) => {
      if (e.pointerId === dragId) dragId = null;
    });
    canvas.addEventListener("lostpointercapture", () => (dragId = null));
    canvas.addEventListener("keydown", (e) => {
      if (paused || game.over) return;
      if (["ArrowLeft", "ArrowRight", " ", "Enter"].includes(e.key)) {
        e.preventDefault();
        if (e.key === "ArrowLeft") game.setAim(game.aim - 9);
        else if (e.key === "ArrowRight") game.setAim(game.aim + 9);
        else drop();
        draw(performance.now());
      }
    });
    $("pause").onclick = () => (paused ? resume() : pause());
    $("resume").onclick = resume;
    $("restart").onclick = newGame;
    $("overlayRestart").onclick = newGame;
    $("rankToggle").onclick = () => {
      rank();
      showDialog("rankDialog");
    };
    $("rankClose").onclick = () => closeDialog("rankDialog");
    $("helpOpen").onclick = () => showDialog("helpDialog");
    $("helpClose").onclick = () => closeDialog("helpDialog");
    for (const id of ["rankDialog", "helpDialog"])
      $(id).addEventListener("cancel", (e) => {
        e.preventDefault();
        closeDialog(id);
      });
    $("sound").onclick = () => {
      soundEnabled = !soundEnabled;
      $("sound").setAttribute("aria-pressed", String(soundEnabled));
      $("sound").setAttribute(
        "aria-label",
        soundEnabled ? "효과음 끄기" : "효과음 켜기",
      );
      $("sound").textContent = soundEnabled ? "소리 켜짐" : "소리 꺼짐";
      if (soundEnabled) popSound(2);
      persist(true);
    };
    $("exportSave").onclick = () => {
      let original = null;
      try {
        original = localStorage.getItem(STATE);
      } catch {}
      const text =
        saveBlocked && original
          ? original
          : JSON.stringify(game.snapshot(), null, 2);
      const url = URL.createObjectURL(
          new Blob([text], { type: "application/json" }),
        ),
        a = document.createElement("a");
      a.href = url;
      a.download = "watermelon-garden-save.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    document.addEventListener("visibilitychange", () => {
      last = 0;
      accumulator = 0;
      if (document.hidden) {
        pause();
        persist(true);
        if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      }
    });
    window.addEventListener("pagehide", () => {
      dragId = null;
      persist(true);
    });
    window.addEventListener("pageshow", () => {
      if (paused) draw(performance.now());
      else startFrame();
    });
    // This interface is absent for normal players. Tests still exercise real Matter bodies and UI events.
    if (navigator.webdriver)
      window.__watermelon = {
        snapshot: () => game.snapshot(),
        metrics: () => ({
          frameSamples: [...frameSamples],
          inputs: inputCount,
          paused,
          saveBlocked,
        }),
        advance: (ms) => {
          game.advance(ms);
          update();
          draw(performance.now());
        },
        scene: (s) => {
          game.restore(s);
          paused = false;
          $("gameOverlay").hidden = true;
          last = 0;
          update();
          draw(performance.now());
          startFrame();
        },
        save: () => persist(true),
        pause: () => pause(),
      };
    draw(performance.now());
    if (!paused) startFrame();
    window.watermelonReady = true;
  } catch (e) {
    paused = true;
    error(e.message);
    $("gameOverlay").hidden = false;
    $("overlayTitle").textContent = "정원을 열지 못했어요";
    $("overlayText").textContent =
      "저장된 게임은 그대로입니다. 온라인에서 페이지를 다시 열어 주세요.";
    $("resume").textContent = "다시 불러오기";
    $("resume").onclick = () => location.reload();
    $("pause").disabled = true;
  }
})();
