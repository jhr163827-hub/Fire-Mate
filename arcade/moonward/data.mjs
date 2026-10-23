export const VERSION = 1,
  SAVE_KEY = "firemate_moonward_v1";
export const RULES = {
  step: 1 / 30,
  waves: 18,
  startGold: 180,
  lives: 20,
  summon: 50,
  choice: 85,
  mergeCost: 15,
  intermission: 7,
  minWaveTime: 27,
};
export const TYPES = {
  archer: {
    name: "달빛 궁수",
    role: "단일 · 선두 집중",
    color: "#eed195",
    damage: 23,
    interval: 0.72,
    range: 123,
    desc: "선두를 조준합니다. 갑각·보스에게는 피해가 40% 감소합니다.",
  },
  ember: {
    name: "잿불 연금술사",
    role: "광역 · 밀집 처치",
    color: "#ff956c",
    damage: 25,
    interval: 1.55,
    range: 112,
    splash: 45,
    desc: "화염탄이 주변 적에게도 같은 피해를 줍니다.",
  },
  frost: {
    name: "서리 마녀",
    role: "둔화 · 시간 확보",
    color: "#8ce7f2",
    damage: 9,
    interval: 1.1,
    range: 114,
    slow: 0.48,
    desc: "3초 동안 이동을 48% 늦춥니다. 보스에게는 절반 효과.",
  },
  thorn: {
    name: "가시 사냥꾼",
    role: "맹독 · 강적 추적",
    color: "#b4e584",
    damage: 7,
    interval: 0.9,
    range: 119,
    poison: 13,
    desc: "중독되지 않은 적 우선. 4초간 매초 독 피해. 같은 독은 갱신됩니다.",
  },
  bell: {
    name: "별종 수호승",
    role: "지원 · 공격 가속",
    color: "#d0b8ff",
    damage: 10,
    interval: 1.25,
    range: 115,
    aura: 107,
    desc: "주변 수호자의 공격을 25% 빠르게 합니다. 가속은 중첩되지 않습니다.",
  },
};
export const KEYS = Object.keys(TYPES);
export const PATH = [
  [-20, 72],
  [300, 72],
  [300, 174],
  [60, 174],
  [60, 290],
  [300, 290],
  [300, 398],
  [178, 398],
  [178, 468],
];
export const PADS = [
  [48, 120],
  [118, 120],
  [188, 120],
  [246, 120],
  [112, 226],
  [180, 226],
  [248, 226],
  [112, 342],
  [180, 342],
  [246, 342],
  [48, 342],
  [48, 226],
  [48, 30],
  [148, 30],
  [248, 30],
];
export const segments = PATH.slice(1).map((p, i) =>
  Math.hypot(p[0] - PATH[i][0], p[1] - PATH[i][1]),
);
export const LENGTH = segments.reduce((a, b) => a + b, 0);
export function pointAt(d) {
  for (let i = 0; i < segments.length; i++) {
    if (d <= segments[i]) {
      let t = Math.max(0, d) / segments[i];
      return {
        x: PATH[i][0] + (PATH[i + 1][0] - PATH[i][0]) * t,
        y: PATH[i][1] + (PATH[i + 1][1] - PATH[i][1]) * t,
      };
    }
    d -= segments[i];
  }
  return { x: 178, y: 468 };
}
export function waveSpec(w) {
  let boss = w % 6 === 0;
  return {
    count: 12 + w,
    hp: Math.round(48 * 1.27 ** (w - 1)),
    speed: 33 + w * 0.62,
    spacing: Math.max(0.55, 1.1 - w * 0.02),
    boss,
    bossHP: Math.round(650 * 1.27 ** (w - 1)),
    reward: 35 + w * 3,
    label: boss
      ? "월식의 파수꾼"
      : w % 3 === 0
        ? "질주하는 그림자"
        : w % 3 === 1
          ? "숲의 침입자"
          : "갑각 무리",
  };
}
export const tierScale = (t) => 2.55 ** (t - 1);
