const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const updater=html.split('<script id="fm-pwa-updates">')[1]?.split('</script>')[0];
const tests=[
 ['matching build',()=>assert.equal(html.match(/const BUILD='([^']+)'/)?.[1],sw.match(/const CACHE='([^']+)'/)?.[1])],
 ['manual update button',()=>assert.match(updater,/fmManualUpdate/)],
 ['no automatic update dialog',()=>{assert.doesNotMatch(updater,/fmPwaDialog/);const check=updater.split('const check=async()=>')[1]?.split('button.onclick=async()=>')[0];assert.ok(check);assert.doesNotMatch(check,/modal\(|SKIP_WAITING|location\.replace/)}],
 ['no automatic activation',()=>assert.doesNotMatch(sw.split("self.addEventListener('install'")[1].split("self.addEventListener('activate'")[0],/skipWaiting\s*\(/)],
 ['explicit activation only',()=>assert.match(updater,/waiting\.postMessage\(\{type:'SKIP_WAITING'\}\)/)],
 ['preflight before activation',()=>{const check=updater.indexOf("html.includes('id=\"view-home\"')");assert.ok(check>0);assert.ok(check<updater.indexOf('waiting.postMessage('))}],
 ['waits for installing worker before activation',()=>{assert.match(updater,/if\(!waiting&&reg\.installing\)/);assert.match(updater,/worker\.state==='installed'/);assert.match(updater,/if\(waiting\).*waiting\.postMessage/)}],
 ['update verification bypasses cache',()=>{assert.match(updater,/cache:'no-store'/);assert.match(updater,/const match=html\.match/);assert.match(sw,/fetch\(new Request\(req,\{cache:'no-store'\}\)\)/)}],
 ['only old app caches are removed',()=>{assert.match(sw,/keys\.filter\(key=>key\.startsWith\('fire-mate-v'\)&&key!==CACHE\)/);assert.doesNotMatch(sw,/localStorage|indexedDB/)}],
 ['no data deletion',()=>assert.doesNotMatch(updater,/localStorage\.clear|indexedDB\.deleteDatabase/)],
 ['valid JS syntax',()=>{new vm.Script(updater);new vm.Script(sw)}],
 ['worker registers handlers',()=>{const handlers={};vm.runInNewContext(sw,{self:{location:{origin:'https://example.com'},addEventListener:(n,h)=>handlers[n]=h},caches:{},fetch:()=>{},URL,Request,Response,Promise});for(const n of ['install','activate','message','fetch'])assert.equal(typeof handlers[n],'function')}]
];
let failed=0;
for(const [name,fn] of tests){try{fn();console.log('PASS',name)}catch(e){failed++;console.error('FAIL',name,e.message)}}
console.log(tests.length+' checks; '+failed+' failures. Browser-installed PWA still requires integration verification.');
process.exitCode=failed?1:0;
