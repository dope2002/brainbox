const QUESTIONS = require('../../data/questions');
const engine = require('../../utils/engine');
const KEY = 'brainbox_state_v1';
const EVENT_KEY = 'brainbox_events_v1';
const ICONS = {
  '人文历史': '🏛️', '冷知识': '🪐', '脑洞急转弯': '💡', '逻辑推理': '🧩',
  '视觉观察': '👁️', '汉字语言': '🀄', '数字规律': '🔢', '世界百科': '🌏'
};
function safeGet(key, fallback) {
  try { return wx.getStorageSync(key) || fallback; } catch (err) { return fallback; }
}
function safePut(key, value) { try { wx.setStorageSync(key, value); } catch (err) { console.warn('storage failed', err); } }
function decorate(q, favorites) {
  return {
    ...q,
    uid: q.id + '_' + Date.now() + '_' + Math.round(Math.random()*10000),
    icon: ICONS[q.category] || '✨',
    optionLetters: ['A','B','C','D'],
    tiles: q.type === 'visual' ? q.tiles.map((label, id) => ({id, label})) : [],
    typeLabel: q.type === 'sequence' ? '排序挑战' : q.type === 'visual' ? '观察挑战' : '单选挑战',
    selected: -1, pickedOrder: [], marks: {}, answered: false, correct: false,
    feedbackTitle: '', solution: engine.solutionText(q),
    favorite: favorites.includes(q.id)
  };
}
Page({
  data: {
    feed: [], current: 0, totalAnswered: 0, correctAnswered: 0,
    totalViewed: 0, totalSkipped: 0, favoritesCount: 0,
    showStats: false, topPadding: 46, rightPadding: 20, topCategory: '暂无', totalQuestions: QUESTIONS.length
  },
  onLoad(options) {
    // 自定义导航栏避开微信状态栏及右上角胶囊按钮。
    const system = (typeof wx.getWindowInfo === 'function' && wx.getWindowInfo()) ||
      (typeof wx.getSystemInfoSync === 'function' && wx.getSystemInfoSync()) || {};
    const menu = typeof wx.getMenuButtonBoundingClientRect === 'function' ? wx.getMenuButtonBoundingClientRect() : null;
    const topPadding = (system.statusBarHeight || 20) + 12;
    const rightPadding = menu && system.windowWidth ? Math.max(20, system.windowWidth - menu.left + 10) : 20;
    this.setData({topPadding, rightPadding});
    this._state = safeGet(KEY, {answered:0, correct:0, viewed:0, skipped:0, favorites:[], categories:{}});
    if (!Array.isArray(this._state.favorites)) this._state.favorites = [];
    if (!this._state.categories) this._state.categories = {};
    this._events = safeGet(EVENT_KEY, []);
    this._used = new Set();
    this._lastCategories = [];
    this._enteredAt = Date.now();
    this._viewedSlides = new Set();
    this._skippedSlides = new Set();
    let feed = [];
    const requested = options.questionId && QUESTIONS.find(q => q.id === options.questionId);
    if (requested) { feed.push(decorate(requested, this._state.favorites)); this._used.add(requested.id); }
    feed = feed.concat(this._getNext(17));
    this.setData({feed, ...this._statsData()});
    this._trackView(0);
  },
  onHide() { this._persist(); },
  onUnload() { this._persist(); },
  _persist() { safePut(KEY, this._state); safePut(EVENT_KEY, this._events.slice(-400)); },
  _log(event, q, extra) {
    this._events.push({event, questionId:q.id, category:q.category, type:q.type, timestamp:Date.now(), ...extra});
    if (this._events.length > 500) this._events = this._events.slice(-400);
    this._persist();
  },
  _getNext(count) {
    let next = engine.makeFeed(QUESTIONS, count, [...this._used], this._lastCategories, this._state.categories);
    if (next.length < count) {
      // 每轮题库用尽后才允许重刷，避免反复刷出相同的题。
      const recent = [...this._used].slice(-5);
      this._used = new Set(recent);
      const more = engine.makeFeed(QUESTIONS, count-next.length, [...this._used, ...next.map(q=>q.id)],
        [...this._lastCategories, ...next.map(q=>q.category)].slice(-2), this._state.categories);
      next = next.concat(more);
    }
    next.forEach(q => { this._used.add(q.id); this._lastCategories.push(q.category); });
    this._lastCategories = this._lastCategories.slice(-2);
    return next.map(q => decorate(q, this._state.favorites));
  },
  _statsData() {
    const cats = this._state.categories;
    const rankings = Object.keys(cats).sort((a,b) => ((cats[b].answered||0)+(cats[b].favorited||0)*2) - ((cats[a].answered||0)+(cats[a].favorited||0)*2));
    return {
      totalAnswered: this._state.answered||0, correctAnswered: this._state.correct||0,
      totalViewed: this._state.viewed||0, totalSkipped: this._state.skipped||0,
      favoritesCount: this._state.favorites.length, topCategory: rankings[0]||'暂无'
    };
  },
  _touchCategory(category, key) {
    const m = this._state.categories[category] || {answered:0,favorited:0};
    m[key] = (m[key]||0)+1;
    this._state.categories[category] = m;
  },
  _trackView(index) {
    const q = this.data.feed[index];
    if (!q) return;
    this._enteredAt = Date.now();
    if (this._viewedSlides.has(q.uid)) return;
    this._viewedSlides.add(q.uid);
    this._state.viewed = (this._state.viewed||0)+1;
    this._log('question_viewed',q,{position:index});
    this.setData(this._statsData());
  },
  onSlideChange(e) {
    const target = e.detail.current;
    const previous = this.data.current;
    if (target === previous) return;
    const prevQ = this.data.feed[previous];
    if (prevQ && !prevQ.answered && !this._skippedSlides.has(prevQ.uid)) {
      this._skippedSlides.add(prevQ.uid);
      this._state.skipped = (this._state.skipped||0)+1;
      this._log('question_skipped',prevQ,{durationMs:Date.now()-this._enteredAt});
    }
    this.setData({current:target});
    if (this.data.feed.length - target < 7) {
      const additions = this._getNext(12);
      this.setData({feed:this.data.feed.concat(additions)});
    }
    this._trackView(target);
  },
  _complete(index, picked) {
    const q = this.data.feed[index];
    if (!q || q.answered) return;
    const correct = engine.isCorrect(q, picked);
    const feed = this.data.feed.slice();
    const updated = {...q, answered:true, correct, selected: typeof picked === 'number' ? picked : -1,
      pickedOrder:Array.isArray(picked) ? picked : q.pickedOrder,
      feedbackTitle:correct?'漂亮！答对了':'差一点，来看看答案'};
    feed[index] = updated;
    this._state.answered = (this._state.answered||0)+1;
    if (correct) this._state.correct = (this._state.correct||0)+1;
    this._touchCategory(q.category,'answered');
    this._log('question_answered',q,{correct,durationMs:Date.now()-this._enteredAt});
    this.setData({feed, ...this._statsData()});
  },
  onChoose(e) {
    const {feedIndex, optionIndex} = e.currentTarget.dataset;
    this._complete(Number(feedIndex),Number(optionIndex));
  },
  onVisual(e) {
    const {feedIndex, tileIndex} = e.currentTarget.dataset;
    this._complete(Number(feedIndex),Number(tileIndex));
  },
  onSequence(e) {
    const {feedIndex, optionIndex} = e.currentTarget.dataset;
    const index = Number(feedIndex), opt = Number(optionIndex);
    const q = this.data.feed[index];
    if (!q || q.answered || q.pickedOrder.includes(opt)) return;
    const order = q.pickedOrder.concat(opt);
    const marks = {...q.marks, [opt]:order.length};
    const feed = this.data.feed.slice();
    feed[index] = {...q,pickedOrder:order,marks};
    this.setData({feed});
    if (order.length === q.options.length) this._complete(index,order);
  },
  onResetSequence(e) {
    const index = Number(e.currentTarget.dataset.feedIndex);
    const q=this.data.feed[index];
    if (!q || q.answered) return;
    const feed=this.data.feed.slice(); feed[index]={...q,pickedOrder:[],marks:{}};
    this.setData({feed});
  },
  onNext() {
    const next = this.data.current+1;
    if (this.data.feed.length-next<7) {
      const additions=this._getNext(12);
      this.setData({feed:this.data.feed.concat(additions)});
    }
    // 通过同一入口处理按钮切题和手势切题；swiper 随后的 change 事件会自动去重。
    this.onSlideChange({detail:{current:next}});
  },
  onToggleFavorite() {
    const index=this.data.current;
    const q=this.data.feed[index]; if (!q) return;
    const all=this._state.favorites;
    const pos=all.indexOf(q.id);
    if (pos<0) {all.push(q.id);this._touchCategory(q.category,'favorited');this._log('question_favorited',q,{});}
    else {all.splice(pos,1);this._log('question_unfavorited',q,{});}
    const feed=this.data.feed.map(item => item.id===q.id ? {...item,favorite:pos<0} : item);
    this.setData({feed,...this._statsData()});
  },
  onOpenStats() {this.setData({showStats:true,...this._statsData()});},
  onCloseStats() {this.setData({showStats:false});},
  onFeedback() {
    const q=this.data.feed[this.data.current]; if(!q)return;
    wx.showActionSheet({itemList:['题目有错误','答案有争议','题目不够有趣'],success:(res)=>{
      const reasons=['题目有错误','答案有争议','题目不够有趣'];
      this._log('question_reported',q,{reason:reasons[res.tapIndex]});
      wx.showToast({title:'感谢反馈，已记在本机',icon:'none'});
    }});
  },
  noop() {},
  onShareAppMessage(res) {
    const dataset=(res.target&&res.target.dataset)||{};
    const q=this.data.feed.find(item=>item.id===dataset.questionId)||this.data.feed[this.data.current];
    if (q) this._log('question_shared',q,{});
    return {title:q ? '这道题你能答对吗？'+q.title : '奇有此理｜每一滑，都有新发现',path:'/pages/index/index'+(q?'?questionId='+q.id:'')};
  }
});
