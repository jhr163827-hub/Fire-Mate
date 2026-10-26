import test from 'node:test';
import assert from 'node:assert/strict';
import {PADS,PATH,TYPES,projectPoint,ROLE_HINTS} from '../data.mjs';
test('landscape projection preserves every pad/path distance and round trips',()=>{
 const points=[...PADS,...PATH].map(([x,y])=>({x,y}));
 for(const p of points){
  assert.deepEqual(projectPoint(projectPoint(p,true),true),p);
  for(const q of points){
   const a=projectPoint(p,true),b=projectPoint(q,true);
   assert.equal(Math.hypot(p.x-q.x,p.y-q.y),Math.hypot(a.x-b.x,a.y-b.y));
  }
 }
});
test('each guardian has a distinct actionable role',()=>{
 assert.deepEqual(Object.keys(ROLE_HINTS).sort(),Object.keys(TYPES).sort());
 assert.equal(new Set(Object.values(ROLE_HINTS).map(r=>r.title)).size,5);
});
