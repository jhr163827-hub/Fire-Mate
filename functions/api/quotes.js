// 📈 Cloudflare Pages Function: live US prices, pre-market/after-hours and market indices for FIRE MATE, fetched when the app asks
// (no scheduled job, nothing committed). GET /api/quotes?s=QLD,SCHD → the same shape as chart-data/live-quotes.json:
// {updatedAt, source, quotes:{SYM:{price,prevClose,at,ext?,extKind?,extAt?}, 'IDX-GSPC':{…}}}. Yahoo chart API, cached 60 seconds.
const INDICES = {IXIC: '^IXIC', GSPC: '^GSPC', KS11: '^KS11', KQ11: '^KQ11', USDKRW: 'KRW=X'};
const iso = s => (Number(s) > 0 ? new Date(s * 1000).toISOString() : undefined);
const pos = v => (Number.isFinite(+v) && +v > 0 ? Math.round(+v * 1e6) / 1e6 : undefined);

async function chart(ticker) {
  for (const host of ['query1', 'query2']) {
    try {
      const r = await fetch('https://' + host + '.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(ticker) + '?range=1d&interval=1m&includePrePost=true',
        {headers: {'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36', Accept: 'application/json'}});
      if (!r.ok) continue;
      const res = (await r.json())?.chart?.result?.[0];
      if (res?.meta) return res;
    } catch {}
  }
  return null;
}

function toQuote(res, us) {
  const m = res.meta, price = pos(m.regularMarketPrice);
  if (!price) return null;
  const q = {price, prevClose: pos(m.chartPreviousClose ?? m.previousClose), at: iso(m.regularMarketTime)};
  if (us) {
    // The newest 1-minute bar outside the regular session is the pre-market or after-hours price.
    const ts = res.timestamp || [], close = res.indicators?.quote?.[0]?.close || [], reg = m.currentTradingPeriod?.regular || {};
    for (let i = ts.length - 1; i >= 0; i--) {
      const p = pos(close[i]);
      if (!p) continue;
      if (ts[i] > (m.regularMarketTime || 0) && (ts[i] < reg.start || ts[i] >= reg.end)) Object.assign(q, {ext: p, extKind: ts[i] < reg.start ? 'pre' : 'post', extAt: iso(ts[i])});
      break;
    }
  }
  return Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined));
}

export async function onRequestGet({request, waitUntil}) {
  const url = new URL(request.url);
  const syms = [...new Set((url.searchParams.get('s') || '').toUpperCase().split(',').map(s => s.trim()).filter(s => /^[A-Z][A-Z0-9.\-]{0,14}$/.test(s)))].sort().slice(0, 20);
  const key = new Request(url.origin + '/api/quotes?s=' + syms.join(','));
  const cache = caches.default, hit = await cache.match(key);
  if (hit) return hit;
  const jobs = [...syms.map(s => [s, s, true]), ...Object.entries(INDICES).map(([k, t]) => ['IDX-' + k, t, false])];
  const got = await Promise.all(jobs.map(async ([k, t, us]) => { const r = await chart(t); return [k, r && toQuote(r, us)]; }));
  const quotes = Object.fromEntries(got.filter(([, q]) => q));
  const ok = Object.keys(quotes).length > 0;
  const res = new Response(JSON.stringify({updatedAt: new Date().toISOString(), source: 'Yahoo Finance chart (live, Cloudflare)', live: true, quotes}), {
    status: ok ? 200 : 502,
    headers: {'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=60'},
  });
  if (ok) waitUntil(cache.put(key, res.clone()));
  return res;
}
