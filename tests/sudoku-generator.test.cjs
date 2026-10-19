const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('arcade/sudoku.html','utf8');
const from=html.indexOf('function rng('),to=html.indexOf('function msg(',from);
assert.ok(from>=0&&to>from,'Sudoku generation functions must be present');
const context=vm.createContext({minClues:[45,41,37,34,31,29,27,25]});
vm.runInContext(html.slice(from,to),context);
for(const stage of [1,125,126,251,376,501,626,751,876,1000]){
test('stage '+stage+' is deterministic and has exactly one solution',()=>{
const a=context.create(stage),b=context.create(stage);
assert.equal(a.puzzle.length,81);
assert.equal(a.puzzle.join(','),b.puzzle.join(','));
assert.equal(context.countSolutions(a.puzzle.slice()),1);
assert.ok(a.puzzle.every((v,i)=>!v||v===a.solution[i]));
assert.ok(a.clues>=25&&a.clues<=48);
});
}
test('stage tiers reduce target clue count',()=>{
let previous=Infinity;
for(const stage of [1,126,251,376,501,626,751,876]){
const n=context.create(stage).clues;
assert.ok(n<=previous,'stage '+stage+' has unexpectedly more clues');
previous=n;
}
});
