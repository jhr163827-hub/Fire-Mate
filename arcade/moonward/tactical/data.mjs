export const SAVE_KEY = "firemate_moonward_tactics_v1";
export const STEP = 1 / 30;
export const PATH = [
  [-15, 65],
  [400, 65],
  [400, 165],
  [60, 165],
  [60, 260],
  [475, 260],
];
export const PADS = [
  [110, 112],
  [215, 112],
  [330, 112],
  [345, 215],
  [235, 215],
  [130, 215],
  [36, 112],
  [424, 215],
];
export const TYPES = {
  archer: {
    name: "달빛 궁수",
    role: "집중",
    verb: "한 적을 빠르게 처치",
    color: "#f5d394",
    cost: 90,
    damage: 22,
    interval: 0.65,
    range: 98,
    upgrades: {
      rapid: { name: "속사", desc: "공격 간격 0.65 → 0.32초", cost: 110 },
      pierce: {
        name: "관통",
        desc: "직선상 최대 3명 · 피해 30 / 0.9초",
        cost: 110,
      },
    },
  },
  ember: {
    name: "잿불 연금술사",
    role: "광역",
    verb: "모인 적을 함께 폭파",
    color: "#ff9966",
    cost: 120,
    damage: 28,
    interval: 1.6,
    range: 88,
    radius: 37,
    upgrades: {
      blast: {
        name: "대폭발",
        desc: "폭발 반경 37 → 62 · 피해 28 → 38",
        cost: 130,
      },
      burn: { name: "잔불", desc: "3초간 불길 · 초당 17 추가 피해", cost: 130 },
    },
  },
  frost: {
    name: "서리 마녀",
    role: "둔화",
    verb: "적을 붙잡아 공격 시간 확보",
    color: "#91edff",
    cost: 95,
    damage: 5,
    interval: 0.9,
    range: 92,
    upgrades: {
      spread: {
        name: "서리 확산",
        desc: "한 번에 최대 3명 · 45% 둔화",
        cost: 100,
      },
      deep: { name: "깊은 냉기", desc: "둔화 45% → 70% · 2 → 3초", cost: 100 },
    },
  },
};
export const ENEMIES = {
  wisp: { name: "정령", hp: 85, speed: 45, reward: 5, armor: 1 },
  wolf: { name: "늑대", hp: 115, speed: 76, reward: 6, armor: 1 },
  beetle: { name: "갑각충", hp: 310, speed: 36, reward: 8, armor: 0.5 },
  boss: { name: "숲의 파수꾼", hp: 1900, speed: 27, reward: 50, armor: 0.75 },
};
export const WAVES = [
  {
    name: "첫 길목",
    tip: "궁수 + 광역을 배치해 보세요. 제단을 누르면 사거리가 보여요.",
    pack: [["wisp", 12, 1]],
    reward: 85,
  },
  {
    name: "밀려오는 무리",
    tip: "정령 24명이 붙어서 와요. 폭발로 여러 적을 함께 맞히세요.",
    pack: [["wisp", 24, 0.34]],
    reward: 100,
  },
  {
    name: "질주",
    tip: "빠른 늑대 18마리. 둔화 길목 뒤에 광역을 배치해 보세요.",
    pack: [["wolf", 18, 0.7]],
    reward: 115,
  },
  {
    name: "단단한 껍질",
    tip: "갑각충은 화살 피해 50% 저항. 폭발·잔불은 저항을 무시해요.",
    pack: [
      ["beetle", 9, 1.1],
      ["wolf", 12, 0.45],
    ],
    reward: 130,
  },
  {
    name: "마지막 파수꾼",
    tip: "보스가 성문에 닿으면 패배! 속사로 집중 공격하거나 깊은 냉기로 시간을 버세요. 보스 둔화는 절반만 적용돼요.",
    pack: [
      ["boss", 1, 1],
      ["wisp", 28, 0.3],
      ["wolf", 12, 0.65],
    ],
    reward: 0,
  },
];
export const SEGMENTS = PATH.slice(1).map((p, i) =>
  Math.hypot(p[0] - PATH[i][0], p[1] - PATH[i][1]),
);
export const LENGTH = SEGMENTS.reduce((a, b) => a + b, 0);
export function pointAt(d) {
  for (let i = 0; i < SEGMENTS.length; i++) {
    if (d <= SEGMENTS[i]) {
      const k = d / SEGMENTS[i];
      return {
        x: PATH[i][0] + (PATH[i + 1][0] - PATH[i][0]) * k,
        y: PATH[i][1] + (PATH[i + 1][1] - PATH[i][1]) * k,
      };
    }
    d -= SEGMENTS[i];
  }
  return { x: 475, y: 260 };
}
export function stats(u) {
  const s = { ...TYPES[u.kind] };
  if (u.upgrade === "rapid") s.interval = 0.32;
  if (u.upgrade === "pierce") {
    s.damage = 30;
    s.interval = 0.9;
  }
  if (u.upgrade === "blast") {
    s.radius = 62;
    s.damage = 38;
  }
  return s;
}
