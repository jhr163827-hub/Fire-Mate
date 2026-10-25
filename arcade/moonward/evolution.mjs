import { EVOLUTIONS, PADS, TYPES, pointAt } from "./data.mjs";
// All collision coordinates are world coordinates; the visual beam uses these same endpoints.
export function piercingLine(unit, enemies) {
  const [x, y] = PADS[unit.pad],
    range = TYPES.archer.range,
    rule = EVOLUTIONS.archer;
  let best = null;
  for (const aim of enemies) {
    const p = pointAt(aim.d),
      length = Math.hypot(p.x - x, p.y - y);
    if (!length || length > range || aim.hp <= 0) continue;
    const dx = (p.x - x) / length,
      dy = (p.y - y) / length;
    const hits = enemies
      .filter((e) => {
        const q = pointAt(e.d),
          vx = q.x - x,
          vy = q.y - y;
        const along = vx * dx + vy * dy,
          across = Math.abs(vx * dy - vy * dx);
        return (
          e.hp > 0 &&
          Math.hypot(vx, vy) <= range &&
          along >= 0 &&
          across <= rule.width
        );
      })
      .sort((a, b) => {
        const pa = pointAt(a.d),
          pb = pointAt(b.d);
        return (pa.x - pb.x) * dx + (pa.y - pb.y) * dy || a.id - b.id;
      })
      .slice(0, rule.targets);
    if (
      !best ||
      hits.length > best.hits.length ||
      (hits.length === best.hits.length && aim.d > best.lead)
    )
      best = { hits, lead: aim.d, tx: x + dx * range, ty: y + dy * range };
  }
  return best;
}
