// Original development fixtures. Disciplines and interaction templates vary independently.
const common = { version:1, status:'draft', difficulty:'medium' };
module.exports = [
  {
    ...common, id:'demo_literature_01', category:'literature', interactionType:'single_choice',
    tags:['narration'], title:'这段文字从谁的视角展开？',
    material:'我到渡口时，雾还没有散。卖茶的人把两只杯子倒扣在桌上，又把其中一只翻过来。我以为他在等客人，便坐在对岸也能望见的位置。\n船靠岸了。他没有迎上去，只把那只空杯往前推了一寸。那时我才发觉，自己根本不知道他在等谁。',
    instruction:'结合叙述者能够知道的信息，选择最贴切的一项。',
    payload:{options:[
      {id:'a',text:'渡口旁观者的第一人称有限视角'},
      {id:'b',text:'能够直接了解每个人内心的全知视角'},
      {id:'c',text:'卖茶人回顾往事的第一人称视角'}]},
    answer:{correctOptionId:'a'}, explanation:'读者跟着「我」观察动作和修正猜测，只能知道「我」所见所想。'
  },
  {
    ...common,id:'demo_history_01', category:'history', interactionType:'sequence', tags:['年代'],
    title:'把三份档案按年代排列', instruction:'从早到晚依次点选，可撤回上一步。',
    payload:{items:[{id:'c',text:'光绪八年 · 1882'},{id:'a',text:'道光二十年 · 1840'},{id:'b',text:'咸丰十年 · 1860'}]},
    answer:{correctOrder:['a','b','c']}, explanation:'对照题面所给的公元年份，1840、1860、1882 依次递增。'
  },
  {
    ...common,id:'demo_economics_01', category:'economics',interactionType:'drag_match',tags:['成本'],
    title:'把支出归入对应类别',instruction:'将左栏拖到右栏，也可依次点两栏。按本月合同判断。',
    material:'一家小店每月租金固定，每售出一盒点心就消耗一份包装。',
    payload:{sources:[{id:'rent',text:'店铺月租'},{id:'box',text:'单盒包装'}],
      targets:[{id:'variable',text:'变动成本'},{id:'fixed',text:'固定成本'}]},
    answer:{pairs:{rent:'fixed',box:'variable'}}, explanation:'在题设的本月经营范围内，包装总支出随销量变化，月租总额固定。'
  },
  {
    ...common,id:'demo_philosophy_01',category:'philosophy',interactionType:'tap_target',tags:['论证'],
    title:'点出论证的结论',instruction:'在论证图中点选由其余陈述支持的那一句。',
    payload:{scene:{elements:[
      {id:'rule',text:'所有甲都是乙',x:0,y:0,w:0.48,h:0.42},
      {id:'case',text:'丙属于甲',x:0.52,y:0,w:0.48,h:0.42},
      {id:'result',text:'所以，丙属于乙',x:0.19,y:0.58,w:0.62,h:0.42}]}},
    answer:{targetIds:['result']}, explanation:'前两句给出前提，由它们可以推出「丙属于乙」。'
  },
  {
    ...common,id:'demo_visual_01',category:'visual',interactionType:'odd_one_out',tags:['字形'],
    title:'哪一格的字不同？',instruction:'在方阵中找出唯一的「未」。',
    payload:{cells:Array.from({length:16},(_,i)=>({id:'cell'+i,text:i===10?'未':'末'}))},
    answer:{targetCellId:'cell10'},explanation:'第三行第三列是「未」，它的上横比下横短。'
  },
  {
    ...common,id:'demo_classics_01',category:'classics',interactionType:'single_choice',tags:['原典','释义'],
    title:'哪一句谈到与友人相聚？',
    material:'学而时习之，不亦说乎？\n有朋自远方来，不亦乐乎？\n人不知而不愠，不亦君子乎？',
    attribution:'《论语·学而》',
    instruction:'阅读原文，选出最直接对应的一句。',
    payload:{options:[{id:'study',text:'学而时习之'},{id:'friends',text:'有朋自远方来'},{id:'patience',text:'人不知而不愠'}]},
    answer:{correctOptionId:'friends'},explanation:'「朋」和「自远方来」点明了友人来访。'
  }
];
