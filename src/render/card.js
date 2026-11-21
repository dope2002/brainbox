const types = require('../interaction/types');

const colors = {
  paper:'#edf0e7', surface:'#f7f8f1', ink:'#253e38', muted:'#53695f', edge:'#b4c5b8',
  selected:'#dce7db', right:'#d9eadf', wrong:'#f2dfd9', rust:'#954b40', green:'#285849'
};
const categories = {
  history:'人文历史', trivia:'冷知识', riddle:'脑洞急转弯', logic:'逻辑推理', visual:'视觉观察',
  language:'汉字语言', number:'数字规律', world:'世界百科', literature:'文学', economics:'经济', classics:'经学', philosophy:'哲学'
};
const levels = { easy:'轻松', medium:'动脑', hard:'烧脑' };
const faces = {
  body:'"PingFang SC", "Microsoft YaHei", sans-serif',
  book:'"Songti SC", "STSong", "SimSun", serif'
};

function contains(rect, point) {
  return point.x >= rect.x && point.x < rect.x + rect.w && point.y >= rect.y && point.y < rect.y + rect.h;
}
function wrap(ctx, text, width) {
  const lines = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const char of paragraph) {
      if (line && ctx.measureText(line + char).width > width) {
        lines.push(line);
        line = '';
      }
      line += char;
    }
    lines.push(line);
  }
  return lines;
}

function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let view;
  function resize(next) {
    view = next;
    canvas.width = Math.round(view.width * view.pixelRatio);
    canvas.height = Math.round(view.height * view.pixelRatio);
    ctx.scale(canvas.width / view.width, canvas.height / view.height);
    ctx.textBaseline = 'top';
  }
  function font(size, family='body', bold=false) {
    ctx.font = (bold ? '700 ' : '400 ') + size + 'px ' + faces[family];
  }
  function label(text, x, y, color) {
    ctx.fillStyle=color;
    ctx.fillText(text,x,y);
  }
  function box(x,y,w,h,fill,stroke) {
    const r=7;
    ctx.beginPath();ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
    ctx.fillStyle=fill;ctx.fill();
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
  }

  // Measure once per adjacent question, answer change or resize. All coordinates
  // below are local to the reading area; drawing and picking share this model.
  function layout(q,state) {
    const safe=view.safeArea;
    const w=Math.min(480,safe.right-safe.left-36), x=safe.left+(safe.right-safe.left-w)/2;
    const top=Math.max(safe.top+45, (view.menu && view.menu.bottom || 0)+12);
    const bodyBottom=safe.bottom-12;
    const nodes=[], hits=[];
    let y=0;
    function paragraph(text,size,family,bold,color,lineHeight,indent=0) {
      font(size,family,bold);
      const lines=wrap(ctx,text,w-indent*2);
      nodes.push({type:'text',lines,x:x+indent,y,size,family,bold,color,lineHeight});
      y+=lines.length*lineHeight;
    }
    function tile(item,tx,ty,tw,th,lines) {
      const rect={x:tx,y:ty,w:tw,h:th};
      nodes.push({type:'tile',item,rect,lines});
      hits.push({kind:item.kind,id:item.id,rect});
    }
    function tiles(items,columns) {
      font(17);
      const gap=7;
      if(columns==='auto'){
        const half=(w-gap)/2;
        columns=items.every(item=>ctx.measureText(item.text).width<=half-52)?2:1;
      }
      const tw=(w-(columns-1)*gap)/columns;
      for(let i=0;i<items.length;i+=columns){
        const row=items.slice(i,i+columns);
        const lines=row.map(item=>wrap(ctx,item.text,tw-(item.prefix?48:24)));
        const th=Math.max(46,...lines.map(part=>part.length*23+14));
        row.forEach((item,j)=>tile(item,x+j*(tw+gap),y,tw,th,lines[j]));
        y+=th+gap;
      }
    }
    function scene(elements) {
      font(17);
      const cells=elements.map(el=>({el,lines:wrap(ctx,el.text,w*el.w-18)}));
      const sh=Math.max(140,...cells.map(({el,lines})=>(lines.length*23+18)/el.h));
      cells.forEach(({el,lines})=>tile(el,x+el.x*w,y+el.y*sh,el.w*w,el.h*sh,lines));
      y+=sh+7;
    }
    function promptStrip(tokens) {
      const gap = 8;
      const columns = Math.min(tokens.length, Math.max(1, Math.floor((w + gap) / 48)));
      const tokenWidth = Math.min(64, (w - (columns - 1) * gap) / columns);
      const fontSize = 26;
      font(fontSize, 'book', true);
      for (let i = 0; i < tokens.length; i += columns) {
        const row = tokens.slice(i, i + columns);
        const lines = row.map(token => wrap(ctx, token, tokenWidth - 12));
        const height = Math.max(55, ...lines.map(part => part.length * 30 + 14));
        const width = row.length * (tokenWidth + gap) - gap;
        row.forEach((token, j) => nodes.push({
          type: 'prompt',
          rect: { x: x + (w - width) / 2 + j * (tokenWidth + gap), y, w: tokenWidth, h: height },
          lines: lines[j],
          fontSize,
          placeholder: token === '？'
        }));
        y += height + gap;
      }
      y += 9;
    }
    paragraph(q.title,view.width<350?23:28,'book',true,colors.ink,view.width<350?32:38);
    y+=8;
    if(q.material){
      paragraph(q.material,16,'book',false,colors.ink,26,8);
      if(q.attribution)paragraph(q.attribution,13,'body',false,colors.muted,20,8);
      y+=10;
    }
    paragraph(q.instruction,16,'body',false,colors.muted,24);
    y+=14;
    if (q.promptTokens && q.promptTokens.length) promptStrip(q.promptTokens);
    types[q.interactionType].layout({tiles,scene},q,state);
    if(state.correct!==undefined){
      y+=5;
      paragraph(state.correct?'回答正确':'回答错误',15,'body',true,state.correct?colors.green:colors.rust,23);
      paragraph(q.explanation,15,'body',false,colors.ink,23);
    }
    const bodyTop=top+38, bodyHeight=Math.max(1,bodyBottom-bodyTop);
    return {q,nodes,hits,x,w,top,bodyTop,bodyBottom,bodyHeight,maxScroll:Math.max(0,y+8-bodyHeight)};
  }

  function draw(page,scroll,offset,drag) {
    const {q,x,w,bodyTop,bodyHeight}=page;
    ctx.save();
    ctx.translate(0,offset);
    ctx.beginPath();ctx.rect(0,0,view.width,view.height);ctx.clip();
    ctx.fillStyle=colors.paper;ctx.fillRect(0,0,view.width,view.height);
    const headerY=Math.max(view.safeArea.top+4,view.menu && view.menu.top || 0);
    font(22,'book',true);label('奇有此理',x,headerY,colors.ink);
    const metaY=page.top+8;
    font(13,'body',true);
    const category=categories[q.category] || q.category;
    label(category,x,metaY,colors.green);
    const cx=x+ctx.measureText(category).width+14;
    font(13);label(levels[q.difficulty] || q.difficulty,cx,metaY,colors.muted);
    ctx.fillStyle=colors.edge;
    ctx.fillRect(x,bodyTop-9,w,1);
    ctx.save();
    ctx.beginPath();ctx.rect(x-1,bodyTop,w+2,bodyHeight);ctx.clip();
    ctx.translate(0,bodyTop-scroll);
    for(const node of page.nodes) {
      if(node.type==='text'){
        font(node.size,node.family,node.bold);
        node.lines.forEach((line,i)=>{
          const yy=node.y+i*node.lineHeight;
          if(yy+node.lineHeight>scroll && yy<scroll+bodyHeight)label(line,node.x,yy,node.color);
        });
        continue;
      }
      const {rect:r,item,lines}=node;
      if(r.y+r.h<=scroll || r.y>=scroll+bodyHeight)continue;
      if (node.type === 'prompt') {
        box(r.x,r.y,r.w,r.h,node.placeholder ? colors.surface : colors.selected,colors.edge);
        font(node.fontSize,'book',true);
        lines.forEach((line,i)=>label(line,r.x+(r.w-ctx.measureText(line).width)/2,
          r.y+(r.h-lines.length*30)/2+2+i*30,node.placeholder ? colors.muted : colors.green));
        continue;
      }
      const tone=item.tone;
      box(r.x,r.y,r.w,r.h,colors[tone]||colors.surface,tone==='wrong'?colors.rust:colors.edge);
      if(item.prefix){
        font(12,'body',true);label(item.prefix,r.x+9,r.y+(r.h-15)/2,colors.muted);
      }
      font(17,'body');
      const start=r.x+(item.prefix?28:0), space=r.w-(item.prefix?28:0);
      lines.forEach((line,i)=>label(line,lines.length>1 ? start+8 : start+(space-ctx.measureText(line).width)/2,
        r.y+(r.h-lines.length*23)/2+2+i*23,colors.ink));
      if(tone==='right' || tone==='wrong'){
        font(11,'body',true);label(tone==='right'?'✓':'×',r.x+r.w-12,r.y+2,tone==='right'?colors.green:colors.rust);
      }
    }
    ctx.restore();
    if(page.maxScroll>0){
      const h=Math.max(13,bodyHeight*bodyHeight/(bodyHeight+page.maxScroll));
      ctx.fillStyle=colors.edge;
      ctx.fillRect(x+w+5,bodyTop+(bodyHeight-h)*scroll/page.maxScroll,2,h);
    }
    if(drag){
      font(15,'body',true);
      const text=q.payload.sources.find(item=>item.id===drag.id).text;
      const chipWidth=Math.min(w,ctx.measureText(text).width+24);
      const left=Math.max(x,Math.min(x+w-chipWidth,drag.point.x-chipWidth/2));
      const yy=Math.max(bodyTop,drag.point.y-40);
      box(left,yy,chipWidth,32,colors.selected,colors.green);
      label(wrap(ctx,text,chipWidth-16)[0],left+8,yy+6,colors.green);
    }
    ctx.restore();
  }

  function drawSwipeGuide({direction,travel}) {
    const safe = view.safeArea;
    const x = (safe.left + safe.right) / 2;
    const y = safe.top + (safe.bottom - safe.top) * 0.65;
    ctx.fillStyle = 'rgba(31, 53, 46, 0.26)';
    ctx.fillRect(0,0,view.width,view.height);
    box(x-77,y-66,154,132,colors.surface,colors.edge);

    // The moving dot represents the touch point. The track stays fixed
    // while the two question cards move behind the guide.
    const trackCenter = y-18;
    const trackEnd = trackCenter + direction * 25;
    ctx.beginPath();
    ctx.moveTo(x,trackCenter-direction*25);
    ctx.lineTo(x,trackEnd);
    ctx.moveTo(x-5,trackEnd-direction*5);
    ctx.lineTo(x,trackEnd);
    ctx.lineTo(x+5,trackEnd-direction*5);
    ctx.strokeStyle = colors.edge;
    ctx.lineWidth = 2;
    ctx.stroke();
    const touchY = trackCenter + direction * (travel * 40 - 20);
    ctx.beginPath();
    ctx.arc(x,touchY,12,0,Math.PI*2);
    ctx.fillStyle = colors.selected;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x,touchY,5,0,Math.PI*2);
    ctx.fillStyle = colors.green;
    ctx.fill();

    const instruction = direction < 0 ? '上滑换题' : '下滑回看';
    font(19,'body',true);
    label(instruction,x-ctx.measureText(instruction).width/2,y+26,colors.ink);
  }

  function hit(page,scroll,point) {
    if(point.y<page.bodyTop || point.y>=page.bodyBottom)return null;
    const local={x:point.x,y:point.y-page.bodyTop+scroll};
    return page.hits.find(item=>contains(item.rect,local)) || null;
  }
  return {resize,layout,draw,drawSwipeGuide,hit};
}
module.exports={createRenderer};
