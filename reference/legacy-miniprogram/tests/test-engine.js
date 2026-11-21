const assert = require('assert');
const questions = require('../data/questions');
const engine = require('../utils/engine');
const ids=new Set();
for(const q of questions){
  assert(!ids.has(q.id),'重复题目 ID：'+q.id);ids.add(q.id);
  assert(q.title && q.explanation && q.category, '题目字段缺失');
  if(q.type==='choice')assert(q.answer>=0 && q.answer<q.options.length,'选项异常: '+q.id);
  else if(q.type==='visual')assert(q.tiles.length===16 && q.answer>=0 && q.answer<16,'视觉题异常: '+q.id);
  else if(q.type==='sequence')assert.deepStrictEqual(q.answer.slice().sort((a,b)=>a-b),q.options.map((_,i)=>i),'排序题答案不是全排列: '+q.id);
  else throw Error('不支持题型: '+q.type);
  assert(engine.isCorrect(q,q.answer),'正确答案判定失败: '+q.id);
  if(q.type!=='sequence')assert(!engine.isCorrect(q,(q.answer+1)%(q.type==='visual'?16:q.options.length)),'错误答案判定失败: '+q.id);
  else assert(!engine.isCorrect(q,q.answer.slice().reverse()),'排序题判错失败: '+q.id);
}
const feed=engine.makeFeed(questions,30,[],[],{});
assert(feed.length===30);
assert(new Set(feed.map(x=>x.id)).size===30);
for(let i=1;i<feed.length;i++)assert.notStrictEqual(feed[i-1].category,feed[i].category,'同类题连续出现');
const later=engine.makeFeed(questions,12,feed.map(q=>q.id),feed.slice(-2).map(q=>q.category),{});
assert(later.length===12 && later.every(q=>!feed.some(x=>x.id===q.id)));
console.log('PASS - '+questions.length+' 道题; '+new Set(questions.map(x=>x.category)).size+' 类题; '+new Set(questions.map(x=>x.type)).size+' 类交互; 推荐算法与判题通过');
