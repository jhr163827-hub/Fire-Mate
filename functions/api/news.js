// 📰 Cloudflare Pages Function: today's headlines for FIRE MATE, fetched when the app asks (no scheduled job, nothing committed).
// GET /api/news?s=QLD,SCHD,498400 → {at, top, market, symbols:{sym:[{t,src,url,at}]}} — the same shape as chart-data/news.json.
// Google News RSS, titles and links only. Each answer is cached for 30 minutes, so many app opens make few Google requests.
const RSS = 'https://news.google.com/rss', KO = 'hl=ko&gl=KR&ceid=KR:ko';
// Korean holdings are searched by name (codes never appear in headlines); single US stocks also by company name.
const KR_NAMES = {'005930':'삼성전자','000660':'SK하이닉스','360750':'TIGER 미국S&P500','379800':'KODEX 미국S&P500TR','133690':'TIGER 미국나스닥100','069500':'KODEX 200','102110':'TIGER 200','252670':'KODEX 200선물인버스2X','229200':'KODEX 코스닥150','305720':'KODEX 2차전지산업','381170':'TIGER 미국테크TOP10','458730':'TIGER 미국배당다우존스','498400':'KODEX 200타겟위클리커버드콜','441680':'TIGER 미국나스닥100커버드콜','453810':'KODEX 인도Nifty50','411060':'ACE KRX금현물'};
const NAMES = {ENPH:['엔페이즈','인페이즈','Enphase'],RKLB:['로켓랩','Rocket Lab'],SBUX:['스타벅스','Starbucks'],ABSI:['앱사이','Absci']};
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const unxml = s => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim();
const tag = (x, n) => { const m = x.match(new RegExp('<' + n + '[^>]*>([\\s\\S]*?)</' + n + '>')); return m ? unxml(m[1]) : ''; };

function parse(xml, hours, limit) {
  const now = Date.now(), seen = new Set(), out = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    let t = tag(m[1], 'title'), url = tag(m[1], 'link'); const src = tag(m[1], 'source') || tag(m[1], 'News:Source'), at = Date.parse(tag(m[1], 'pubDate'));
    if (src && t.endsWith(' - ' + src)) t = t.slice(0, -src.length - 3).trim();
    // Bing wraps the article in a redirect (http://www.bing.com/news/apiclick.aspx?…&url=<article>): use the article itself.
    try { const u = new URL(url).searchParams.get('url'); if (u) url = u; } catch {}
    url = url.replace(/^http:\/\//, 'https://');
    const key = t.replace(/\s/g, '');
    if (!t || !url.startsWith('https://') || !at || seen.has(key) || now - at > hours * 36e5) continue;
    seen.add(key); out.push({t, src, url, at: new Date(at).toISOString()});
  }
  return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
const UA = {'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36', 'Accept-Language': 'ko-KR,ko;q=0.9'};
const errors = [];
async function get(url, hours, limit) {
  try {
    const r = await fetch(url, {headers: UA});
    if (!r.ok) { errors.push(new URL(url).host + ' ' + r.status); return []; }
    return parse(await r.text(), hours, limit);
  } catch (e) { errors.push(new URL(url).host + ' ' + String(e).slice(0, 40)); return []; }
}
// Google News first (it answers 503 to Cloudflare's servers); then Bing News RSS; for the two headline lists, newspaper RSS feeds last.
const bing = (q, hours, limit) => get('https://www.bing.com/news/search?format=rss&setlang=ko&cc=KR&q=' + encodeURIComponent(q.replace(/ when:\d+d/, '')), hours, limit);
const PAPERS = {경제: ['https://www.yna.co.kr/rss/economy.xml', 'https://www.hankyung.com/feed/economy'], 증시: ['https://www.yna.co.kr/rss/market.xml', 'https://www.hankyung.com/feed/finance']};
const rss = async (path, hours, limit, alt) => {
  let l = await get(RSS + path, hours, limit);
  if (!l.length && alt) l = await bing(alt, hours, limit);
  for (const u of (!l.length && PAPERS[(alt || '').slice(0, 2)]) || []) { if (!l.length) l = (await get(u, hours, limit)).map(n => ({...n, src: n.src || (u.includes('yna') ? '연합뉴스' : '한국경제')})); }
  if (!l.length && alt) errors.push('no items: ' + alt.slice(0, 12));
  return l;
};
const search = (q, hours, limit) => rss('/search?q=' + encodeURIComponent(q) + '&' + KO, hours, limit, q);

async function symbolNews(sym) {
  if (/^\d{6}$/.test(sym)) {
    const name = KR_NAMES[sym]; if (!name) return [];
    // "KODEX 200" must not match "KODEX 200선물인버스2X": the name has to end where a word ends.
    // Spaces inside the name may be missing in a headline; a space or punctuation after it is fine.
    const named = new RegExp(name.split(' ').map(esc).join('\\s*') + '(?![0-9A-Za-z가-힣])');
    return (await search('"' + name + '" when:7d', 168, 20)).filter(n => named.test(n.t)).slice(0, 3);
  }
  const names = NAMES[sym] || [];
  const named = new RegExp(['(?<![A-Za-z])' + esc(sym) + '(?![A-Za-z])', ...names.map(esc)].join('|'), names.length ? 'i' : '');
  const q = names.length ? [sym, ...names].map(n => '"' + n + '"').join(' OR ') : '"' + sym + '" ETF';
  return (await search(q + ' when:7d', 168, 20)).filter(n => named.test(n.t)).slice(0, 3);
}

export async function onRequestGet({request, waitUntil}) {
  errors.length = 0;
  const url = new URL(request.url);
  const syms = [...new Set((url.searchParams.get('s') || '').toUpperCase().split(',').map(s => s.trim()).filter(s => /^([A-Z]{1,6}|\d{6})$/.test(s)))].sort().slice(0, 12);
  const key = new Request(url.origin + '/api/news?s=' + syms.join(','));
  const cache = caches.default, hit = await cache.match(key);
  if (hit) return hit;
  const [top, market, lists] = await Promise.all([
    rss('/headlines/section/topic/BUSINESS?' + KO, 24, 15, '경제'),
    search('증시 OR 코스피 OR 나스닥 when:1d', 24, 10),
    Promise.all(syms.map(symbolNews)),
  ]);
  const symbols = {}; syms.forEach((s, i) => { if (lists[i].length) symbols[s] = lists[i]; });
  const ok = top.length || market.length;
  const res = new Response(JSON.stringify({at: new Date().toISOString(), top, market, symbols, ...(errors.length ? {errors: [...new Set(errors)].slice(0, 5)} : {})}), {
    status: ok ? 200 : 502,
    headers: {'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=' + (ok ? 1800 : 60)},
  });
  if (ok) waitUntil(cache.put(key, res.clone()));
  return res;
}
