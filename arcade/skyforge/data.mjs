export const W = 360,
  H = 600,
  STEP = 1 / 60,
  PROFILE_KEY = "firemate_skyforge_profile_v1",
  RUN_KEY = "firemate_skyforge_run_v1";
export const SHIPS = [
  {
    id: "swift",
    name: "제비",
    role: "균형형 · 빠른 기관포",
    unlock: 1,
    hp: 100,
    rate: 0.18,
    power: 1,
    color: "#edc566",
  },
  {
    id: "manta",
    name: "가오리",
    role: "확산형 · 시작부터 양갈래",
    unlock: 5,
    hp: 90,
    rate: 0.24,
    power: 0.85,
    color: "#82d6d6",
  },
  {
    id: "bastion",
    name: "방주",
    role: "중장갑 · 강한 단발과 넓은 수집",
    unlock: 9,
    hp: 135,
    rate: 0.26,
    power: 1.6,
    color: "#c6a5ec",
  },
];
export const SKILLS = {
  volley: {
    name: "다중 포신",
    role: "정면 화력",
    color: "#f6ce76",
    desc: [
      "보조 탄환 2발 추가",
      "탄환 피해 +25%",
      "진화 · 5갈래 탄막",
      "발사 간격 -15%",
      "탄환 피해 +35%",
      "완성 · 7갈래 집중포화",
    ],
  },
  laser: {
    name: "레일 광선",
    role: "일직선 관통",
    color: "#86edf0",
    desc: [
      "3초마다 관통 광선",
      "광선 피해 +50%",
      "진화 · 평행 광선 3줄",
      "발사 간격 -25%",
      "광선 피해 +60%",
      "완성 · 넓은 광선 5줄",
    ],
  },
  missile: {
    name: "추적 로켓",
    role: "강한 적 추적·폭발",
    color: "#f59f76",
    desc: [
      "2초마다 유도 로켓",
      "로켓 2발 발사",
      "진화 · 반경 55 폭발",
      "로켓 3발 발사",
      "폭발 피해 +60%",
      "완성 · 로켓 5발 일제사격",
    ],
  },
  drone: {
    name: "호위 편대",
    role: "가까운 적 자동 조준",
    color: "#b2dca4",
    desc: [
      "호위기 1기 지원",
      "호위기 화력 +50%",
      "진화 · 양쪽 호위기 2기",
      "발사 간격 -25%",
      "호위기 화력 +50%",
      "완성 · 십자 편대 4기",
    ],
  },
  orbit: {
    name: "회전 톱날",
    role: "근접 방어",
    color: "#e6c9ff",
    desc: [
      "기체 주위 톱날 2개",
      "회전 피해 +50%",
      "진화 · 톱날 4개",
      "회전 반경 +20",
      "회전 피해 +60%",
      "완성 · 톱날 6개·탄환 차단",
    ],
  },
  arc: {
    name: "연쇄 전류",
    role: "여러 적 연결 타격",
    color: "#b4acff",
    desc: [
      "주변 3명에게 전류",
      "전류 피해 +50%",
      "진화 · 최대 6명 연쇄",
      "발동 간격 -25%",
      "전류 피해 +60%",
      "완성 · 최대 10명·보스 추가 피해",
    ],
  },
  frost: {
    name: "서리 파동",
    role: "적·탄막 감속",
    color: "#b4e6ff",
    desc: [
      "주변에 감속 파동",
      "파동 범위 +30",
      "진화 · 주변 탄막도 감속",
      "파동 간격 -25%",
      "파동 피해 +60%",
      "완성 · 전장 전체 감속 파동",
    ],
  },
  shield: {
    name: "수호 장막",
    role: "피격 방어·재충전",
    color: "#f3e9a4",
    desc: [
      "12초마다 피해 1회 차단",
      "재충전 10초",
      "진화 · 재충전 때 주변 탄환 제거",
      "재충전 8초",
      "회복 보급 효율 +50%",
      "완성 · 방어 2회 충전",
    ],
  },
};
export const FOES = {
  scout: { hp: 18, speed: 48, r: 13, cash: 8, shot: 0 },
  dart: { hp: 24, speed: 80, r: 12, cash: 10, shot: 0 },
  gunner: { hp: 46, speed: 28, r: 17, cash: 18, shot: 2.7 },
  carrier: { hp: 105, speed: 18, r: 24, cash: 32, shot: 2 },
  boss: { hp: 1600, speed: 0, r: 42, cash: 200, shot: 1.8 },
};
export const REGIONS = [
  {
    name: "구름 항로",
    sky: "#102c48",
    haze: "#377386",
    land: "#486d73",
    accent: "#f2d7a0",
  },
  {
    name: "붉은 협곡",
    sky: "#422c43",
    haze: "#9c6861",
    land: "#805456",
    accent: "#efb97d",
  },
  {
    name: "극광 해역",
    sky: "#15294a",
    haze: "#485e95",
    land: "#395b79",
    accent: "#afd4e9",
  },
];
const NAMES = [
  "첫 출격",
  "회피 항로",
  "호위대 습격",
  "구름의 관문",
  "협곡 진입",
  "붉은 편대",
  "교차 사격",
  "철벽 요새",
  "극광 항로",
  "폭풍 회랑",
  "마지막 편대",
  "하늘의 심장",
];
export function stageFor(id, hard = false) {
  if (!Number.isInteger(id) || id < 1 || id > 12) throw Error("invalid stage");
  return {
    id,
    name: NAMES[id - 1],
    region: Math.floor((id - 1) / 4),
    theme: REGIONS[Math.floor((id - 1) / 4)],
    boss: ["폭풍 가오리", "철갑 요새", "회전 감시자"][(id - 1) % 3],
    pattern: (id - 1) % 3,
    duration: 84 + (id % 4) * 6,
    hpScale: (0.9 + (id - 1) * 0.09) * (hard ? 1.3 : 1),
    damageScale: 1 + (id - 1) * 0.025,
    hard,
  };
}
export const MODS = [
  { key: "power", name: "기관포 정비", desc: "기본 탄환 피해 +10% / 단계" },
  { key: "hull", name: "장갑 보강", desc: "최대 체력 +12 / 단계" },
  { key: "magnet", name: "수집 장치", desc: "보급 수집 범위 +15 / 단계" },
];
export const modCost = (level) => [2, 3, 4][level] ?? Infinity;
export function emptyProfile() {
  return { v: 1, records: {}, mods: { power: 0, hull: 0, magnet: 0 } };
}
export function loadProfile(raw) {
  const p = emptyProfile();
  try {
    const s = JSON.parse(raw);
    if (s.v !== 1) return p;
    for (const [k, v] of Object.entries(s.records || {}))
      if (
        /^(normal|hard):([1-9]|1[0-2])$/.test(k) &&
        Number.isInteger(v) &&
        v >= 1 &&
        v <= 3
      )
        p.records[k] = v;
    for (const k of Object.keys(p.mods))
      if (Number.isInteger(s.mods?.[k]) && s.mods[k] >= 0 && s.mods[k] <= 3)
        p.mods[k] = s.mods[k];
  } catch {}
  if (medals(p) < 0) p.mods = {power:0,hull:0,magnet:0};
  return p;
}
export function unlocked(p) {
  let id = 1;
  while (id < 12 && p.records["normal:" + id]) id++;
  return id;
}
export function medals(p) {
  return (
    Object.values(p.records).reduce((a, b) => a + b, 0) -
    Object.values(p.mods).reduce((a, n) => a + [0, 2, 5, 9][n], 0)
  );
}
export function complete(p, s) {
  if (s.phase !== "won") return false;
  const k = (s.hard ? "hard:" : "normal:") + s.stage;
  p.records[k] = Math.max(
    p.records[k] || 0,
    s.hits === 0 ? 3 : s.hp >= s.maxHp * 0.4 ? 2 : 1,
  );
  return true;
}
