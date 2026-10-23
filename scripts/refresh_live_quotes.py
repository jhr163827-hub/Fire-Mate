#!/usr/bin/env python3
"""Save current, pre-market and after-hours prices for FIRE MATE's symbols (no user data or API keys).

The app reads chart-data/live-quotes.json as a backup when its live sources fail and to show
US pre-market / after-hours prices.
"""
import datetime, json, math, pathlib, re, time
import yfinance as yf

root = pathlib.Path(__file__).resolve().parents[1]
config = json.loads((root / "chart-symbols.json").read_text(encoding="utf-8"))
out = root / "chart-data" / "live-quotes.json"


def iso(ts):
    try:
        return datetime.datetime.fromtimestamp(int(ts), datetime.timezone.utc).isoformat()
    except (TypeError, ValueError, OSError, OverflowError):
        return None


def num(v):
    try:
        v = float(v)
    except (TypeError, ValueError):
        return None
    return round(v, 6) if math.isfinite(v) and v > 0 else None


def quote(ticker, us):
    info = yf.Ticker(ticker).info or {}
    price = num(info.get("regularMarketPrice")) or num(info.get("currentPrice"))
    if price is None:
        return None
    q = {"price": price, "prevClose": num(info.get("regularMarketPreviousClose")) or num(info.get("previousClose")),
         "at": iso(info.get("regularMarketTime"))}
    if us:
        # The newer of the two extended sessions is the one that matters right now.
        pre, post = num(info.get("preMarketPrice")), num(info.get("postMarketPrice"))
        pre_at, post_at = info.get("preMarketTime") or 0, info.get("postMarketTime") or 0
        reg_at = info.get("regularMarketTime") or 0
        if post and post_at > reg_at and post_at >= pre_at:
            q.update(ext=post, extKind="post", extAt=iso(post_at))
        elif pre and pre_at > reg_at:
            q.update(ext=pre, extKind="pre", extAt=iso(pre_at))
    return {k: v for k, v in q.items() if v is not None}


previous = {}
try:
    previous = json.loads(out.read_text(encoding="utf-8")).get("quotes", {})
except (OSError, ValueError):
    pass

quotes, ok = {}, 0
for symbol in config.get("symbols", []):
    if not isinstance(symbol, str) or not re.fullmatch(r"[A-Z][A-Z0-9.\-]{0,14}", symbol):
        continue
    try:
        q = quote(symbol, True)
        if q:
            quotes[symbol] = q
            ok += 1
    except Exception as e:  # keep the last good quote for this symbol
        print("FAILED", symbol, str(e)[:160])
    if symbol not in quotes and symbol in previous:
        quotes[symbol] = previous[symbol]
    time.sleep(0.5)

for code in config.get("korean_symbols", []):
    if not isinstance(code, str) or not re.fullmatch(r"\d{6}", code):
        continue
    key = "KR-" + code
    try:
        for suffix in (".KS", ".KQ"):
            q = quote(code + suffix, False)
            if q:
                quotes[key] = q
                ok += 1
                break
    except Exception as e:
        print("FAILED KR", code, str(e)[:160])
    if key not in quotes and key in previous:
        quotes[key] = previous[key]
    time.sleep(0.5)

if not ok:
    raise SystemExit("No quote refreshed")
out.write_text(json.dumps({"updatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                           "source": "Yahoo Finance via yfinance", "quotes": quotes},
                          ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
print("quotes", ok, "of", len(quotes))
