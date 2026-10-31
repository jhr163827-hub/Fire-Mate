#!/usr/bin/env python3
"""Save today's economy headlines and recent headlines for FIRE MATE's US symbols (titles and links only).

Google News RSS, no API key. The app reads chart-data/news.json for the home 📰 line and the news screen.
"""
import datetime, email.utils, json, pathlib, re, sys, time, urllib.parse, urllib.request
import xml.etree.ElementTree as ET

root = pathlib.Path(__file__).resolve().parents[1]
out = root / "chart-data" / "news.json"
RSS = "https://news.google.com/rss"
KO = "hl=ko&gl=KR&ceid=KR:ko"
# Company names for single stocks (Korean headlines rarely use the ticker). Other symbols are treated as ETFs:
# searched with "ETF" and kept only when the headline names the ticker, so "I SPY" songs or Vietnam's VTI group stay out.
# Korean holdings are searched by name (codes are never in headlines); a code without a known name is skipped.
KR_NAMES = {"005930": "삼성전자", "000660": "SK하이닉스", "360750": "TIGER 미국S&P500", "379800": "KODEX 미국S&P500TR",
            "133690": "TIGER 미국나스닥100", "069500": "KODEX 200", "102110": "TIGER 200", "252670": "KODEX 200선물인버스2X",
            "229200": "KODEX 코스닥150", "305720": "KODEX 2차전지산업", "381170": "TIGER 미국테크TOP10", "458730": "TIGER 미국배당다우존스",
            "498400": "KODEX 200타겟위클리커버드콜", "441680": "TIGER 미국나스닥100커버드콜", "453810": "KODEX 인도Nifty50", "411060": "ACE KRX금현물"}
NAMES = {"ENPH": ["엔페이즈", "인페이즈", "Enphase"], "RKLB": ["로켓랩", "Rocket Lab"], "SBUX": ["스타벅스", "Starbucks"], "ABSI": ["앱사이", "Absci"]}


def parse(xml, max_age_h, limit, now=None):
    """RSS text → [{t, src, url, at}] newest first, within max_age_h hours, without duplicate titles."""
    now = now or datetime.datetime.now(datetime.timezone.utc)
    items, seen = [], set()
    for it in ET.fromstring(xml).iter("item"):
        title, link = (it.findtext("title") or "").strip(), (it.findtext("link") or "").strip()
        src = (it.findtext("source") or "").strip()
        if src and title.endswith(" - " + src):
            title = title[: -len(src) - 3].strip()
        try:
            at = email.utils.parsedate_to_datetime(it.findtext("pubDate") or "")
        except (TypeError, ValueError):
            continue
        key = "".join(title.split())
        if not title or not link.startswith("https://") or key in seen or now - at > datetime.timedelta(hours=max_age_h):
            continue
        seen.add(key)
        items.append({"t": title, "src": src, "url": link, "at": at.astimezone(datetime.timezone.utc).isoformat()})
    items.sort(key=lambda x: x["at"], reverse=True)
    return items[:limit]


def get(url):
    for i in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (FIRE MATE news)"})
            with urllib.request.urlopen(req, timeout=20) as r:
                return r.read().decode("utf-8")
        except Exception as e:  # network hiccup: try again, then give up on this feed only
            print("retry", url, e, file=sys.stderr)
            time.sleep(2 * (i + 1))
    return None


def search(q, hours, limit):
    xml = get(RSS + "/search?q=" + urllib.parse.quote(q) + "&" + KO)
    return parse(xml, hours, limit) if xml else []


def main():
    config = json.loads((root / "chart-symbols.json").read_text(encoding="utf-8"))
    top = []
    xml = get(RSS + "/headlines/section/topic/BUSINESS?" + KO)
    if xml:
        top = parse(xml, 24, 15)
    market = search("증시 OR 코스피 OR 나스닥 when:1d", 24, 10)
    by_sym = {}
    for sym in config.get("symbols", []):
        # Google matches the ticker anywhere in the article; keep only headlines that actually name it.
        names = NAMES.get(sym, [])
        named = re.compile("|".join([r"(?<![A-Za-z])" + re.escape(sym) + r"(?![A-Za-z])"] + [re.escape(n) for n in names]), re.I if names else 0)
        q = " OR ".join(f'"{n}"' for n in [sym] + names) if names else f'"{sym}" ETF'
        items = [n for n in search(q + " when:7d", 24 * 7, 20) if named.search(n["t"])][:3]
        if items:
            by_sym[sym] = items
        time.sleep(0.5)
    for code in config.get("korean_symbols", []):
        name = KR_NAMES.get(code)
        if not name:
            continue
        flat = name.replace(" ", "")
        items = [n for n in search(f'"{name}" when:7d', 24 * 7, 20) if flat in n["t"].replace(" ", "")][:3]
        if items:
            by_sym[code] = items
        time.sleep(0.5)
    if not top and not market:
        print("no headlines; keeping the old file", file=sys.stderr)
        return
    data = {"at": datetime.datetime.now(datetime.timezone.utc).isoformat(), "top": top, "market": market, "symbols": by_sym}
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(len(top), "top", len(market), "market", len(by_sym), "symbols")


if __name__ == "__main__":
    main()
