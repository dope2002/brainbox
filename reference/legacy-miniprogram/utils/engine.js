/** 无外部依赖的内容推荐与判题逻辑。 */
function shuffle(input, rng) {
  const arr = input.slice();
  const random = rng || Math.random;
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}
function makeFeed(questions, count, exclusions, recentCategories, metrics, rng) {
  const random = rng || Math.random;
  const ignored = new Set(exclusions || []);
  const used = new Set();
  let recent = (recentCategories || []).slice(-2);
  const result = [];
  const pool = questions.filter(q => !ignored.has(q.id));
  const categoryMetrics = metrics || {};
  while (result.length < count && used.size < pool.length) {
    let available = pool.filter(q => !used.has(q.id) && !recent.includes(q.category));
    if (!available.length) available = pool.filter(q => !used.has(q.id) && q.category !== recent[recent.length - 1]);
    if (!available.length) available = pool.filter(q => !used.has(q.id));
    // 60% 倾向历史偏好，30% 跨类探索，10% 完全随机；冷启动均匀选类。
    const mode = random();
    const categories = [...new Set(available.map(q => q.category))];
    let category;
    if (mode < 0.6) {
      const weights = categories.map(c => {
        const m = categoryMetrics[c] || {};
        return 1 + Math.min(3, (m.answered || 0) * 0.15 + (m.favorited || 0) * 0.8);
      });
      const total = weights.reduce((a,b) => a + b, 0);
      let r = random() * total;
      category = categories[categories.length - 1];
      for (let i = 0; i < categories.length; i++) { r -= weights[i]; if (r <= 0) { category = categories[i]; break; } }
    } else if (mode < 0.9) {
      const sorted = categories.slice().sort((a,b) => ((categoryMetrics[a] && categoryMetrics[a].answered) || 0) - ((categoryMetrics[b] && categoryMetrics[b].answered) || 0));
      category = sorted[Math.floor(random() * Math.max(1, Math.ceil(sorted.length / 2)))];
    } else {
      category = categories[Math.floor(random() * categories.length)];
    }
    const choices = available.filter(q => q.category === category);
    const chosen = choices[Math.floor(random() * choices.length)];
    result.push(chosen);
    used.add(chosen.id);
    recent = [...recent, chosen.category].slice(-2);
  }
  return result;
}
function isCorrect(question, selected) {
  if (question.type === 'sequence') {
    return Array.isArray(selected) && selected.length === question.answer.length && selected.every((n,i) => n === question.answer[i]);
  }
  return selected === question.answer;
}
function solutionText(question) {
  if (question.type === 'sequence') return question.answer.map(i => question.options[i]).join(' → ');
  if (question.type === 'visual') return '第 ' + (question.answer + 1) + ' 格';
  return question.options[question.answer];
}
module.exports = {shuffle,makeFeed,isCorrect,solutionText};
