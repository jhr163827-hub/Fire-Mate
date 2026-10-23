import { PADS, TYPES, waveSpec, RULES } from "./data.mjs";

export function supported(units, unit) {
  return units.some(
    (v) =>
      v.id !== unit.id &&
      v.kind === "bell" &&
      Math.hypot(
        PADS[v.pad][0] - PADS[unit.pad][0],
        PADS[v.pad][1] - PADS[unit.pad][1],
      ) <= TYPES.bell.aura,
  );
}

export function forecast(wave) {
  const w = waveSpec(wave);
  const fast = wave % 3 === 0 ? Math.ceil((w.count - (w.boss ? 1 : 0)) / 3) : 0;
  const tanks = wave % 3 === 2 ? Math.ceil(w.count / 4) : 0;
  return {
    ...w,
    wave,
    composition:
      `${w.count}마리 · ` +
      (w.boss
        ? `보스 1 · 질주 ${fast}`
        : fast
          ? `질주 ${fast}`
          : tanks
            ? `갑각 ${tanks}`
            : "일반 침입자"),
    advice: w.boss
      ? "보스는 성문 피해 5. 가시의 독과 별종의 가속으로 오래 공격하세요. 궁수 피해는 40% 감소합니다."
      : fast
        ? "질주 적은 1.5배 빠릅니다. 서리로 늦추고 길 후반에도 공격할 수 있게 배치하세요."
        : tanks
          ? "갑각은 체력 1.7배, 궁수 피해 40% 감소. 가시의 독이나 잿불로 보완하세요."
          : "일반 적이 이어서 들어옵니다. 궁수로 선두를, 잿불로 모인 적을 공격하세요.",
  };
}

export function coaching(s) {
  if (s.phase === "ready")
    return !s.units.length
      ? "① 빛나는 제단에 첫 궁수를 소환하세요 · 랜덤 소환 50"
      : s.units.length < 3
        ? `② ${s.units.length}/3명 준비 · 더 소환하거나 첫 웨이브를 시작하세요`
        : "③ 준비 완료 · 첫 웨이브 시작! 전투 중에도 소환·배치할 수 있어요";
  if (s.phase === "rest") {
    const pair = s.units.some(
      (u) =>
        u.tier < 3 &&
        s.units.some(
          (v) => v.id !== u.id && v.kind === u.kind && v.tier === u.tier,
        ),
    );
    return (
      `${Math.ceil(s.wait)}초 후 출발 · ` +
      (pair && s.gold >= RULES.mergeCost
        ? "합성 가능한 수호자가 있어요 · 정비를 누르면 시간 정지"
        : s.gold >= RULES.choice
          ? "85 조각으로 부족한 역할을 지정 소환하세요"
          : s.gold >= RULES.summon
            ? "50 조각으로 병력 보충 또는 지정 소환을 위해 저축"
            : `지정 소환까지 ${RULES.choice - s.gold} 조각 · 배치 변경은 무료`)
    );
  }
  return "";
}

// Evidence is additive and optional: old saves keep their progress without inventing records.
export function debrief(s) {
  const evidence = s.stats.breaches;
  if (!evidence || !Object.values(evidence).some((v) => v.count > 0))
    return {
      fact: s.leaks
        ? "이전 저장에는 적 종류별 돌파 기록이 없어요."
        : "기록된 성문 돌파가 없어요.",
      tip: "길의 앞·중간·후반을 함께 공격하도록 배치를 나눠 보세요.",
    };
  const names = {
    boss: "보스",
    wolf: "질주 적",
    beetle: "갑각 적",
    wisp: "일반 적",
  };
  const [kind, record] = Object.entries(evidence).sort(
    (a, b) => b[1].loss - a[1].loss,
  )[0];
  const health = Math.round((record.health / record.count) * 100);
  const fact = `${names[kind]} ${record.count}마리 돌파 · 성문 피해 ${record.loss} · 통과 시 평균 체력 ${health}%`;
  let tip =
    kind === "wolf"
      ? "서리를 길 앞쪽에, 공격수를 후반에도 배치해 질주 적을 더 오래 붙잡아 보세요."
      : kind === "boss" || kind === "beetle"
        ? "갑각·보스는 궁수 피해를 줄입니다. 가시의 독과 별종의 가속을 조합해 보세요."
        : health > 50
          ? "체력이 많이 남은 적이 통과했어요. 빈 제단을 채우고 공격 범위가 길에 겹치게 배치해 보세요."
          : "조금 남은 체력으로 통과했어요. 길 후반 공격수를 보강하거나 서리로 마무리할 시간을 벌어 보세요.";
  if (s.gold >= RULES.choice)
    tip += ` 남은 ${s.gold} 조각은 지정 소환에 쓸 수 있었어요.`;
  return { fact, tip };
}
