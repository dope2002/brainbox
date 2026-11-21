const {createGestureInput}=require('../input/gesture');
const {storageKey,guideFrame}=require('./swipe-guide');
const {createRenderer}=require('../render/card');
const types=require('../interaction/types');

function startGame(platform,questions) {
  if(!questions.length)throw new Error('题库为空');
  const renderer=createRenderer(platform.createCanvas());
  const states=new Map(), layouts=new Map();
  let index=0, offset=0, finger=null, frame=null, view;
  let scrollOrigin=0, source=null, startedAt=0;
  let showGuide=questions.length>1 && !platform.getStorage(storageKey);

  function state(i) {return states.get(i) || {};}
  function change(i) {
    if(!states.has(i))states.set(i,{});
    return states.get(i);
  }
  function page(i) {
    if(!layouts.has(i))layouts.set(i,renderer.layout(questions[i],state(i)));
    return layouts.get(i);
  }
  function drawPage(i,dy,ghost) {
    const p=page(i);
    renderer.draw(p,Math.min(state(i).scroll||0,p.maxScroll),dy,ghost);
  }
  function drawFeed(active, shift, drag) {
    drawPage(active,shift,drag);
    const neighbor=active-Math.sign(shift);
    if(shift && neighbor>=0 && neighbor<questions.length){
      drawPage(neighbor,shift-Math.sign(shift)*view.height,null);
    }
  }
  function draw() {
    drawFeed(index,offset,finger);
  }
  function stop() {
    if(frame!==null)platform.cancelFrame(frame);
    frame=null;finger=null;offset=0;source=null;
  }
  function dismissGuide() {
    stop();
    showGuide=false;
    platform.setStorage(storageKey,true);
    draw();
  }
  function playGuide() {
    const since=platform.now();
    function tick() {
      const scene=guideFrame(platform.now()-since);
      if(!scene){dismissGuide();return;}
      drawFeed(scene.index,scene.direction*scene.travel*view.height,null);
      renderer.drawSwipeGuide(scene);
      frame=platform.requestFrame(tick);
    }
    tick();
  }
  function settle(direction) {
    const next=index+direction;
    if(next<0 || next>=questions.length)direction=0;
    const start=offset, target=-direction*view.height;
    const since=platform.now();
    function finish() {
      index+=direction;offset=0;frame=null;
      for(const key of layouts.keys())if(Math.abs(key-index)>1)layouts.delete(key);
      draw();
    }
    if(start===target){finish();return;}
    function animate() {
      const progress=Math.min(1,(platform.now()-since)/210);
      if(progress>=1){finish();return;}
      offset=target+(start-target)*Math.pow(1-progress,3);
      draw();frame=platform.requestFrame(animate);
    }
    frame=platform.requestFrame(animate);
  }
  function pick(point) {
    const p=page(index);
    return renderer.hit(p,Math.min(state(index).scroll||0,p.maxScroll),point);
  }
  function apply(action) {
    const q=questions[index], type=types[q.interactionType], s=change(index);
    action(type,s);
    if(type.ready(s,q))s.correct=Boolean(type.judge(q,s));
    layouts.delete(index);
    if(s.correct!==undefined)s.scroll=page(index).maxScroll;
    draw();
  }
  const input=createGestureInput(platform,{
    begin(point) {
      if(showGuide){dismissGuide();return 'busy';}
      if(frame!==null)return 'busy';
      const p=page(index), hit=pick(point);
      scrollOrigin=Math.min(state(index).scroll||0,p.maxScroll);
      startedAt=platform.now();
      if(hit && hit.kind==='source' && state(index).correct===undefined){
        source=hit.id;return 'drag';
      }
      if(p.maxScroll>0 && point.x>=p.x && point.x<p.x+p.w &&
        point.y>=p.bodyTop && point.y<p.bodyBottom)return 'read';
      return 'feed';
    },
    move(mode,point,dx,dy) {
      if(mode==='busy')return;
      if(mode==='drag'){finger={id:source,point};}
      if(mode==='read'){
        change(index).scroll=Math.max(0,Math.min(page(index).maxScroll,scrollOrigin-dy));
      }
      if(mode==='feed'){
        if(Math.abs(dy)<=1.3*Math.abs(dx))return;
        offset=Math.max(index+1<questions.length?-view.height:0,Math.min(index>0?view.height:0,dy));
      }
      draw();
    },
    end(mode,origin,end,dx,dy,tap) {
      if(mode==='busy')return;
      const startHit=pick(origin), endHit=pick(end);
      finger=null;
      if(tap && startHit && endHit && startHit.kind===endHit.kind && startHit.id===endHit.id){
        if(state(index).correct===undefined)apply((type,s)=>type.tap(s,endHit));
      }else if(!tap && mode==='drag' && endHit && endHit.kind==='destination'){
        apply((type,s)=>type.drop(s,source,endHit));
      }else if(mode==='feed'){
        const fast=Math.abs(dy)>24 && Math.abs(dy)/Math.max(1,platform.now()-startedAt)>.65;
        const flip=Math.abs(dy)>Math.abs(dx)*1.3 && (Math.abs(dy)>=60 || (fast && offset!==0));
        settle(flip?-Math.sign(dy):0);
      }
      source=null;
      draw();
    },
    cancel(){stop();draw();}
  });
  function refresh(){
    input.cancel();stop();
    view=platform.viewport();renderer.resize(view);layouts.clear();
    if(showGuide)playGuide();
    else draw();
  }
  platform.onHide(stop);
  platform.onResize(refresh);platform.onShow(refresh);refresh();
}
module.exports={startGame};
