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
    bossHP: Math.round(650 * 1.27 ** (w - 1) * (BOSSES[w]?.health || 1)),
    reward: 35 + w * 3,
    label: boss
      ? BOSSES[w]?.name || "월식의 파수꾼"
      : w % 3 === 0
        ? "질주하는 그림자"
        : w % 3 === 1
          ? "숲의 침입자"
          : "갑각 무리",
  };
}
export const tierScale = (t) => 2.55 ** (t - 1);

// Run-only boss blessings. Repeated picks add; they never multiply each other.
export const BOONS = {
  venom: {
    name: "깊은 가시",
    art: "thorn",
    desc: "가시의 독 피해 +10% · 지속시간 +1초",
    detail:
      "독 피해 13 → 14.3/초, 지속 4 → 5초 (첫 선택·1성 기준). 같은 독은 가장 강한 피해로 갱신됩니다.",
    poisonBonus: 0.1,
    duration: 1,
  },
  hunt: {
    name: "서리 추격",
    art: "frost",
    desc: "둔화 중인 적에게 궁수 피해 +25%",
    detail:
      "서리가 먼저 적을 늦춰야 발동합니다. 갑각·보스의 궁수 피해 감소는 그대로 적용됩니다.",
    damageBonus: 0.25,
  },
  supply: {
    name: "달빛 보급",
    art: "bell",
    desc: "즉시 달빛 조각 +125 · 성문 +3",
    detail:
      "랜덤 소환 2회와 합성 1회에 쓸 수 있어요. 성문은 최대 20까지 회복합니다. 전장이 가득 찼다면 합성하거나 저축하세요.",
    gold: 125,
    heal: 3,
  },
};
export const boonCount = (s, key) =>
  (s.boons || []).filter((b) => b.key === key).length;

export const EVOLUTIONS = {
  archer: {
    name: "월광 관통궁",
    cost: 200,
    art: "archer-evolved",
    width: 14,
    targets: 3,
    secondary: 0.4,
    desc: "직선상 최대 3명 관통 · 첫 적 100%, 추가 적 40% 피해",
    detail:
      "여러 적이 일렬로 겹치는 방향을 우선 조준합니다. 기본 공격력·속도·사거리는 그대로이며 갑각 저항과 서리 추격은 각 적에게 적용됩니다.",
  },
  ember: {
    name: "잔불 연금술사",
    cost: 200,
    art: "ember-evolved",
    radius: 32,
    duration: 2.4,
    dps: 24,
    desc: "폭발 자리에 2.4초 잔불 · 범위 안의 적에게 초당 24 피해",
    detail:
      "수호자마다 가장 최근 잔불 하나만 유지합니다. 잔불이 겹쳐도 피해는 중첩되지 않습니다. 서리로 적을 붙잡으면 더 오래 태울 수 있어요.",
  },
};
export const unitName = (u) =>
  u.evolved ? EVOLUTIONS[u.kind].name : TYPES[u.kind].name;

export const BOSSES = {
  6: {
    name: "월갑 파수꾼",
    cycle: 8,
    shieldSeconds: 3,
    shieldDamage: 0.55,
    exposedDamage: 1.15,
    health: 0.9,
    advice:
      "8초 주기: 보호막 3초(피해 45% 감소) → 노출 5초(피해 15% 증가). 서리로 오래 붙잡고 가시·지원으로 빈틈을 노리세요.",
  },
  12: {
    name: "안개 소환사",
    firstCall: 8,
    callInterval: 8,
    maxCalls: 2,
    addsPerCall: 2,
    warning: 2,
    addHealth: 0.45,
    addGap: 18,
    health: 0.9,
    advice:
      "등장 8초·16초에 졸개 2마리씩 소환합니다. 2초 전 소환 예고를 보고 잿불·관통궁을 보스 주변 경로에 배치하세요. 소환 졸개는 조각을 주지 않습니다.",
  },
  18: {
    name: "월식 군주",
    rageHealth: 0.5,
    warning: 3,
    rageSpeed: 1.25,
    health: 0.25,
    advice:
      "체력 절반에서 3초 예고 후 이동이 25% 빨라집니다. 예고 중 길 후반에 서리와 공격수를 옮겨 마지막 돌파에 대비하세요.",
  },
};
export function bossStatus(e) {
  if (e.pattern === 6)
    return (e.age || 0) % BOSSES[6].cycle < BOSSES[6].shieldSeconds
      ? "보호막 · 피해 감소"
      : "노출 · 공격 기회";
  if (e.pattern === 12)
    return e.calls < BOSSES[12].maxCalls &&
      e.age >=
        BOSSES[12].firstCall -
          BOSSES[12].warning +
          e.calls * BOSSES[12].callInterval
      ? "졸개 소환 임박"
      : "안개 소환사";
  if (e.pattern === 18)
    return e.rageAt != null
      ? e.age < e.rageAt
        ? "가속 예고 · 후반 방어"
        : "격노 · 이동 가속"
      : "월식 군주";
  return "";
}
