export const KEY = "firemate_frontier_v1",
  STEP = 1 / 30,
  W = 640,
  H = 400;
export const PATH = [
  [-25, 70],
  [515, 70],
  [550, 105],
  [550, 170],
  [515, 205],
  [130, 205],
  [95, 240],
  [95, 300],
  [130, 335],
  [665, 335],
];
export const SEG = PATH.slice(1).map((p, i) =>
  Math.hypot(p[0] - PATH[i][0], p[1] - PATH[i][1]),
);
export const LENGTH = SEG.reduce((a, b) => a + b, 0);
export function at(d) {
  for (let i = 0; i < SEG.length; i++) {
    if (d <= SEG[i]) {
      let q = d / SEG[i];
      return {
        x: PATH[i][0] + q * (PATH[i + 1][0] - PATH[i][0]),
        y: PATH[i][1] + q * (PATH[i + 1][1] - PATH[i][1]),
      };
    }
    d -= SEG[i];
  }
  return { x: 665, y: 335 };
}
export function roadDistance(x, y) {
  let m = Infinity;
  for (let i = 1; i < PATH.length; i++) {
    let [a, b] = PATH[i - 1],
      [c, d] = PATH[i],
      t = Math.max(
        0,
        Math.min(
          1,
          ((x - a) * (c - a) + (y - b) * (d - b)) /
            ((c - a) ** 2 + (d - b) ** 2),
        ),
      );
    m = Math.min(m, Math.hypot(x - a - t * (c - a), y - b - t * (d - b)));
  }
  return m;
}
export const TOWERS = {
  dart: {
    name: "속사포",
    role: "빠른 단일 공격",
    hint: "선두 적을 빠르게 정리",
    cost: 110,
    damage: 12,
    rate: 0.34,
    range: 125,
    color: "#eab83e",
    branches: [
      {
        name: "기관포",
        costs: [110, 230, 760],
        descs: [
          "공격 속도 +40%",
          "쌍열포 · 피해 +70%",
          "폭풍 기관포 · 공격 속도 2배",
        ],
      },
      {
        name: "저격포",
        costs: [130, 250, 800],
        descs: [
          "사거리 +45 · 피해 2배",
          "갑옷 관통 · 피해 2배",
          "대형 적 추가 피해 2배",
        ],
      },
    ],
  },
  bomb: {
    name: "폭탄포",
    role: "몰려오는 무리 폭발",
    hint: "밀집한 무리를 한 번에",
    cost: 160,
    damage: 30,
    rate: 1.4,
    range: 112,
    color: "#e97443",
    branches: [
      {
        name: "대형 폭탄",
        costs: [140, 260, 850],
        descs: [
          "폭발 범위 +45%",
          "피해 2배 · 방어구 파괴",
          "대폭발 · 피해 +80%",
        ],
      },
      {
        name: "화염탄",
        costs: [130, 240, 800],
        descs: [
          "폭발 자리에 3초 불길",
          "불길 피해 2배",
          "넓은 화염지대 · 5초 지속",
        ],
      },
    ],
  },
  ice: {
    name: "냉각탑",
    role: "무리 감속",
    hint: "적을 느리게 해 공격 시간 확보",
    cost: 125,
    damage: 3,
    rate: 1.1,
    range: 100,
    color: "#65dce7",
    branches: [
      {
        name: "빙하",
        costs: [100, 220, 650],
        descs: [
          "감속 35% → 55%",
          "사거리 +25 · 최대 8명",
          "감속 70% · 지속 4초",
        ],
      },
      {
        name: "서리탄",
        costs: [110, 230, 700],
        descs: [
          "빙결 적에게 추가 피해 6",
          "공격 속도 2배 · 피해 2배",
          "얼음 파편 최대 10명 타격",
        ],
      },
    ],
  },
  arc: {
    name: "전기탑",
    role: "갑옷 무시 · 연쇄",
    hint: "단단한 적에서 옆 적으로 번개",
    cost: 190,
    damage: 22,
    rate: 0.85,
    range: 118,
    color: "#bca1ed",
    branches: [
      {
        name: "연쇄 번개",
        costs: [150, 280, 900],
        descs: ["연쇄 3 → 5명", "번개 피해 +80%", "연쇄 9명 · 피해 +50%"],
      },
      {
        name: "집중 전류",
        costs: [140, 270, 900],
        descs: [
          "단일 피해 3배 · 연쇄 제거",
          "피해 2배 · 강한 적 우선",
          "대형 적 추가 피해 2배",
        ],
      },
    ],
  },
};
export const FOES = {
  bud: { name: "새싹", hp: 32, speed: 42, cash: 4, leak: 1 },
  runner: { name: "질주벌레", hp: 46, speed: 76, cash: 5, leak: 1 },
  armor: {
    name: "철갑벌레",
    hp: 125,
    speed: 35,
    cash: 10,
    leak: 2,
    armor: 0.65,
  },
  pod: { name: "씨앗 수송체", hp: 220, speed: 32, cash: 12, leak: 3, split: 4 },
  boss: {
    name: "거목 전차",
    hp: 1700,
    speed: 23,
    cash: 85,
    leak: 20,
    split: 10,
    armor: 0.3,
  },
};
const wave = (name, hint, packs, reward = 90) => ({
  name,
  hint,
  packs,
  reward,
});
export const WAVES = [
  wave(
    "숲길 정찰",
    "속사포를 두 길이 겹치는 굽이에 배치해 보세요.",
    [["bud", 14, 0.8]],
    80,
  ),
  wave(
    "모여드는 새싹",
    "촘촘한 무리. 폭탄포 한 발로 여러 적을 맞히세요.",
    [["bud", 32, 0.28]],
    95,
  ),
  wave(
    "질주 무리",
    "빠른 벌레. 냉각탑 옆에 속사포를 두면 오래 공격해요.",
    [["runner", 24, 0.55]],
    110,
  ),
  wave(
    "철갑 선발대",
    "철갑은 일반 피해 65% 감소. 전기탑은 갑옷을 무시해요.",
    [
      ["armor", 10, 0.9],
      ["bud", 24, 0.25],
    ],
    125,
  ),
  wave(
    "씨앗 수송체",
    "수송체를 깨면 새싹 4마리가 나와요. 뒤쪽 광역도 준비하세요.",
    [
      ["pod", 9, 1.1],
      ["runner", 20, 0.4],
    ],
    140,
  ),
  wave(
    "첫 거목 전차",
    "전차를 깨도 끝이 아니에요. 작은 적이 쏟아집니다.",
    [
      ["boss", 1, 1],
      ["armor", 10, 0.8],
      ["runner", 22, 0.35],
    ],
    160,
  ),
  wave(
    "세 갈래 습격",
    "속사·광역·감속을 묶고, 핵심 포탑을 2단계로 키우세요.",
    [
      ["runner", 35, 0.28],
      ["pod", 14, 0.6],
      ["armor", 14, 0.6],
    ],
    170,
  ),
  wave(
    "철갑 행렬",
    "갑옷을 깨는 대형 폭탄 또는 전류 집중으로 대응하세요.",
    [
      ["armor", 30, 0.35],
      ["pod", 14, 0.6],
    ],
    180,
  ),
  wave(
    "쏟아지는 씨앗",
    "폭탄과 연쇄 번개가 활약해요. 긴급 포격도 아끼지 마세요.",
    [
      ["pod", 30, 0.4],
      ["runner", 35, 0.22],
    ],
    200,
  ),
  wave(
    "쌍둥이 전차",
    "강한 적 우선 타깃과 3단계 강화로 전차를 집중 공격하세요.",
    [
      ["boss", 2, 6],
      ["armor", 30, 0.4],
      ["pod", 20, 0.4],
    ],
    220,
  ),
  wave(
    "마지막 폭주",
    "빠른 적이 전차 뒤로 숨어요. 선두 공격 담당을 남겨 두세요.",
    [
      ["runner", 65, 0.18],
      ["armor", 32, 0.3],
      ["pod", 25, 0.35],
    ],
    240,
  ),
  wave(
    "숲의 심장",
    "전차 3대와 호위대. 포격 위치를 고르고 마지막 방어선을 지키세요.",
    [
      ["boss", 3, 5],
      ["pod", 30, 0.3],
      ["armor", 35, 0.25],
      ["runner", 35, 0.2],
    ],
    0,
  ),
];
export function stats(t) {
  let a = {
    ...TOWERS[t.kind],
    splash: 38,
    slow: 0.35,
    targets: t.kind === "arc" ? 3 : t.kind === "ice" ? 5 : 1,
    burn: 0,
    ignore: t.kind === "arc",
    big: 1,
  };
  let n = t.level,
    b = t.branch;
  if (t.kind === "dart" && n) {
    if (b === 0) {
      a.rate /= n >= 3 ? 2.8 : 1.4;
      if (n >= 2) a.damage *= 1.7;
    } else {
      a.range += 45;
      a.damage *= n >= 2 ? 4 : 2;
      a.rate *= 1.4;
      a.ignore = n >= 2;
      if (n >= 3) a.big = 2;
    }
  }
  if (t.kind === "bomb" && n) {
    if (b === 0) {
      a.splash = 55;
      if (n >= 2) {
        a.damage *= 2;
        a.breakArmor = true;
      }
      if (n >= 3) {
        a.splash = 75;
        a.damage *= 1.8;
      }
    } else {
      a.burn = n >= 2 ? 24 : 12;
      if (n >= 3) {
        a.splash = 58;
        a.burn = 35;
      }
      a.duration = n >= 3 ? 5 : 3;
    }
  }
  if (t.kind === "ice" && n) {
    if (b === 0) {
      a.slow = n >= 3 ? 0.7 : 0.55;
      if (n >= 2) {
        a.range += 25;
        a.targets = 8;
      }
    } else {
      a.damage = n >= 2 ? 18 : 9;
      if (n >= 2) a.rate /= 2;
      if (n >= 3) a.targets = 10;
    }
  }
  if (t.kind === "arc" && n) {
    if (b === 0) {
      a.targets = n >= 3 ? 9 : 5;
      if (n >= 2) a.damage *= 1.8;
      if (n >= 3) a.damage *= 1.5;
    } else {
      a.targets = 1;
      a.damage *= n >= 2 ? 6 : 3;
      if (n >= 3) a.big = 2;
    }
  }
  return a;
}
