#!/usr/bin/env python3
"""Refresh public daily OHLC history for FIRE MATE charts (no user data/API keys)."""
import json, pathlib, time, datetime
import yfinance as yf

root=pathlib.Path(__file__).resolve().parents[1]
config=json.loads((root/"chart-symbols.json").read_text(encoding="utf-8"))
symbols=config["symbols"]
korean_symbols=config.get("korean_symbols",[])
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

for code in korean_symbols:
    if not isinstance(code,str) or not __import__("re").fullmatch(r"\d{6}",code):continue
    try:
        for suffix in (".KS",".KQ"):
            hist=yf.Ticker(code+suffix).history(period="5y",interval="1d",auto_adjust=False)
            if len(hist)>1:break
        rows=[]
        for day,r in hist.iterrows():
            c,h,l=float(r["Close"]),float(r["High"]),float(r["Low"])
            if all(__import__("math").isfinite(n) and n>0 for n in (c,h,l)):
                rows.append({"date":day.strftime("%Y-%m-%d"),"close":round(c,4),"high":round(h,4),"low":round(l,4)})
        if len(rows)<2:raise ValueError("No KR historical data")
        (folder/("KR-"+code+".json")).write_text(json.dumps({"symbol":code,"updatedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),"source":"Yahoo Finance via yfinance","adjusted":False,"points":rows},ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
        success+=1
        print("KR",code,len(rows))
    except Exception as e:print("FAILED KR",code,str(e)[:180])
    time.sleep(1)
# Ten years of daily closes for each market index (closes only: the app draws a line, not candles).
for key,ticker in (config.get("indices") or {}).items():
    if not __import__("re").fullmatch(r"[A-Z0-9]{2,10}",str(key)):continue
    try:
        hist=yf.Ticker(ticker).history(period="10y",interval="1d",auto_adjust=False)
        rows=[{"date":day.strftime("%Y-%m-%d"),"close":round(float(r["Close"]),4)} for day,r in hist.iterrows() if __import__("math").isfinite(float(r["Close"])) and float(r["Close"])>0]
        if len(rows)<2:raise ValueError("No index history")
        (folder/("IDX-"+key+".json")).write_text(json.dumps({"symbol":key,"updatedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),"source":"Yahoo Finance via yfinance","points":rows},ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
        success+=1
        print("IDX",key,len(rows))
    except Exception as e:print("FAILED IDX",key,str(e)[:180])
    time.sleep(1)
if not success:raise SystemExit("No symbol history updated")
