const store = require('../../../utils/store.js');
const { stripLeadingNumber, getStatusBarHeight } = require('../../../utils/util.js');
const BANKS = require('../../data/index.js');

const CN_ORDER = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

function groupByChapter(questions) {
  const map = new Map();
  questions.forEach((q) => {
    if (!map.has(q.chapter)) map.set(q.chapter, { chapter: q.chapter, title: q.chapter_title, items: [] });
    map.get(q.chapter).items.push(q);
  });
  return Array.from(map.values()).sort((a, b) => CN_ORDER[a.chapter] - CN_ORDER[b.chapter]);
}

function svgIcon(paths, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">${paths.replace(/currentColor/g, color)}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const ICONS = {
  back: svgIcon('<path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>', '#14161A'),
  chevronDown: svgIcon('<path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>', '#0B6B63'),
  check: svgIcon('<path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>', '#0B6B63'),
  bulb: svgIcon('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.45 1.1 1.2 1.2 1.95V16h4.8v-.25c.1-.75.6-1.5 1.2-1.95A6 6 0 0 0 12 3z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>', '#fff')
};

const LETTERS = ['A', 'B', 'C', 'D'];

Page({
  data: {
    screen: 'question', // question | done
    paperKey: '',
    paperMeta: { tag: '', title: '' },
    chapters: [],
    chapterIdx: 0,
    qIndex: 0,
    answered: false,
    picked: null,
    currentQuestion: null,
    currentChapterTitle: '',
    currentChapterNum: '',
    chapterTotal: 0,
    progressPct: 0,
    sheetVisible: false,
    letters: LETTERS,
    icons: ICONS,
    statusBarHeight: 24
  },

  async onLoad(options) {
    if (!store.isLoggedIn() || !(await store.hasProfile())) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.setData({ statusBarHeight: getStatusBarHeight() });
    const key = options.key;
    const chapters = groupByChapter(BANKS[key]);
    this.setData({
      paperKey: key,
      paperMeta: store.getPaperMeta(key),
      chapters,
      chapterIdx: 0,
      qIndex: 0,
      answered: false,
      picked: null,
      screen: 'question'
    });
    this.updateView();
  },

  updateView() {
    const { chapters, chapterIdx, qIndex } = this.data;
    const ch = chapters[chapterIdx];
    const q = ch.items[qIndex];
    this.setData({
      currentChapterTitle: ch.title,
      currentChapterNum: ch.chapter,
      chapterTotal: ch.items.length,
      currentQuestion: Object.assign({}, q, { displayStem: stripLeadingNumber(q.stem) }),
      progressPct: Math.round(((qIndex + 1) / ch.items.length) * 100)
    });
  },

  pickAnswer(e) {
    if (this.data.answered) return;
    const letter = e.currentTarget.dataset.letter;
    const ch = this.data.chapters[this.data.chapterIdx];
    const q = ch.items[this.data.qIndex];
    const toastFail = () => wx.showToast({ title: '网络异常，请重试', icon: 'none' });
    store.answerQuestion(this.data.paperKey, q, letter).catch(toastFail);
    this.setData({ answered: true, picked: letter });
  },

  nextQuestion() {
    if (!this.data.answered) return;
    const ch = this.data.chapters[this.data.chapterIdx];
    if (this.data.qIndex + 1 < ch.items.length) {
      this.setData({ qIndex: this.data.qIndex + 1, answered: false, picked: null });
      this.updateView();
    } else {
      this.setData({ screen: 'done' });
    }
  },

  restartChapter() {
    this.setData({ qIndex: 0, answered: false, picked: null, screen: 'question' });
    this.updateView();
  },

  switchChapter(e) {
    const idx = Number(e.currentTarget.dataset.index);
    this.setData({
      chapterIdx: idx,
      qIndex: 0,
      answered: false,
      picked: null,
      sheetVisible: false,
      screen: 'question'
    });
    this.updateView();
  },

  toggleSheet() {
    this.setData({ sheetVisible: true });
  },

  closeSheet() {
    this.setData({ sheetVisible: false });
  },

  exitPractice() {
    wx.navigateBack();
  }
});
