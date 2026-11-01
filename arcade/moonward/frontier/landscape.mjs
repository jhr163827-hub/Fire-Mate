// Native fullscreen/orientation request: no CSS rotation or canvas coordinate changes.
export function setupLandscape(
  button,
  notify,
  doc = document,
  orientation = screen.orientation,
) {
  let locked = false,
    ownsFullscreen = false,
    busy = false,
    generation = 0;
  const root = doc.documentElement;
  function render() {
    button.disabled = busy;
    button.textContent = busy
      ? "전환 중"
      : locked || ownsFullscreen
        ? "가로 해제"
        : "가로모드";
    button.setAttribute("aria-pressed", String(locked || ownsFullscreen));
  }
  function unlock() {
    if (locked) {
      try {
        orientation?.unlock?.();
      } catch {}
    }
    locked = false;
  }
  function release(exit = false) {
    generation++;
    unlock();
    const leave = exit && ownsFullscreen && doc.fullscreenElement === root;
    ownsFullscreen = false;
    busy = false;
    render();
    if (leave) {
      try {
        Promise.resolve(doc.exitFullscreen()).catch(() => {});
      } catch {}
    }
  }
  async function toggle() {
    if (busy) return;
    if (locked || ownsFullscreen) {
      release(true);
      notify("가로 고정을 해제했어요.");
      return;
    }
    busy = true;
    const ticket = ++generation;
    render();
    try {
      if (!doc.fullscreenElement && root.requestFullscreen) {
        try {
          await root.requestFullscreen();
          if (ticket === generation)
            ownsFullscreen = doc.fullscreenElement === root;
          else if (!ownsFullscreen && doc.fullscreenElement === root) {
            try {
              await doc.exitFullscreen();
            } catch {}
          }
        } catch {}
      }
      if (ticket !== generation) return;
      if (orientation?.lock) {
        try {
          await orientation.lock("landscape");
          if (ticket !== generation) {
            try {
              orientation.unlock?.();
            } catch {}
            return;
          }
          locked = true;
        } catch {}
      }
      if (ticket !== generation) return;
      notify(
        locked
          ? "가로모드로 전환했어요."
          : "자동 회전 미지원 · 휴대폰을 가로로 돌려 주세요.",
      );
    } finally {
      if (ticket === generation) {
        busy = false;
        render();
      }
    }
  }
  doc.addEventListener("fullscreenchange", () => {
    if (ownsFullscreen && doc.fullscreenElement !== root) release();
  });
  button.addEventListener("click", toggle);
  render();
  return { release, toggle };
}
