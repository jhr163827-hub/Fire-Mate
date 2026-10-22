const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
// Execute the actual game script with a minimal DOM. Canvas calls are no-ops;
// rendering and touch layout are covered separately by Playwright.
function game(storage=new Map()){
 class Element{constructor(){this.textContent='';this.children=[];this.hidden=false;this.style={}}append(x){this.children.push(x)}replaceChildren(){this.children=[]}querySelector(){return this.children[0]}click(){this.onclick?.()}addEventListener(){}setPointerCapture(){}}
 const elements=new Map();const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id)};
 const gradient={addColorStop(){}};const ctx=new Proxy({createRadialGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});get('game').getContext=()=>ctx;
 const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
 const context=vm.createContext({document:{getElementById:get,createElement:()=>new Element(),addEventListener(){},hidden:false},Image:class{complete=false;naturalWidth=0},innerWidth:390,innerHeight:720,devicePixelRatio:1,addEventListener(){},requestAnimationFrame(){},performance:{now:()=>0},location:{hostname:'localhost',search:'?nightfall_test=1'},URLSearchParams,localStorage,confirm:()=>true,console,Math:Object.create(Math)});context.window=context;
 let script=fs.readFileSync('arcade/nightfall.html','utf8').match(/<script>([\s\S]*)<\/script>/)[1];script=script.replace('let frameFaults=0;',`window.logic={start,tick,weaponTick,draw,upgrade,over,resumeRun,readRun,saveRun,regionType,regionTick,regionBoss,difficulty,orbit,get state(){return state},get player(){return player},get weapons(){return weapons},get evolved(){return evolved},get enemy(){return enemy},set enemy(v){enemy=v},get bolts(){return bolts},get fields(){return fields},get hazards(){return hazards},get gems(){return gems},get cooldowns(){return cooldowns},get counts(){return castCounts},get pending(){return pendingUpgrade},get elapsed(){return elapsed},get progress(){return progress},set elapsed(v){elapsed=v},set stage(v){runStage=v},set mode(v){runMode=v}};let frameFaults=0;`);
 vm.runInContext(script,context);return {api:context.logic,diag:context.__nightfallTest,get,storage,context};
}
const enemy=(x=180,y=0,hp=10000)=>({x,y,hp,max:hp,type:'fiend',speed:0,radius:17,hit:0,knockX:0,knockY:0,slow:0});
function playing(){let g=game();g.api.start();g.api.player.inv=1e6;return g}
function steps(api,seconds){for(let t=0;t<seconds-1e-8;t+=.02){api.tick(.02);if(api.pending)break}}
test('adding eleven weapons preserves arcane cadence and causes independent casts',()=>{
 const a=playing(),b=playing();for(const k of Object.keys(b.api.weapons))b.api.weapons[k]=1;
 for(const g of [a,b]){g.api.enemy=[enemy()];for(let i=0;i<100;i++)g.api.weaponTick(.02)}
 assert.equal(a.api.counts.arcane,b.api.counts.arcane);assert.ok(b.api.counts.fire>=1);assert.ok(b.api.counts.summon>=1);
});
test('orbiting scythe deals contact damage with a per-enemy cooldown',()=>{
 const {api}=playing();api.weapons.scythe=1;const o=api.orbit('scythe');const e=enemy(o.x,o.y);api.enemy=[e];api.weaponTick(.01);let hp=e.hp;assert.ok(hp<10000);api.weaponTick(.01);assert.equal(e.hp,hp);api.weaponTick(.41);assert.ok(e.hp<hp);
});
test('homing missile turns toward a moving target',()=>{
 const {api}=playing();api.weapons.arcane=0;api.weapons.missile=1;let e=enemy(200,0);api.enemy=[e];api.weaponTick(.01);let b=api.bolts[0];assert.equal(b.vy,0);e.y=180;api.tick(.04);assert.ok(b.vy>0);
});
test('spirit fires from its orbital position independently of the player',()=>{
 const {api}=playing();api.weapons.arcane=0;api.weapons.summon=1;api.enemy=[enemy()];api.weaponTick(.01);const b=api.bolts[0],o=api.orbit('summon');assert.equal(b.kind,'summon');assert.equal(b.x,o.x);assert.equal(b.y,o.y);assert.notEqual(b.x,api.player.x);
});
test('laser damages every enemy on its line and spares off-axis targets',()=>{
 const {api}=playing();api.weapons.arcane=0;api.weapons.laser=1;api.enemy=[enemy(80),enemy(180),enemy(150,100)];api.weaponTick(.01);assert.ok(api.enemy[0].hp<10000);assert.ok(api.enemy[1].hp<10000);assert.equal(api.enemy[2].hp,10000);
});
test('poison cloud applies damage over time after impact',()=>{
 const {api}=playing();api.weapons.arcane=0;api.weapons.poison=1;api.enemy=[enemy(70)];steps(api,.2);assert.ok(api.fields.length);let e=api.enemy[0],hp=e.hp;api.weaponTick(.5);assert.ok(e.hp<hp);
});
test('all twelve weapon types damage enemies, and evolution increases damage',()=>{
 for(const k of ['arcane','fire','ice','lightning','poison','wind','scythe','missile','summon','laser','quake','storm']){
  const damage=evolved=>{const {api}=playing();api.weapons.arcane=0;api.weapons[k]=5;api.evolved[k]=evolved;const o=k==='scythe'?api.orbit(k):{x:70,y:0};const e=enemy(o.x,o.y,100000);api.enemy=[e];steps(api,.6);return 100000-e.hp};
  assert.ok(damage(false)>0,k+' must hit');assert.ok(damage(true)>damage(false),k+' evolution must increase damage');
 }
});
test('choice always offers an owned upgrade and excludes wasted capped options',()=>{
 const {api,get}=playing();api.player.multi=5;api.player.rate=.17;api.player.speed=320;
 for(let i=0;i<40;i++){api.upgrade();let labels=get('choices').children.map(x=>x.textContent);assert.equal(labels.length,3);assert.ok(labels.some(x=>x.includes('비전 강화')));assert.ok(!labels.some(x=>/체력 회복|투사체|주문 간격|이동 속도/.test(x)))}
 api.weapons.arcane=5;api.upgrade();assert.ok(get('choices').children.some(x=>x.textContent.startsWith('궁극 진화')));
});
test('pending level-up survives reload and cannot be skipped for free',()=>{
 const g=playing();g.api.upgrade();assert.ok(g.api.saveRun());const restored=game(g.storage);restored.api.resumeRun();assert.ok(restored.api.pending);assert.equal(restored.get('title').textContent,'LEVEL 1');restored.get('choices').children[0].click();assert.equal(restored.api.pending,false);assert.equal(restored.api.weapons.arcane,2);
});
test('resume restores combat, mode, cooldown, stage and health; starts paused',()=>{
 const g=playing();g.api.stage=3;g.api.mode='hard';g.api.player.hp=61;g.api.enemy=[enemy()];g.api.weapons.fire=3;steps(g.api,1);assert.ok(g.api.saveRun());const restored=game(g.storage);restored.api.resumeRun();assert.equal(restored.api.state,'pause');assert.equal(restored.api.player.hp,61);assert.equal(restored.api.weapons.fire,3);assert.equal(restored.api.enemy.length,g.api.enemy.length);assert.equal(restored.api.elapsed,g.api.elapsed);assert.equal(restored.api.cooldowns.fire,g.api.cooldowns.fire);assert.equal(restored.diag.snapshot().runStage,3);assert.equal(restored.diag.snapshot().runMode,'hard');
});
test('settlement is idempotent and does not touch finance data',()=>{
 const g=playing();g.storage.set('finance-sentinel','keep');g.api.elapsed=120;g.api.saveRun();const stale=g.storage.get('nightfall_run_v1');g.api.over();let gold=g.api.progress.gold;g.api.over();assert.equal(g.api.progress.gold,gold);assert.equal(g.storage.get('finance-sentinel'),'keep');assert.ok(!g.storage.has('nightfall_run_v1'));g.storage.set('nightfall_run_v1',stale);assert.equal(game(g.storage).api.readRun(),null);
});
test('malformed run is ignored while existing permanent progression survives',()=>{
 const g=playing();g.api.saveRun();let r=JSON.parse(g.storage.get('nightfall_run_v1'));r.player.rate=0;g.storage.set('nightfall_run_v1',JSON.stringify(r));assert.equal(game(g.storage).api.readRun(),null);
});
test('save failure is visible and does not report success',()=>{
 const g=playing();g.context.localStorage.setItem=()=>{throw Error('quota')};assert.equal(g.api.saveRun(),false);assert.match(g.get('save-status').textContent,/저장 실패/);
});
test('regions change enemy selection, events and boss patterns',()=>{
 const {api}=playing();api.elapsed=100;api.stage=1;assert.equal(api.regionType('wraith',.2),'wraith');api.regionTick(45);assert.equal(api.gems.length,8);api.stage=2;assert.equal(api.regionType('wraith',.2),'runner');api.regionTick(45);assert.ok(api.hazards.length>=3);api.stage=3;assert.equal(api.regionType('wraith',.2),'ranged');let before=api.hazards.length;api.regionBoss(enemy());assert.equal(api.hazards.length,before+6);
});
test('boss health scales with difficulty and region',()=>{
 const hp=(mode,stage)=>{const {api}=playing();api.mode=mode;api.stage=stage;api.elapsed=300;api.tick(.01);return api.enemy.find(e=>e.type==='boss').max};assert.ok(hp('hard',1)>hp('normal',1));assert.ok(hp('nightmare',3)>hp('hard',1));
});
test('normal ten-minute progression, real choices and final boss remain functional',()=>{
 const {api,get}=playing();for(let i=0;i<15001;i++){api.tick(.04);if(api.pending)get('choices').children[0].click();if(api.state==='pause')break}assert.ok(api.elapsed>=600);assert.ok(api.enemy.some(e=>e.type==='finalboss'));assert.ok(api.player.hp>0);assert.ok(api.weapons.arcane>=2);
});
test('final boss defeat grants victory once and clears the checkpoint',()=>{
 const g=playing();g.api.elapsed=600;g.api.tick(.01);const boss=g.api.enemy.find(e=>e.type==='finalboss');assert.ok(boss);g.api.saveRun();boss.hp=0;g.api.tick(.01);assert.equal(g.get('title').textContent,'VICTORY');assert.equal(g.api.progress.wins,1);let gold=g.api.progress.gold;g.api.over(true);assert.equal(g.api.progress.gold,gold);assert.equal(g.api.readRun(),null);
});
test('twenty-minute mode spawns bosses at ten and twenty minutes',()=>{
 const g=game();g.api.start('nightmare',1200);g.api.player.inv=1e6;g.api.elapsed=599;g.api.tick(.01);assert.equal(g.api.enemy.some(e=>e.type==='boss'),false);g.api.elapsed=600;g.api.tick(.01);assert.equal(g.api.enemy.some(e=>e.type==='boss'),true);g.api.elapsed=1200;g.api.tick(.01);assert.equal(g.api.enemy.some(e=>e.type==='finalboss'),true);
});
