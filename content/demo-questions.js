module.exports = [
  {
    id: 'demo_number_01',
    version: 1,
    status: 'draft',
    category: 'number',
    interactionType: 'single_choice',
    difficulty: 'easy',
    tags: ['pattern'],
    title: '下一项是什么？',
    instruction: '观察数列中的规律。',
    promptTokens: ['2', '5', '8', '11', '？'],
    payload: {
      options: [
        { id: 'a', text: '12' },
        { id: 'b', text: '13' },
        { id: 'c', text: '14' },
        { id: 'd', text: '15' }
      ]
    },
    answer: { correctOptionId: 'c' },
    explanation: '按每项加 3 的规律，11 后面是 14。'
  },
  {
    id: 'demo_logic_01',
    version: 1,
    status: 'draft',
    category: 'logic',
    interactionType: 'single_choice',
    difficulty: 'easy',
    tags: ['ordering'],
    title: '小满比阿禾高，阿禾比小岚高。谁最矮？',
    instruction: '请选择一个答案',
    payload: {
      options: [
        { id: 'a', text: '小满' },
        { id: 'b', text: '阿禾' },
        { id: 'c', text: '小岚' }
      ]
    },
    answer: { correctOptionId: 'c' },
    explanation: '从高到矮的顺序是小满、阿禾、小岚。'
  },
  {
    id: 'demo_language_01',
    version: 1,
    status: 'draft',
    category: 'language',
    interactionType: 'single_choice',
    difficulty: 'easy',
    tags: ['wordplay'],
    title: '「日」和「月」左右并排组成哪个字？',
    instruction: '从下方选出拼合后的字。',
    promptTokens: ['日', '月'],
    payload: {
      options: [
        { id: 'a', text: '明' },
        { id: 'b', text: '朋' },
        { id: 'c', text: '昌' }
      ]
    },
    answer: { correctOptionId: 'a' },
    explanation: '左边是日、右边是月，合起来是「明」。'
  }
].concat(require('./humanities'));
