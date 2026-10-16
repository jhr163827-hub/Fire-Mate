#!/usr/bin/env python3
"""Read-only market dividend event collection. No user portfolio data."""
import datetime as dt
import json
import os
import urllib.parse
import urllib.request

SYMBOLS = ["JEPQ", "SCHD", "JEPI", "SPY", "QLD", "SGOV", "498400.KS", "360750.KS", "SPYM", "SBUX", "ENPH", "RKLB", "ABSI", "TSLL", "AAPL", "MSFT", "NVDA", "KO", "O", "VTI", "VOO", "QQQ", "TQQQ", "SCHG", "DGRO", "VYM", "005930.KS", "000660.KS"]
now = dt.datetime.now(dt.timezone.utc)
start = int((now - dt.timedelta(days=800)).timestamp())
end = int(now.timestamp())
out = {"updatedAt": now.isoformat(), "source": "Yahoo Finance chart dividend events (unofficial)", "symbols": {}, "errors": {}}
for symbol in SYMBOLS:
    query = urllib.parse.urlencode({"period1": start, "period2": end, "interval": "1mo", "events": "div"})
    url = "https://query1.finance.yahoo.com/v8/finance/chart/" + urllib.parse.quote(symbol) + "?" + query
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=22) as res:
            payload = json.load(res)
        result = (payload.get("chart", {}).get("result") or [None])[0]
        if not result:
            raise ValueError("Missing chart result")
        events = (result.get("events") or {}).get("dividends") or {}
        rows = []
        for e in events.values():
            amount = float(e.get("amount") or 0)
            date = dt.datetime.fromtimestamp(int(e["date"]), dt.timezone.utc).date().isoformat()
            if amount > 0:
                rows.append({"date": date, "amount": amount})
        rows.sort(key=lambda x: x["date"])
        if not rows:
            raise ValueError("No dividend events")
        out["symbols"][symbol] = {"currency": "KRW" if symbol.endswith(".KS") else "USD", "events": rows}
        print(symbol, "OK", len(rows), "latest", rows[-1])
    except Exception as ex:
        out["errors"][symbol] = str(ex)[:180]
        print(symbol, "ERROR", str(ex)[:180])
if not out["symbols"]:
    raise SystemExit("No dividend data collected; retaining previous file")
if os.path.exists("dividends.json"):
    with open("dividends.json", encoding="utf-8") as f:
        previous = json.load(f)
    for symbol, record in (previous.get("symbols") or {}).items():
        if symbol not in out["symbols"]:
            out["symbols"][symbol] = record
with open("dividends.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
    f.write("\n")
