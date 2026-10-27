const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('arcade/casefiles/game.js','utf8');
const arcade=fs.readFileSync('arcade/index.html','utf8');
function boot(saved){
 const store=new Map(saved?Object.entries(saved):[]);
 const ids=new Map();
 function el(id){if(!ids.has(id))ids.set(id,{id,innerHTML:'',textContent:'',value:'',hidden:false,dataset:{},className:'',style:{},listeners:{},classList:{toggle(){},add(){}},querySelector(){return {textContent:''}},addEventListener(type,fn){this.listeners[type]=fn},setAttribute(){},showModal(){this.open=true},close(){this.open=false}});return ids.get(id)}
 const document={getElementById:el,body:{dataset:{}},querySelectorAll(selector){if(selector==='.screen')return ['desk','caseScreen','finalScreen'].map(el);if(selector==='[data-symbol]')return [0,1,2].map(i=>el('symbol'+i));return []}};
 const context=vm.createContext({document,window:{scrollTo(){},AudioContext:null},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},console});
 vm.runInContext(source,context);
 const run=s=>vm.runInContext(s,context);
 return {store,el,run};
}
test('arcade entry and three coherent, independently playable case files',()=>{
 assert.match(arcade,/href="\.\/casefiles\/"/);
 const g=boot();const cases=g.run('CASES');assert.equal(cases.length,3);
 for(const c of cases){assert.equal(c.clues.length,5);assert.equal(c.suspects.length,3);assert.ok(c.suspects[c.answer]);assert.ok(c.reasons[c.reason]);assert.equal(new Set(c.clues.map(x=>x[0])).size,5)}
 assert.equal(new Set(cases.map(c=>c.symbol)).size,3);
});
test('investigation, rejected guess, correct deductions, persistence and finale',()=>{
 const g=boot(),cases=g.run('CASES');
 g.run("openCase('archive')");g.el('accuse').value='0';g.el('reason').value='0';g.run('submit()');assert.match(g.el('feedback').textContent,/최소 세 가지/);
 for(const c of cases){g.run(`openCase('${c.id}')`);for(let i=0;i<3;i++){g.run(`clue(${i})`);g.run("document.getElementById('collectClue').listeners.click()")}
  g.el('accuse').value=String((c.answer+1)%3);g.el('reason').value=String(c.reason);g.run('submit()');assert.match(g.el('feedback').textContent,/맞지 않는 추리/);
  g.el('accuse').value=String(c.answer);g.run('submit()');assert.match(g.el('feedback').textContent,/사건 해결/);
 }
 const saved=JSON.parse(g.store.get('firemate_casefiles_v1'));assert.equal(Object.keys(saved.solved).length,3);
 const second=boot(Object.fromEntries(g.store));assert.match(second.el('progress').textContent,/3 \/ 3/);
 second.run('final()');assert.equal(second.el('finalScreen').hidden,false);
 ['달','별','열쇠'].forEach((s,i)=>second.el('symbol'+i).value=s);
 second.run("document.getElementById('finalSubmit').listeners.click()");assert.equal(second.el('ending').hidden,false);
});
