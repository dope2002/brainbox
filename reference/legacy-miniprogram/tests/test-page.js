const assert = require('assert');
const storage={};
global.wx={getStorageSync:key=>storage[key],setStorageSync:(key,v)=>{storage[key]=JSON.parse(JSON.stringify(v));},showActionSheet:()=>{},showToast:()=>{}};
global.App=()=>{};
let config;
global.Page=c=>{config=c};
require('../pages/index/index.js');
const page=Object.assign({data:{...config.data},setData(update){Object.assign(this.data,update)}},config);
page.onLoad({});
assert.strictEqual(page.data.feed.length,17);
assert.strictEqual(page.data.totalViewed,1);
const first=page.data.feed[0];
if(first.type==='sequence'){
  const answer=first.answer;
  answer.forEach(n=>page.onSequence({currentTarget:{dataset:{feedIndex:0,optionIndex:n}}}));
}else if(first.type==='visual'){
  page.onVisual({currentTarget:{dataset:{feedIndex:0,tileIndex:first.answer}}});
}else{
  page.onChoose({currentTarget:{dataset:{feedIndex:0,optionIndex:first.answer}}});
}
assert(page.data.feed[0].answered);
assert(page.data.feed[0].correct);
assert.strictEqual(page.data.totalAnswered,1);
assert.strictEqual(page.data.correctAnswered,1);
page.onToggleFavorite();assert(page.data.feed[0].favorite);
const shared=page.onShareAppMessage({target:{dataset:{questionId:first.id}}});
assert(shared.path.includes(first.id));
page.onSlideChange({detail:{current:1}});
assert.strictEqual(page.data.current,1);
assert.strictEqual(page.data.totalViewed,2);
page.onOpenStats();assert(page.data.showStats);page.onCloseStats();assert(!page.data.showStats);
page.onNext();page.onSlideChange({detail:{current:2}});
assert(page.data.totalViewed>=3);
assert((storage.brainbox_events_v1||[]).some(e=>e.event==='question_answered'));
console.log('PASS - 小程序页面：首屏、作答、收藏、分享、滑动、统计、事件记录');
