// 5 个考试科目的静态元数据。题量来自技术交接文档 3.1 节，题库文件见
// handoff/question-banks/。练习模式/模拟考试接入题库文件时会用到 key 对应关系。
const HOME_BANKS = [
  { key: 'p1', tag: 'Paper Ⅰ', title: '保险原理及实务', total: 913 },
  { key: 'p2', tag: 'Paper Ⅱ', title: '一般保险', total: 655 },
  { key: 'p3', tag: 'Paper Ⅲ', title: '长期保险', total: 930 },
  { key: 'p5', tag: 'Paper Ⅴ', title: '投资相连长期保险', total: 649 },
  { key: 'mpf', tag: 'MPF', title: '强制性公积金计划', total: 601 }
];

// 模拟考试规则（技术交接文档 3.2 节），写死常量，不需要存数据库。
const EXAM_CONFIG = {
  p1: { name: 'Paper Ⅰ · 保险原理及实务', durationMinutes: 120, totalQuestions: 75, passCount: 53 },
  p2: { name: 'Paper Ⅱ · 一般保险', durationMinutes: 75, totalQuestions: 50, passCount: 35 },
  p3: { name: 'Paper Ⅲ · 长期保险', durationMinutes: 75, totalQuestions: 50, passCount: 35 },
  p5: { name: 'Paper Ⅴ · 投资相连长期保险', durationMinutes: 120, totalQuestions: 80, passCount: 56 },
  mpf: { name: 'MPF · 强制性公积金计划', durationMinutes: 120, totalQuestions: 80, passCount: 56 }
};

module.exports = { HOME_BANKS, EXAM_CONFIG };
