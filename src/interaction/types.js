// Each template produces its own hit regions. Input and judging use stable IDs.
function mark(state, selected, correct) {
  if (state.correct !== undefined) return correct ? 'right' : selected ? 'wrong' : '';
  return selected ? 'selected' : '';
}
const single = {
  layout(ui, q, s) {
    ui.tiles(q.payload.options.map((item, i) => ({
      ...item, prefix: String.fromCharCode(65 + i), kind: 'option',
      tone: mark(s, s.value === item.id, item.id === q.answer.correctOptionId)
    })), 'auto');
  },
  tap(s, hit) { if (hit.kind === 'option') s.value = hit.id; },
  ready: (s) => s.value !== undefined,
  judge: (q, s) => s.value === q.answer.correctOptionId
};
const odd = {
  layout(ui, q, s) {
    ui.tiles(q.payload.cells.map(item => ({
      ...item, kind: 'cell', tone: mark(s, s.value === item.id, item.id === q.answer.targetCellId)
    })), Math.sqrt(q.payload.cells.length));
  },
  tap(s, hit) { if (hit.kind === 'cell') s.value = hit.id; },
  ready: single.ready,
  judge: (q, s) => s.value === q.answer.targetCellId
};
const sequence = {
  layout(ui, q, s) {
    const order = s.order || [];
    ui.tiles(q.payload.items.map(item => {
      const pos = order.indexOf(item.id);
      return { ...item, kind: 'item', prefix: pos < 0 ? '·' : String(pos + 1),
        tone: mark(s, pos >= 0, pos >= 0 && q.answer.correctOrder[pos] === item.id) };
    }), 'auto');
    if (order.length && s.correct === undefined) ui.tiles([{ id:'undo', kind:'undo', text:'撤回上一步' }], 1);
  },
  tap(s, hit) {
    if (!s.order) s.order = [];
    if (hit.kind === 'undo') s.order.pop();
    if (hit.kind === 'item' && !s.order.includes(hit.id)) s.order.push(hit.id);
  },
  ready: (s, q) => s.order && s.order.length === q.payload.items.length,
  judge: (q, s) => s.order.every((id, i) => id === q.answer.correctOrder[i])
};
const target = {
  layout(ui, q, s) {
    ui.scene(q.payload.scene.elements.map(item => ({
      ...item, kind:'target', tone: mark(s, (s.ids || []).includes(item.id), q.answer.targetIds.includes(item.id))
    })));
  },
  tap(s, hit) {
    if (hit.kind !== 'target') return;
    if (!s.ids) s.ids = [];
    if (!s.ids.includes(hit.id)) s.ids.push(hit.id);
  },
  ready: (s,q) => s.ids && s.ids.length === q.answer.targetIds.length,
  judge: (q,s) => s.ids.every(id => q.answer.targetIds.includes(id))
};
const matching = {
  layout(ui, q, s) {
    const pairs = s.pairs || {};
    const columns = [];
    q.payload.sources.forEach((source, i) => {
      const dest = q.payload.targets[i];
      const paired = pairs[source.id];
      const linked = q.payload.sources.find(item => pairs[item.id] === dest.id);
      const letter = String.fromCharCode(65 + i);
      columns.push({ ...source, kind:'source', prefix:letter,
        tone: mark(s, s.active === source.id || !!paired, paired === q.answer.pairs[source.id]) });
      columns.push({ ...dest, kind:'destination',
        prefix: linked ? String.fromCharCode(65 + q.payload.sources.indexOf(linked)) : '·',
        tone: mark(s, !!linked, linked && q.answer.pairs[linked.id] === dest.id) });
    });
    ui.tiles(columns, 2);
  },
  tap(s, hit) {
    if (hit.kind === 'source') s.active = hit.id;
    if (hit.kind === 'destination' && s.active) this.drop(s, s.active, hit);
  },
  drop(s, sourceId, hit) {
    if (!hit || hit.kind !== 'destination') return;
    if (!s.pairs) s.pairs = {};
    for (const source of Object.keys(s.pairs)) {
      if (s.pairs[source] === hit.id) delete s.pairs[source];
    }
    s.pairs[sourceId] = hit.id;
    s.active = null;
  },
  ready: (s,q) => s.pairs && Object.keys(s.pairs).length === q.payload.sources.length,
  judge: (q,s) => q.payload.sources.every(({id}) => s.pairs[id] === q.answer.pairs[id])
};
module.exports = { single_choice:single, odd_one_out:odd, sequence, tap_target:target, drag_match:matching };
