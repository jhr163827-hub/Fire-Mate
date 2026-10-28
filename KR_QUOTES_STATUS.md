# Domestic quote freshness — 3.5.181

The 10:42 screenshot showed 09:31/09:32 quotes. The repository snapshot saved at 09:52 KST actually contained those older Yahoo timestamps. The existing KRX closing-price endpoint and 30-minute scheduled snapshot could therefore both lag during trading.

Added Naver public JSONP OPEN-market snapshots in parallel with the existing Worker, with server timestamp validation and cache-busting. Closed, future, and stale live responses are rejected. All candidates, the scheduled backup, and saved holding timestamps are compared so older sources cannot overwrite a newer price.

While the app is visible during weekday Korean trading hours, domestic quotes older than two minutes are retried at most every two minutes; foreground/online events also check. US/crypto APIs are excluded from these retries. Quotes older than ten minutes show their age and a delay label during the session. Refresh completion is labelled as query time, not price time.

No financial calculation, user-storage key, or PWA activation policy changed. App version/cache identifiers advance together. Code budget grows by 2,887 bytes (477,270 → 480,157).

Local checks: app integrity, inline JavaScript syntax, PWA update guards, storage rollback guards, asset/FIRE calculation references, finance tests passed. Browser regression coverage includes live/backup comparison, closed/future timestamps, failure fallback, saved-price preservation, screenshot timing, and foreground domestic-only refresh. Local Chromium downloads were unavailable; browser suite runs through GitHub Actions. Installed Android PWA and real Korean-market foreground updates remain unverified.
