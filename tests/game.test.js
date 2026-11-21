const assert = require('assert');
const config = require('../project.config.json');
const questions = require('../content/demo-questions');
const { storageKey } = require('../src/app/swipe-guide');

const calls = {};
const listeners = {};
const storage = new Map();
let text = [];
let clock = 0, nextFrame = 0;
const scheduled = new Map();
Date.now = () => clock;
global.requestAnimationFrame = callback => {scheduled.set(++nextFrame,callback);return nextFrame;};
global.cancelAnimationFrame = id => scheduled.delete(id);
function advanceFrames(count) {
  for (let i=0;scheduled.size && i<count;i++) {
    clock+=16;
    const callbacks=[...scheduled.values()];scheduled.clear();callbacks.forEach(fn=>fn());
  }
}
function settleFrames() {
  advanceFrames(25);
  assert.strictEqual(scheduled.size,0,'idle pages must not request frames');
}
let tx=0,ty=0,clipTop=-Infinity,clipBottom=Infinity,pathRect=null;
const stack=[];
let backgrounds=[];
let metrics = {
  windowWidth: 390,
  windowHeight: 844,
  pixelRatio: 3,
  safeArea: { left: 0, top: 47, right: 390, bottom: 810 }
};
const ctx = {
  scale(x, y) { this.lastScale = [x, y]; },
  fillRect(x, y, width, height) {
    if (x === 0 && y === 0 && width === metrics.windowWidth && height === metrics.windowHeight &&
        this.fillStyle === '#edf0e7') {
      if(ty===0 || !backgrounds.length){text=[];backgrounds=[];}
      backgrounds.push(ty);
    }
  },
  measureText(value) {
    const size = Number(this.font.match(/(\d+)px/)[1]);
    return { width: [...value].reduce((total, char) => total + size * (char.charCodeAt(0) < 128 ? 0.55 : 1), 0) };
  },
  fillText(value, x, y) {
    if(y+ty>=clipTop && y+ty<clipBottom) text.push({value,x:x+tx,y:y+ty});
  },
  save(){stack.push([tx,ty,clipTop,clipBottom,this.font]);},
  restore(){[tx,ty,clipTop,clipBottom,this.font]=stack.pop();},
  translate(dx,dy){tx+=dx;ty+=dy;},
  rect(x,y,w,h){pathRect=[y+ty,y+ty+h];},
  clip(){clipTop=Math.max(clipTop,pathRect[0]);clipBottom=Math.min(clipBottom,pathRect[1]);},
  arc(){},
  beginPath() {},
  moveTo() {},
  lineTo() {},
  arcTo() {},
  closePath() {},
  fill() {},
  stroke() {}
};
const canvas = { getContext: () => ctx };
global.wx = {
  createCanvas: () => canvas,
  getStorageSync: key => storage.get(key),
  setStorageSync: (key,value) => storage.set(key,value),
  getWindowInfo: () => metrics,
  getMenuButtonBoundingClientRect: () => ({ top: 53, bottom: 85 })
};
for (const event of ['TouchStart', 'TouchMove', 'TouchEnd', 'TouchCancel', 'Hide', 'Show', 'WindowResize']) {
  listeners[event] = [];
  global.wx['on' + event] = handler => listeners[event].push(handler);
  calls[event] = (...args) => listeners[event].forEach(handler => handler(...args));
}
function resetListeners() {
  for (const event of Object.keys(listeners)) listeners[event] = [];
}

function point(x, y, identifier = 1) {
  return { identifier, clientX: x, clientY: y };
}

function emit(event, ...touches) {
  calls['Touch' + event]({ changedTouches: touches });
}

function gesture(from, to) {
  emit('Start', from);
  emit('End', to);
  settleFrames();
}

function rendered(value) {
  return text.find(item => item.value === value);
}

function optionPoint(value) {
  const label = rendered(value);
  assert(label, 'Missing option text: ' + value + ' in ' + text.map(item=>item.value).join(' | '));
  return point(label.x + 4, label.y + 8);
}

const up = [point(170, 450), point(170, 345)];
const down = [...up].reverse();

assert.strictEqual(config.compileType, 'game');
assert.strictEqual(require('../game.json').deviceOrientation, 'portrait');
assert(questions.every(question => question.status === 'draft'));
require('../game');
assert.strictEqual(canvas.width, 1170);
assert.strictEqual(canvas.height, 2532);
assert.deepStrictEqual(ctx.lastScale, [3, 3]);
assert(rendered('奇有此理'));
assert(rendered('下一项是什么？'));
assert(['2', '5', '8', '11', '？'].every(rendered));
assert(rendered('上滑换题') && !storage.has(storageKey));
advanceFrames(34);
assert(backgrounds.some(y => y < 0) && backgrounds.some(y => y > 0),'guide moves both cards');
calls.Hide();
assert.strictEqual(scheduled.size,0);
assert(!storage.has(storageKey));
calls.Show();
assert(rendered('上滑换题'));
advanceFrames(100);
assert(rendered('下滑回看'));
assert(rendered('逻辑推理'));
advanceFrames(100);
assert.strictEqual(scheduled.size,0);
assert(rendered('下一项是什么？'));
assert(!rendered('上滑换题') && !rendered('下滑回看'));
assert.strictEqual(storage.get(storageKey),true);
assert(!text.some(({value}) => /\d+\s+\/\s+\d+/.test(value)));
gesture(point(337,788),point(337,788));
assert(rendered('下一项是什么？'),'old footer locations do not change the question');

// A cancelled gesture and a drag returning to the same place are never submissions.
const correct = optionPoint('14');
emit('Start', correct);
emit('Cancel', correct);
emit('End', correct);
assert(!rendered('回答正确'));
emit('Start', correct);
emit('Move', point(correct.clientX + 35, correct.clientY));
emit('End', correct);
assert(!rendered('回答正确'));

// Horizontal and short gestures leave the card in place.
gesture(point(170, 430), point(240, 365));
gesture(point(170, 430), point(170, 375));
assert(rendered('下一项是什么？'));

// Wrong submission shows feedback and is locked against further taps.
const wrong = optionPoint('12');
gesture(wrong, wrong);
assert(rendered('回答错误'));
gesture(correct, correct);
assert(rendered('回答错误'));
assert(!rendered('回答正确'));

// Two unanswered cards can be visited, then the first card can be revisited.
gesture(...up);
assert(rendered('逻辑推理'));
assert(rendered('轻松'));
gesture(...up);
assert(rendered('汉字语言'));
assert(rendered('轻松'));
assert(rendered('日') && rendered('月'));
const languageAnswer = optionPoint('明');
gesture(languageAnswer, languageAnswer);
assert(rendered('回答正确'));
gesture(...down);
assert(!rendered('回答错误'));
assert(!rendered('回答正确'));
gesture(...down);
assert(rendered('回答错误'));
assert(rendered('按每项加 3 的规律，11 后面是 14。'));

// Backgrounding cancels an in-flight touch; resize keeps answer state and DPR.
emit('Start', up[0]);
calls.Hide();
calls.Show();
emit('End', up[1]);
assert(rendered('下一项是什么？'));
metrics = {
  windowWidth: 320,
  windowHeight: 568,
  pixelRatio: 2,
  safeArea: { left: 0, top: 20, right: 320, bottom: 568 }
};
calls.WindowResize();
assert.strictEqual(canvas.width, 640);
assert.strictEqual(canvas.height, 1136);
assert(rendered('回答错误'));
assert(text.every(({ x, y }) => x >= 0 && y >= 0 && x < 320 && y < 568));
console.log('PASS - 微信小游戏入口、高清画布、点选判题、上下滑、回看及前后台恢复');

function tap(label) {
  const pos=optionPoint(label);gesture(pos,pos);
}
function edgeSwipe(direction) {
  const nearBottom=point(5,metrics.windowHeight*0.72);
  const nearTop=point(5,metrics.windowHeight*0.45);
  gesture(direction>0?nearBottom:nearTop,direction>0?nearTop:nearBottom);
}
function advance(){edgeSwipe(1);}
advance();advance();advance();
assert(rendered('文学'));
assert(!rendered('？'), 'text-only material must not inherit a previous figure');
emit('Start',point(150,450));emit('Move',point(150,155));emit('End',point(150,155));
assert(rendered('文学'),'reading a passage must not advance the feed');
tap('A');
assert(rendered('回答正确'));
advance();assert(rendered('人文历史'));
tap('光绪八年 · 1882');tap('撤回上一步');tap('道光二十年 · 1840');
tap('咸丰十年 · 1860');tap('光绪八年 · 1882');
assert(rendered('回答正确'));
advance();assert(rendered('经济'));
const rent=optionPoint('店铺月租'), fixed=optionPoint('固定成本');
emit('Start',rent);emit('Move',fixed);emit('End',fixed);
assert(rendered('经济'),'dragging to the second row must not page the feed');
tap('单盒包装');tap('变动成本');
assert(rendered('回答正确'));
advance();tap('所以，丙属于乙');assert(rendered('回答正确'));
advance();tap('未');assert(rendered('回答正确'));
edgeSwipe(-1);assert(rendered('哲学'));assert(rendered('回答正确'));
console.log('PASS - 小屏长材料、历史排序撤回、跨行拖拽与点选配对、点目标、方阵、回看');

// A large synthetic pool exercises reachability and lazy layout independently
// of editorial review or the number of distinct production questions.
const {startGame}=require('../src/app/game');
const {createWechatPlatform}=require('../src/platform/wechat');
let canvases=0;
global.wx.createCanvas=()=>{canvases++;return canvas;};
const accessed=new Set();
const synthetic=Array.from({length:300},(_,index)=>{
  const template=questions[index%questions.length];
  return {...template,id:'stress_'+index,get title(){accessed.add(index);return template.title;}};
});
resetListeners();
startGame(createWechatPlatform(global.wx),synthetic);
assert.strictEqual(accessed.size,1,'only the visible page should be measured on launch');
assert(!rendered('上滑换题') && !rendered('下滑回看'),'the guide is skipped on later launches');
tap('14');
for(let i=1;i<synthetic.length;i++){
  advance();
  assert(accessed.has(i),'must reach question '+i);
}
assert(rendered('汉字语言'));assert.equal(canvases,1);
assert.equal(accessed.size,300);
advance();
assert(rendered('汉字语言'),'last question does not overrun the feed');
for(let i=299;i>0;i--)edgeSwipe(-1);
assert(rendered('下一项是什么？'));assert(rendered('回答正确'));
// A real move must reveal the neighboring page before release. A short,
// deliberate drag returns to the same question.
backgrounds=[];
emit('Start',point(120,240));clock+=200;emit('Move',point(120,200));
assert.deepStrictEqual(backgrounds,[-40,528],'current and next pages move together');
emit('End',point(120,200));settleFrames();assert(rendered('下一项是什么？'));
console.log('PASS - 300 张合成题卡往返、首屏按需布局、单画布、回看状态与短拖回弹');

const {createRenderer}=require('../src/render/card');
const small=createRenderer(canvas);
small.resize(createWechatPlatform(global.wx).viewport());
const odd=questions.find(q=>q.interactionType==='odd_one_out');
const cells=Array.from({length:25},(_,i)=>({id:String(i),text:i===24?'未':'末'}));
const grid=small.layout({...odd,payload:{cells},answer:{targetCellId:'24'}},{});
assert.strictEqual(grid.hits.length,25);
for(const {rect,id} of grid.hits) {
  assert(rect.w>=44 && rect.h>=44,'5×5 targets on a 320px screen');
  assert.strictEqual(small.hit(grid,0,{x:rect.x+rect.w/2,y:grid.bodyTop+rect.y+rect.h/2}).id,id);
}
const longChoice={...questions[0],title:'长题干'.repeat(24),explanation:'这是多段解析。\n'.repeat(16)};
const reading=small.layout(longChoice,{value:'c',correct:true});
assert(reading.maxScroll>0,'long text can scroll');
assert(!grid.nodes.some(node=>node.type==='prompt'),'the playable grid is the visual');
const figure=small.layout(questions[0],{});
const tokens=figure.nodes.filter(node=>node.type==='prompt');
assert.deepStrictEqual(tokens.map(node=>node.lines.join('')),questions[0].promptTokens);
assert.strictEqual(figure.hits.length,questions[0].payload.options.length,'clue tiles are not answer targets');
const last=reading.nodes[reading.nodes.length-1];
assert(last.y+last.lines.length*last.lineHeight-reading.maxScroll<=reading.bodyHeight);
console.log('PASS - 5×5 网格命中、长题干和多段解析可读到底');

resetListeners();
storage.clear();
startGame(createWechatPlatform(global.wx),questions);
tap('14');
assert(storage.get(storageKey) && !rendered('上滑换题'));
assert(!rendered('回答正确'),'the touch that dismisses the guide does not answer');
tap('14');
assert(rendered('回答正确'));
console.log('PASS - 首次上滑下滑教学、后台恢复、仅播放一次、触摸跳过且不误答');
