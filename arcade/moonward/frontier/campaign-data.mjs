export const PROFILE_KEY = "firemate_frontier_campaign_v1",
  RUN_KEY = "firemate_frontier_campaign_run_v1";
export const UNLOCKS = [
  ["dart", 1],
  ["bomb", 1],
  ["ice", 2],
  ["arc", 4],
  ["pierce", 7],
  ["venom", 11],
  ["beacon", 15],
  ["trap", 19],
];
export const REGIONS = [
  {
    name: "새싹 숲길",
    color: "#8eb575",
    road: "#e7c28a",
    edge: "#52734d",
    boss: "철엽 수문장",
    pattern: "shield",
    tip: "방패가 내려갈 때 집중 공격과 포격을 겹치세요.",
  },
  {
    name: "붉은 협곡",
    color: "#c99d73",
    road: "#f0cf95",
    edge: "#9b6d55",
    boss: "둥지 운반자",
    pattern: "summon",
    tip: "호위대를 방출해요. 보스 뒤에 광역 방어선을 남기세요.",
  },
  {
    name: "서리 고원",
    color: "#b0c9cf",
    road: "#e8e5c6",
    edge: "#6d919e",
    boss: "빙하 공성수",
    pattern: "frost",
    tip: "주변 포탑을 느리게 해요. 긴 사거리 포탑을 분산하세요.",
  },
  {
    name: "안개 습지",
    color: "#819e99",
    road: "#d1c4a0",
    edge: "#4a706a",
    boss: "늪의 재생왕",
    pattern: "heal",
    tip: "주기적으로 회복해요. 중독은 회복량을 70% 줄입니다.",
  },
  {
    name: "황혼 공방",
    color: "#a4a1ad",
    road: "#dfc39b",
    edge: "#686677",
    boss: "황혼의 군주",
    pattern: "final",
    tip: "방패와 소환을 함께 사용해요. 관통·광역·후방 방어를 갖추세요.",
  },
];
const ROUTES = [
  [
    [-25, 75],
    [515, 75],
    [545, 105],
    [545, 190],
    [510, 220],
    [125, 220],
    [95, 250],
    [95, 330],
    [665, 330],
  ],
  [
    [-25, 85],
    [450, 85],
    [490, 125],
    [490, 310],
    [665, 310],
  ],
  [
    [-25, 60],
    [210, 60],
    [210, 180],
    [480, 180],
    [480, 325],
    [665, 325],
  ],
  [
    [-25, 90],
    [540, 90],
    [540, 205],
    [170, 205],
    [170, 325],
    [665, 325],
  ],
  [
    [-25, 70],
    [320, 70],
    [320, 180],
    [110, 180],
    [110, 320],
    [530, 320],
    [530, 245],
    [665, 245],
  ],
  [
    [-25, 70],
    [535, 70],
    [535, 195],
    [105, 195],
    [105, 335],
    [665, 335],
  ],
  [
    [-25, 100],
    [520, 100],
    [520, 290],
    [665, 290],
  ],
  [
    [-25, 55],
    [180, 55],
    [180, 190],
    [490, 190],
    [490, 335],
    [665, 335],
  ],
  [
    [-25, 100],
    [260, 100],
    [260, 290],
    [665, 290],
  ],
  [
    [-25, 70],
    [540, 70],
    [540, 195],
    [120, 195],
    [120, 320],
    [665, 320],
  ],
  [
    [-25, 55],
    [320, 55],
    [320, 180],
    [530, 180],
    [530, 330],
    [665, 330],
  ],
  [
    [-25, 65],
    [510, 65],
    [550, 105],
    [550, 205],
    [150, 205],
    [100, 255],
    [100, 335],
    [665, 335],
  ],
  [
    [-25, 65],
    [510, 65],
    [510, 310],
    [665, 310],
  ],
  [
    [-25, 80],
    [180, 80],
    [180, 290],
    [470, 290],
    [470, 175],
    [665, 175],
  ],
  [
    [-25, 80],
    [530, 80],
    [530, 200],
    [100, 200],
    [100, 330],
    [665, 330],
  ],
  [
    [-25, 65],
    [260, 65],
    [260, 200],
    [540, 200],
    [540, 335],
    [665, 335],
  ],
  [
    [-25, 75],
    [520, 75],
    [520, 190],
    [270, 190],
    [270, 320],
    [665, 320],
  ],
  [
    [-25, 60],
    [530, 60],
    [530, 185],
    [110, 185],
    [110, 335],
    [665, 335],
  ],
  [
    [-25, 100],
    [200, 100],
    [200, 260],
    [470, 260],
    [470, 120],
    [665, 120],
  ],
  [
    [-25, 70],
    [540, 70],
    [540, 195],
    [120, 195],
    [120, 330],
    [665, 330],
  ],
  [
    [-25, 65],
    [280, 65],
    [280, 185],
    [500, 185],
    [500, 325],
    [665, 325],
  ],
  [
    [-25, 90],
    [490, 90],
    [490, 285],
    [665, 285],
  ],
  [
    [-25, 50],
    [180, 50],
    [180, 190],
    [520, 190],
    [520, 335],
    [665, 335],
  ],
  [
    [-25, 70],
    [540, 70],
    [540, 190],
    [105, 190],
    [105, 330],
    [665, 330],
  ],
  [
    [-25, 65],
    [500, 65],
    [500, 300],
    [665, 300],
  ],
  [
    [-25, 80],
    [260, 80],
    [260, 210],
    [100, 210],
    [100, 330],
    [665, 330],
  ],
  [
    [-25, 60],
    [535, 60],
    [535, 185],
    [250, 185],
    [250, 325],
    [665, 325],
  ],
  [
    [-25, 100],
    [170, 100],
    [170, 300],
    [480, 300],
    [480, 190],
    [665, 190],
  ],
  [
    [-25, 65],
    [290, 65],
    [290, 180],
    [530, 180],
    [530, 330],
    [665, 330],
  ],
  [
    [-25, 55],
    [540, 55],
    [540, 190],
    [100, 190],
    [100, 340],
    [665, 340],
  ],
];
const NAMES = [
  "첫 방어선",
  "긴 산책길",
  "세 번의 굽이",
  "철갑 정찰",
  "엇갈린 숲길",
  "철엽의 관문",
  "바람의 직선",
  "협곡 계단",
  "두 입구",
  "절벽 회랑",
  "독초 운송로",
  "붉은 둥지",
  "얼음 대로",
  "뒤집힌 굽이",
  "고원 초소",
  "서리 갈림길",
  "좁은 빙벽",
  "빙하 공성전",
  "늪의 역류",
  "연못 사이",
  "안개 합류",
  "물안개 직선",
  "독과 철갑",
  "재생의 늪",
  "황동 대로",
  "공방 우회로",
  "두 개의 행렬",
  "마지막 굽이",
  "불꽃 운송로",
  "황혼의 심장",
];
const LESSONS = [
  "굽이에서 두 길을 함께 공격하세요.",
  "긴 직선에서는 사거리와 출구 쪽 배치를 살펴보세요.",
  "출구에도 잔여 적을 잡을 방어선을 남기세요.",
  "철갑은 번개·독·관통 강화로 대응하세요.",
  "빠른 적과 수송체가 섞여요. 타깃을 나누세요.",
  "보스의 예고를 읽고 포격 타이밍을 고르세요.",
];
const cache = new Map();
export function stageFor(id, mode = "normal") {
  if (
    !Number.isInteger(id) ||
    id < 1 ||
    id > 30 ||
    !["normal", "hard", "challenge", "endless"].includes(mode)
  )
    throw Error("invalid stage");
  const key = id + ":" + mode;
  if (cache.has(key)) return cache.get(key);
  const region = Math.floor((id - 1) / 6),
    chapter = (id - 1) % 6,
    theme = REGIONS[region],
    paths = [ROUTES[id - 1]];
  if ([9, 16, 21, 27, 30].includes(id)) {
    let end = paths[0].at(-1);
    paths.push([[-25, 355], [370, 355], [370, end[1]], end]);
  }
  const blocks = region
    ? [
        {
          x: region === 2 ? 340 : 340 + (chapter % 2) * 30,
          y: chapter % 2 ? 110 : 240,
          w: 70,
          h: 38,
          kind: region === 3 ? "water" : region === 2 ? "ice" : "rock",
        },
      ]
    : [];
  const roster =
    id <= 2
      ? ["bud", "runner"]
      : id <= 4
        ? ["bud", "runner", "armor"]
        : id <= 7
          ? ["runner", "armor", "pod"]
          : id <= 12
            ? ["armor", "runner", "pod", "shell"]
            : id <= 18
              ? ["runner", "shell", "pod", "regenerator"]
              : ["shell", "runner", "regenerator", "pod", "armor"];
  const waves = [];
  for (let w = 0; w < 6; w++) {
    const primary =
        w < 2
          ? w === 0
            ? "bud"
            : "runner"
          : roster[(w + chapter) % roster.length],
      secondary = roster[(w + chapter + 1) % roster.length],
      heavy = (k) => ["pod", "shell", "armor", "regenerator"].includes(k);
    let packs = [
      [
        primary,
        (heavy(primary) ? 5 : 14) + region * 2 + w * 2,
        primary === "runner"
          ? 0.45
          : chapter === 1
            ? 0.52
            : chapter === 4
              ? 0.27
              : 0.4,
      ],
    ];
    if (w === 1 && id >= 3)
      packs.push([roster.find(heavy) || "bud", 3 + region, 0.9]);
    if (w >= 2)
      packs.push([secondary, (heavy(secondary) ? 3 : 8) + region + w, 0.6]);
    if (w >= 4 && id >= 5) packs.push(["pod", 2 + Math.floor(region / 2), 1.1]);
    if (chapter === 5 && w === 5)
      packs = [["boss", 1, 1], ...packs, ["runner", 8 + region * 2, 0.35]];
    if (mode === "hard")
      packs.push([w % 2 ? "runner" : "armor", 6 + region, 0.35]);
    waves.push({
      name:
        chapter === 5 && w === 5
          ? theme.boss
          : ["정찰", "선발대", "돌격", "포위", "총공세", "마지막 방어"][w],
      hint: chapter === 5 && w === 5 ? theme.tip : LESSONS[chapter],
      packs,
      reward: w === 5 ? 0 : 105 + region * 18 + w * 10,
    });
  }
  const s = {
    id,
    mode,
    region,
    chapter,
    name: NAMES[id - 1],
    theme,
    paths,
    blocks,
    waves,
    boss: chapter === 5 ? theme : null,
    startingGold: 400 + region * 130,
    hpScale:
      (0.8 + region * 0.12 + chapter * 0.02) * (mode === "hard" ? 1.5 : 1),
    maxTowers: mode === "challenge" ? 6 : 24,
    spell: mode !== "challenge",
    description: LESSONS[chapter],
  };
  cache.set(key, s);
  return s;
}
export function endlessWave(i) {
  const n = i + 1;
  return {
    name: `무한 ${n}`,
    hint: "강해지는 공세에 맞춰 배치와 강화를 완성하세요.",
    packs: [
      ["runner", Math.min(40, 12 + n), 0.4],
      ["armor", Math.min(35, 6 + n), 0.7],
      ...(n >= 3 ? [["pod", Math.min(20, 3 + Math.floor(n / 2)), 0.8]] : []),
      ...(n % 5 === 0
        ? [["boss", Math.min(3, 1 + Math.floor(n / 15)), 3]]
        : []),
    ],
    reward: 120 + Math.min(200, n * 10),
  };
}
export const pathLength = (p) =>
  p
    .slice(1)
    .reduce((sum, b, i) => sum + Math.hypot(b[0] - p[i][0], b[1] - p[i][1]), 0);
export function onPath(d, p) {
  for (let i = 1; i < p.length; i++) {
    let a = p[i - 1],
      b = p[i],
      len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d <= len)
      return {
        x: a[0] + ((b[0] - a[0]) * d) / len,
        y: a[1] + ((b[1] - a[1]) * d) / len,
      };
    d -= len;
  }
  return { x: p.at(-1)[0], y: p.at(-1)[1] };
}
export function nearPath(x, y, p) {
  return Math.min(
    ...p.slice(1).map(([c, d], i) => {
      const [a, b] = p[i],
        len = (c - a) ** 2 + (d - b) ** 2,
        t = len
          ? Math.max(
              0,
              Math.min(1, ((x - a) * (c - a) + (y - b) * (d - b)) / len),
            )
          : 0;
      return Math.hypot(x - a - t * (c - a), y - b - t * (d - b));
    }),
  );
}
