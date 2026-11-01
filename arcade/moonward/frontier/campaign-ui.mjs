import { REGIONS, stageFor, UNLOCKS } from "./campaign-data.mjs";
import { unlockedStage, canStart } from "./progress.mjs";
import { TOWERS } from "./data.mjs";
export const modeNames = {
  normal: "보통",
  hard: "어려움",
  challenge: "제한 도전",
  endless: "무한 방어",
};
export function miniature(s) {
  return `<svg viewBox="0 0 640 400" aria-hidden="true" style="background:${s.theme.color}">${s.blocks.map((b) => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="12" fill="#789a9e"/>`).join("")}${s.paths.map((p) => `<polyline points="${p.map((v) => v.join(",")).join(" ")}" fill="none" stroke="${s.theme.edge}" stroke-width="42" stroke-linejoin="round"/><polyline points="${p.map((v) => v.join(",")).join(" ")}" fill="none" stroke="${s.theme.road}" stroke-width="29" stroke-linejoin="round"/>`).join("")}<circle cx="610" cy="${s.paths[0].at(-1)[1]}" r="21" fill="#31545b" stroke="#fff0cf" stroke-width="7"/></svg>`;
}
export function campaignMenu(
  p,
  { resume, legacy, choose, onResume, onLegacy },
) {
  const root = document.querySelector("#campaign"),
    n = unlockedStage(p),
    stars = Object.entries(p.records)
      .filter(([k]) => k.startsWith("normal:"))
      .reduce((n, [, r]) => n + r.stars, 0);
  root.hidden = false;
  document.querySelector("main").inert = true;
  root.innerHTML = `<div class="atlas"><div class="atlas-head"><div><small>WOODLAND EXPEDITION · 30 STAGES</small><h1>톱니숲 원정대</h1><p>다섯 지역을 지키고 다음 방어선을 열어보세요.</p></div><a href="../../index.html">나가기</a></div><div class="journey"><b>별 ${stars} / 90</b><span>${n}탄까지 개방</span><button id="journeyGo" class="go">${n}탄 도전</button></div>${resume ? '<button id="campaignResume" class="resume">진행 중인 전투 이어하기</button>' : ""}${REGIONS.map(
    (r, ri) =>
      `<section class="region"><div class="region-title"><small>REGION 0${ri + 1}</small><h2>${r.name}</h2><span>보스 · ${r.boss}</span></div><div class="stage-grid">${Array.from(
        { length: 6 },
        (_, i) => {
          const id = ri * 6 + i + 1,
            rec = p.records["normal:" + id];
          return `<button data-stage="${id}" ${id > n ? "disabled" : ""} class="stage-card ${id === n ? "current" : ""}">${miniature(stageFor(id))}<span><b>${String(id).padStart(2, "0")} ${stageFor(id).name}</b><small>${id > n ? "이전 탄 클리어로 개방" : rec ? "★".repeat(rec.stars) + "☆".repeat(3 - rec.stars) : i === 5 ? "지역 보스" : "새 방어선"}</small></span></button>`;
        },
      ).join("")}</div></section>`,
  ).join(
    "",
  )}<div class="atlas-end"><p>별: 성문 27 이상 3개 · 18 이상 2개 · 클리어 1개<br>각 탄 클리어 → 어려움·제한 도전 / 6탄 클리어 → 무한 방어</p><button id="legacyRun">${legacy ? "기존 12웨이브 이어하기" : "기존 12웨이브 도전"}</button><a href="../?classic">원작 월광 수호단</a></div></div>`;
  root
    .querySelectorAll("[data-stage]")
    .forEach((b) => (b.onclick = () => choose(+b.dataset.stage)));
  root.querySelector("#journeyGo").onclick = () => choose(n);
  if (resume) root.querySelector("#campaignResume").onclick = onResume;
  root.querySelector("#legacyRun").onclick = onLegacy;
}
export function hideCampaign() {
  document.querySelector("#campaign").hidden = true;
  document.querySelector("main").inert = false;
}
export function stageDetail(p, id) {
  const s = stageFor(id),
    unlock = UNLOCKS.find(([, n]) => n === id + 1);
  return `<small>STAGE ${id} · ${s.theme.name}</small><h2>${s.name}</h2><div class="route-preview">${miniature(s)}</div><p>${s.description}</p>${s.boss ? `<p><b>${s.theme.boss}</b><br>${s.theme.tip}</p>` : ""}<p>6웨이브 · 시작 ${s.startingGold}동전${s.paths.length > 1 ? " · 두 입구 동시 방어" : ""}${unlock ? `<br>클리어 보상: ${TOWERS[unlock[0]].name} 해금` : ""}</p><div class="mode-grid">${Object.entries(
    modeNames,
  )
    .map(
      ([m, name]) =>
        `<button data-mode="${m}" ${canStart(p, id, m) ? "" : "disabled"}><strong>${name}</strong><small>${m === "normal" ? "별을 모아 다음 탄으로" : m === "hard" ? "체력 1.5배 + 추가 호위대" : m === "challenge" ? "최대 6포탑 · 포격 없음" : "끝없이 강화되는 공세"}${p.records[m + ":" + id] ? " · " + "★".repeat(p.records[m + ":" + id].stars) : ""}${m === "endless" && p.endless[id] ? " · 최고 " + p.endless[id] + "파" : ""}</small></button>`,
    )
    .join(
      "",
    )}</div><p class="fine">새 도전은 진행 중인 캠페인 전투를 교체해요. 별·해금 기록은 유지됩니다.</p>`;
}
