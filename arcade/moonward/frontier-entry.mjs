// Preserve the classic mode and its saves while switching only this game's entry.
const params = new URLSearchParams(location.search);
if (params.has("classic") || params.has("test")) await import("./app.mjs");
else location.replace(new URL("./frontier/", location.href));
