#!/usr/bin/env node
// Read-only audit. Never rewrites CSS or application storage.
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const styles=[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)];
const scripts=[...html.matchAll(/<script\b[^>]*>/gi)];
const important=(html.match(/!important/g)||[]).length;
const ids=[...html.matchAll(/\bid=["']([^"']+)["']/g)].map(x=>x[1]);
const duplicateIds=[...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];
const worker=fs.readFileSync('sw.js','utf8');
const inlineJs=[...html.matchAll(/<script\\b[^>]*>([\\s\\S]*?)<\\/script>/gi)].map(x=>x[1]);
const requiredIds=['netWorth','accountSummary','holdingList','refreshStocks','view-assets','view-calendar','view-home'];
for(const id of requiredIds){if(!ids.includes(id))throw Error('Missing core element: '+id)}
if(!html.includes("K='firemate_smart_v3'"))throw Error('Core storage key changed');
if(!html.includes("PRICE_KEY"))throw Error('Stock quote storage integration missing');
if(!html.includes("history.pushState")||!html.includes("popstate"))throw Error('Navigation history integration missing');
if(!html.includes("function persist()"))throw Error('Persistence entry point missing');
if(!worker.includes("self.skipWaiting()"))throw Error('Update activation path missing');
if(/caches\\.delete\\(|indexedDB\\.deleteDatabase\\(|localStorage\\.clear\\(/.test(worker))throw Error('Destructive cache or data operation detected');

const build=html.match(/const BUILD=['"]([^'"]+)['"]/);
const cache=worker.match(/const CACHE=['"]([^'"]+)['"]/);
if(!build||!cache||build[1]!==cache[1])throw Error('HTML/service worker build mismatch');
if(duplicateIds.length)throw Error('Duplicate HTML IDs: '+duplicateIds.join(', '));
if(!worker.includes("caches.open(CACHE).then(cache=>cache.match('./index.html'))"))throw Error('App shell not scoped to active cache');
console.log(JSON.stringify({build:build[1],styleBlocks:styles.length,scriptBlocks:scripts.length,importantDeclarations:important,coreIdsChecked:requiredIds.length,duplicateIds},null,2));
