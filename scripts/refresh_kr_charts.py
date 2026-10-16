#!/usr/bin/env python3
"""Incrementally populate chart-data/KR-XXXXXX.json for KRX stocks and ETFs."""
import json, os, time, datetime as dt
from pathlib import Path
import FinanceDataReader as fdr
import pandas as pd

ROOT=Path("chart-data")
ROOT.mkdir(exist_ok=True)
TODAY=dt.date.today()
LIMIT=max(1,int(os.environ.get("KR_CHART_BATCH","120")))
LOOKBACK=int(os.environ.get("KR_CHART_DAYS","800"))
def codes():
    errors=[]
    for market in ("KRX","KRX-DESC"):
        try:
            listing=fdr.StockListing(market)
            col=next((c for c in ("Code","Symbol","Ticker") if c in listing.columns),None)
            if col is None: raise ValueError("missing code column")
            result=sorted({str(v).strip().zfill(6) for v in listing[col].dropna() if str(v).strip().isdigit() and len(str(v).strip())<=6})
            if len(result)>1000: return result
            errors.append(f"{market}: only {len(result)} tickers")
        except Exception as e: errors.append(f"{market}: {e}")
    raise RuntimeError("KRX universe unavailable; refusing to overwrite existing data: "+"; ".join(errors))
symbols=codes()
cursor=Path(".kr-chart-cursor")
offset=int(cursor.read_text().strip()) if cursor.exists() else 0
# Refresh priority holdings before continuing the regular market-wide rotation.
priority=[v.strip() for v in os.environ.get("KR_CHART_PRIORITY","360750,498400").split(",") if v.strip().isdigit() and len(v.strip())==6]
regular=[symbols[(offset+i)%len(symbols)] for i in range(min(LIMIT,len(symbols)))]
batch=list(dict.fromkeys(priority+regular))
ok=0
for symbol in batch:
    try:
        df=fdr.DataReader(symbol,str(TODAY-dt.timedelta(days=LOOKBACK)),str(TODAY))
        if df is None or df.empty: continue
        df=df.dropna(subset=["Close","High","Low"])
        points=[{"date":idx.strftime("%Y-%m-%d"),"close":round(float(row["Close"]),4),"high":round(float(row["High"]),4),"low":round(float(row["Low"]),4)} for idx,row in df.iterrows() if float(row["Close"])>0 and float(row["High"])>0 and float(row["Low"])>0]
        if len(points)<2: continue
        path=ROOT/f"KR-{symbol}.json"
        path.write_text(json.dumps({"symbol":symbol,"points":points},ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
        ok+=1
    except Exception as e:
        print(f"{symbol}: {type(e).__name__}: {e}",flush=True)
    time.sleep(.2)
cursor.write_text(str((offset+len(regular))%len(symbols))+"\n")
print(f"Updated {ok}/{len(batch)} tickers; total universe {len(symbols)}; next offset {(offset+len(batch))%len(symbols)}")
if ok==0: raise RuntimeError("No price histories downloaded; check data provider.")
