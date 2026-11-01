import { UNLOCKS } from "./campaign-data.mjs";
export const emptyProfile = () => ({ v: 1, records: {}, endless: {} });
export function loadProfile(raw) {
  try {
    const p = JSON.parse(raw),
      q = emptyProfile();
    if (
      p.v !== 1 ||
      !p.records ||
      typeof p.records !== "object" ||
      Array.isArray(p.records)
    )
      return q;
    for (const [k, r] of Object.entries(p.records))
      if (
        /^(normal|hard|challenge):([1-9]|[12][0-9]|30)$/.test(k) &&
        r &&
        [1, 2, 3].includes(r.stars) &&
        Number.isFinite(r.time) &&
        r.time >= 0 &&
        Number.isFinite(r.lives) &&
        r.lives >= 0 &&
        r.lives <= 30
      )
        q.records[k] = { stars: r.stars, time: r.time, lives: r.lives };
    for (const [k, n] of Object.entries(p.endless || {}))
      if (
        /^([1-9]|[12][0-9]|30)$/.test(k) &&
        Number.isInteger(n) &&
        n >= 0 &&
        n <= 9999
      )
        q.endless[k] = n;
    return q;
  } catch {
    return emptyProfile();
  }
}
export function unlockedStage(p) {
  let n = 1;
  while (n < 30 && p.records["normal:" + n]) n++;
  return n;
}
export const availableTowers = (p) =>
  UNLOCKS.filter(([, n]) => n <= unlockedStage(p)).map(([k]) => k);
export function canStart(p, id, mode) {
  if (!Number.isInteger(id) || id < 1 || id > 30) return false;
  if (mode === "normal") return id <= unlockedStage(p);
  if (mode === "endless")
    return !!p.records["normal:6"] && id <= unlockedStage(p);
  return ["hard", "challenge"].includes(mode) && !!p.records["normal:" + id];
}
export function complete(p, s) {
  if (!s.stage) return false;
  if (s.mode === "endless") {
    if (s.phase !== "lost") return false;
    p.endless[s.stage] = Math.max(p.endless[s.stage] || 0, s.wave - 1);
    return true;
  }
  if (s.phase !== "won" || s.wave !== 6) return false;
  const key = s.mode + ":" + s.stage,
    r = p.records[key];
  p.records[key] = {
    stars: Math.max(r?.stars || 0, s.lives >= 27 ? 3 : s.lives >= 18 ? 2 : 1),
    time: Math.min(r?.time ?? Infinity, s.time),
    lives: Math.max(r?.lives || 0, s.lives),
  };
  return true;
}
