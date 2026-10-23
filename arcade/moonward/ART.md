# Art provenance

All shipped game images were generated for this original game with the built-in image generation tool on 2026-10-23. No third-party game characters, sprite packs, music, logos, or game footage were used. No external asset license attribution is required by an imported asset pack because none was imported. This records provenance, not an assertion of exclusive copyright or a legal guarantee about AI outputs.

Generated sources were adapted into local WebP assets; no image generation service is called at runtime. The scene is downsampled to at most 768×1024. Character atlas cells are cropped and normalized onto 208×208 transparent tiles, with the actual illustration up to 192×192. Stray disconnected atlas fragments were removed from the ghost cutout. The boss was separately extracted to eliminate neighboring atlas fragments. Live units display at roughly 40–55 CSS pixels and enemies at 32–60 world pixels.

- `art/forest.webp`: moonlit battlefield backdrop.
- `art/archer.webp`, `ember.webp`, `frost.webp`, `thorn.webp`, `bell.webp`: five guardian types.
- `art/wisp.webp`, `wolf.webp`, `beetle.webp`, `boss.webp`: enemy types.
- Roads, gate, placement runes, particles and projectile trails: original Canvas code in `app.mjs`.
- Sound: original Web Audio oscillator effects. No imported recordings.
- UI fonts: device system fonts. The test environment used a local Noto CJK font for Korean screenshot rendering; no font file is shipped with the game.

## Background generation prompt

Create a production game background asset, stylized-concept, original premium hand-painted 2D fantasy tower-defense. Portrait 3:4 overhead battlefield, moonlit ancient forest ruins, teal moss, deep indigo trees framing all outer edges, small warm amber lanterns, intricate carved stone fragments and subtle luminous flowers. Center 80% is quiet dark mossy clearing with very low contrast suitable for placing gameplay towers and overlaying a winding road programmatically. No characters, no units, NO PATH or road, no UI, no text, no lettering, no watermark. View strictly from above with subtle dimensional painted environment props only at edges, readable miniature game aesthetic, atmospheric painterly illustration, restrained cyan and gold lighting, polished game environment not photo.

## Character atlas generation prompt

Use case stylized-concept. Production SPRITE ATLAS for original 2D fantasy tower defense. Exactly 3 columns and 3 rows in a square image, 9 separate characters evenly centered in nine equal square cells. Transparent background, no floor scene, no typography. Each figure fully contained with generous 15% padding in its own cell, same scale, mostly front facing with slight overhead perspective, visible entire body, no overlap. Highly polished hand-painted game sprites, strong readable silhouettes at 40px, rich painterly shading, dark ink edges, restrained teal shadows and gold highlights, not flat geometric cartoons. ROW 1 LEFT: green hooded moon elf archer holding large curved wooden bow and arrow, leather cloak. ROW 1 CENTER: red-orange cloaked alchemist with goggles and bright flaming round glass potion. ROW 1 RIGHT: icy silver-haired witch in pointed blue hat and blue robe, holding large luminous crystal staff. ROW 2 LEFT: dark forest green masked rogue with twin curved poisoned daggers, thorn shoulder armor. ROW 2 CENTER: violet and cream robed monk with gold bell staff and crescent halo. ROW 2 RIGHT: small purple ghost enemy, ragged floating cloth, pale violet glowing eyes. ROW 3 LEFT: dark blue-gray armored wolf monster with red eyes and fangs, crouched quadruped. ROW 3 CENTER: moss-green armored beetle monster with six legs and gold seams on carapace. ROW 3 RIGHT: imposing armored moon guardian boss, silver horned helmet, broad pauldrons, dark tattered cape, violet glowing chest crystal. All original designs. Consistent lighting and beautiful miniature character illustration. No labels no text no watermark no UI. All nine cells must have exactly one creature.

## Boss extraction prompt

Extract only the bottom-right armored moon guardian boss into one standalone transparent game sprite. Preserve the exact design and painted style: silver crescent horns, dark armored body, violet chest crystal, dark cape. Entire character including horns and boots visible with 12% transparent margin around all edges. Remove all other characters and all their fragments. No backdrop, text, ground or scenery. Centered square composition, original character unchanged.
