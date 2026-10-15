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
const build=html.match(/const BUILD=['"]([^'"]+)['"]/);
const cache=worker.match(/const CACHE=['"]([^'"]+)['"]/);
if(!build||!cache||build[1]!==cache[1])throw Error('HTML/service worker build mismatch');
if(duplicateIds.length)throw Error('Duplicate HTML IDs: '+duplicateIds.join(', '));
if(!worker.includes("caches.open(CACHE).then(cache=>cache.match('./index.html'))"))throw Error('App shell not scoped to active cache');
console.log(JSON.stringify({build:build[1],styleBlocks:styles.length,scriptBlocks:scripts.length,importantDeclarations:important,duplicateIds},null,2));
