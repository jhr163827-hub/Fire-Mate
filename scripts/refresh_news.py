#!/usr/bin/env python3
"""Save today's economy headlines and recent headlines for FIRE MATE's US symbols (titles and links only).

Google News RSS, no API key. The app reads chart-data/news.json for the home 📰 line and the news screen.
"""
import datetime, email.utils, json, pathlib, sys, time, urllib.parse, urllib.request
import xml.etree.ElementTree as ET

root = pathlib.Path(__file__).resolve().parents[1]
out = root / "chart-data" / "news.json"
RSS = "https://news.google.com/rss"
KO = "hl=ko&gl=KR&ceid=KR:ko"


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
        items = search(f'"{sym}" when:7d', 24 * 7, 3)
        if items:
            by_sym[sym] = items
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
