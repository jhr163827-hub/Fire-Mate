// Original generated artwork, cropped and normalized for small game sprites.
// Asset provenance and exact prompts: ART.md.
export const sprites = {};
export async function loadArt() {
  await Promise.all(
    [
      "archer",
      "archer-evolved",
      "ember",
      "ember-evolved",
      "frost",
      "thorn",
      "bell",
      "wisp",
      "wolf",
      "beetle",
      "boss",
    ].map(
      (k) =>
        new Promise((resolve, reject) => {
          const im = new Image();
          im.onload = () => {
            sprites[k] = im;
            resolve();
          };
          im.onerror = () => reject(new Error("Asset failed: " + k));
          im.src = new URL("./art/" + k + ".webp", import.meta.url).href;
        }),
    ),
  );
}
