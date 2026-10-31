// Existing saves and classic game remain available. New visits enter tactics.
const params = new URLSearchParams(location.search);
if (params.has("classic") || params.has("test")) await import("./app.mjs");
else location.replace(new URL("./tactical/", location.href));
