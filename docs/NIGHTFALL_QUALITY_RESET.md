# NIGHTFALL QUALITY RESET — 2026-10-20

## Scope and current findings
- Browser game currently lives primarily in `arcade/nightfall.html` (single large, minified-line HTML/Canvas script); regression suite in `arcade/nightfall.spec.cjs`.
- Existing content: five playable characters, twelve weapons, three stages, ten/twenty-minute sessions, three difficulties, permanent upgrades and weapon mastery.
- Core gameplay is implemented, but enjoyment, weapon differentiation, and actual-device frame pacing have **not** been measured. Passing CI does not prove these.
- The level-up pool combines 12 weapon choices, evolution, and generic stat upgrades. It shuffles candidates and displays at most three. Evaluate whether this gives useful decisions at each phase.
- Canvas drawing and simulation remain coupled in the same document; do not perform a risky wholesale engine migration before a small proof of concept.

## Priority 0 — finish current phase safely
1. PR #41: wait for NIGHTFALL isolated, FIRE MATE quality and PWA regression checks; fix failures before merge.
2. Verify GitHub Pages deployment points at the merged main revision; installed PWA/mobile cache remains a separate manual check.
3. Do not change the existing `nightfall_progress_v1` and `nightfall_best_v1` storage keys.

## Priority 1 — combat quality (no new weapons)
1. Test first 60 seconds, 3-minute progression, mid-boss, and 10-minute win/lose loop.
2. Record per-weapon damage, kills, pick rate, evolution timing and survival time **in opt-in local test instrumentation**, not by sending user data.
3. Tune enemy telegraphs, attack readability, meaningful level-up choices, and difficulty curves based on observed metrics.
4. Validate reward and XP balance to avoid permanent upgrades trivializing early stages.

## Priority 2 — coherent art and audio vertical slice
- Create one polished playable slice: mage, three enemy types, three weapons, forest stage, mid-boss.
- Define common sprite dimensions, palette, silhouette readability and attack/pain/death frames.
- Keep effects bounded and support reduced-motion options before broad rollout.
- Expand to the remaining roster only after visual quality and gameplay are approved.

## Priority 3 — maintainability and mobile
- Extract asset loading, renderer, gameplay systems and UI into separate modules incrementally; preserve the PWA entrypoint and relative paths.
- Test 320/360/375/390/430px; stress 50/100/160 enemies; measure FPS/frame time, memory and long-session behavior on real devices.
- Ensure no changes to finance, restaurant, sudoku or other arcade games.

## Release gates
- NIGHTFALL isolated Playwright + finance quality + PWA regression green.
- Existing save migration/backward compatibility and reset isolation verified.
- Desktop/mobile browser smoke test with no uncaught errors.
- Pages deployment and cache/version behavior checked.
- Actual Android installed-PWA performance must be explicitly marked **unverified** until measured.
