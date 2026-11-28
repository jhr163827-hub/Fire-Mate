// 🍽️ Cloudflare Pages Function: what a 네이버지도·카카오맵 share link points to, read like a chat app's link preview (no API key).
// GET /api/place?u=<link> → {url, src:'naver'|'kakao', pid, name, addr, cat}. Only map links are followed (every redirect hop is
// checked against MAP_HOSTS), so this is not an open proxy. Fields it cannot read are left out; the app then asks for them. Cached a day.
const MAP_HOSTS = /^(naver\.me|(m\.|pcmap\.)?(map|place)\.naver\.com|map\.naver\.com|kko\.to|(m\.)?map\.kakao\.com|place\.map\.kakao\.com|kakaomap\.kakao\.com)$/;
const UA = {'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36', 'Accept-Language': 'ko-KR,ko;q=0.9'};
const okUrl = u => { try { const x = new URL(u); return x.protocol === 'https:' && MAP_HOSTS.test(x.hostname) ? x : null; } catch { return null; } };
const unesc = s => String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
const meta = (html, p) => unesc((html.match(new RegExp('<meta[^>]+(?:property|name)=["\']' + p + '["\'][^>]*>', 'i'))?.[0].match(/content=["']([^"']*)["']/i) || [])[1]);

// The place id from a long link: map.naver.com/p/entry/place/123, m.place.naver.com/restaurant/123, place.map.kakao.com/123, map.kakao.com/?itemId=123.
export function placeId(u) {
  const x = okUrl(u); if (!x) return null;
  const naver = /naver/.test(x.hostname), m = x.href.match(naver ? /(?:place|restaurant|cafe|hairshop|hospital|accommodation|attraction)\/(\d{3,})|[?&](?:pinId|id)=(\d{3,})/ : /place\.map\.kakao\.com\/(?:m\/)?(\d{3,})|[?&]itemId=(\d{3,})/);
  return m ? {src: naver ? 'naver' : 'kakao', pid: m[1] || m[2]} : {src: naver ? 'naver' : 'kakao', pid: ''};
}

// Clean a page title: "연남 칼국수 : 네이버" / "연남 칼국수 | 카카오맵" → "연남 칼국수".
export function cleanName(t) {
  const s = unesc(t).replace(/\s*[:|\-–]\s*(네이버\s*(지도|플레이스)?|NAVER.*|카카오\s*맵|카카오맵|Kakao\s*Map)\s*$/i, '').trim();
  return /^(네이버\s*지도|카카오\s*맵|카카오맵|NAVER Map|Kakao Map)$/i.test(s) ? '' : s;
}

async function follow(start) {
  let u = start;
  for (let i = 0; i < 6; i++) {
    const r = await fetch(u.href, {headers: UA, redirect: 'manual'});
    const loc = r.status >= 300 && r.status < 400 && r.headers.get('location');
    if (!loc) return {url: u, html: r.ok ? (await r.text()).slice(0, 400000) : ''};
    const next = okUrl(new URL(loc, u).href);
    if (!next) return {url: u, html: ''};
    u = next;
  }
  return {url: u, html: ''};
}

async function kakaoInfo(pid) {
  try {
    const r = await fetch('https://place.map.kakao.com/main/v/' + pid, {headers: {...UA, Referer: 'https://place.map.kakao.com/' + pid}});
    if (!r.ok) return {};
    const j = await r.json(), b = j.basicInfo || {}, a = b.address || {};
    return {name: b.placenamefull, addr: [a.region?.newaddrfullname, a.newaddr?.newaddrfull].filter(Boolean).join(' ') || a.region?.fullname, cat: b.category?.catename || b.category?.cate1name};
  } catch { return {}; }
}

export async function onRequestGet({request, waitUntil}) {
  const start = okUrl(new URL(request.url).searchParams.get('u') || '');
  const head = {'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*'};
  if (!start) return new Response(JSON.stringify({error: 'map link only'}), {status: 400, headers: head});
  const key = new Request(new URL(request.url).origin + '/api/place?u=' + encodeURIComponent(start.href)), cache = caches.default, hit = await cache.match(key);
  if (hit) return hit;
  const out = {};
  try {
    const {url, html} = await follow(start);
    if (url) {
      Object.assign(out, {url: url.href}, placeId(url.href));
      out.name = cleanName(meta(html, 'og:title') || (html.match(/<title>([^<]*)<\/title>/i) || [])[1]);
      const d = meta(html, 'og:description');
      if (/^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충청|충북|충남|전라|전북|전남|경상|경북|경남|제주)/.test(d)) out.addr = d.split(/\s*[|·]\s*/)[0];
      if (out.src === 'kakao' && out.pid) { const k = await kakaoInfo(out.pid); for (const f of ['name', 'addr', 'cat']) if (k[f]) out[f] = k[f]; }
    }
  } catch {}
  for (const f of Object.keys(out)) if (!out[f]) delete out[f];
  const ok = !!out.url;
  const res = new Response(JSON.stringify(out), {status: ok ? 200 : 502, headers: {...head, 'cache-control': 'public, max-age=86400'}});
  if (ok) waitUntil(cache.put(key, res.clone()));
  return res;
}
