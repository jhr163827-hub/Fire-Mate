#!/usr/bin/env python3
"""Refresh public daily OHLC history for FIRE MATE charts (no user data/API keys)."""
import json, pathlib, time, datetime
import yfinance as yf

root=pathlib.Path(__file__).resolve().parents[1]
symbols=json.loads((root/"chart-symbols.json").read_text(encoding="utf-8"))["symbols"]
folder=root/"chart-data";folder.mkdir(exist_ok=True)
success=0
for symbol in symbols:
    if not isinstance(symbol,str) or not __import__("re").fullmatch(r"[A-Z][A-Z0-9.\-]{0,14}",symbol):continue
    try:
        hist=yf.Ticker(symbol).history(period="5y",interval="1d",auto_adjust=False)
        rows=[]
        for day,r in hist.iterrows():
            c,h,l=float(r["Close"]),float(r["High"]),float(r["Low"])
            if all(__import__("math").isfinite(n) and n>0 for n in (c,h,l)):
                rows.append({"date":day.strftime("%Y-%m-%d"),"close":round(c,6),"high":round(h,6),"low":round(l,6)})
        if len(rows)<2:raise ValueError("Insufficient historical data")
        target=folder/(symbol+".json")
        target.write_text(json.dumps({"symbol":symbol,"updatedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),"source":"Yahoo Finance via yfinance","adjusted":False,"points":rows},ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
        success+=1
        print(symbol,len(rows))
    except Exception as e:print("FAILED",symbol,str(e)[:180])
    time.sleep(1)
if not success:raise SystemExit("No symbol history updated")
