const store = require('../../utils/store.js');
const { stripLeadingNumber, shuffle, getStatusBarHeight } = require('../../utils/util.js');

function svgIcon(paths, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">${paths.replace(/currentColor/g, color)}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const ICONS = {
  back: svgIcon('<path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>', '#14161A'),
  chevronDown: svgIcon('<path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>', '#9AA0AC'),
  check: svgIcon('<path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>', '#fff'),
  bulb: svgIcon('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.45 1.1 1.2 1.2 1.95V16h4.8v-.25c.1-.75.6-1.5 1.2-1.95A6 6 0 0 0 12 3z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>', '#fff'),
  emptyBook: svgIcon('<path d="M12 3l8 4v5c0 5-3.4 8.4-8 9-4.6-.6-8-4-8-9V7l8-4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9.5 12l1.8 1.8L15 10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>', '#9AA0AC')
};

const LETTERS = ['A', 'B', 'C', 'D'];

Page({
  data: {
    screen: 'list', // list | detail | select | quiz | done
    grouped: [],
    paperTitle: '',
    selectedPaper: null,
    items: [],
    selectItems: [],
    allChecked: false,
    selectedCount: 0,
    quizIndex: 0,
    quizTotal: 0,
    quizCorrectCount: 0,
    quizAnswered: false,
    quizPicked: null,
    currentQuizQuestion: null,
    quizProgressPct: 0,
    doneTotal: 0,
    doneCorrect: 0,
    donePct: 0,
    letters: LETTERS,
    icons: ICONS,
    statusBarHeight: 24
  },

  onShow() {
    if (!store.isLoggedIn() || !store.hasProfile()) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    this.setData({ screen: 'list', statusBarHeight: getStatusBarHeight() });
    this.refreshList();
  },

  refreshList() {
    this.setData({ grouped: store.getWrongBookGrouped() });
  },

  openPaper(e) {
    const key = e.currentTarget.dataset.key;
    this.selectedPaper = key;
    this.expandedKey = null;
    this.setData({ screen: 'detail', selectedPaper: key, paperTitle: store.getPaperMeta(key).title });
    this.refreshDetail();
  },

  refreshDetail() {
    const items = store.getWrongBookForPaper(this.selectedPaper).map((w) =>
      Object.assign({}, w, {
        displayStem: stripLeadingNumber(w.stem),
        expanded: w.key === this.expandedKey
      })
    );
    this.setData({ items });
  },

  toggleDetail(e) {
    const key = e.currentTarget.dataset.key;
    this.expandedKey = this.expandedKey === key ? null : key;
    this.refreshDetail();
  },

  backToList() {
    this.setData({ screen: 'list' });
    this.refreshList();
  },

  /* ---- select ---- */
  goToSelect() {
    this.selectedSet = new Set(store.getWrongBookForPaper(this.selectedPaper).map((w) => w.key));
    this.setData({ screen: 'select' });
    this.refreshSelect();
  },

  refreshSelect() {
    const filtered = store.getWrongBookForPaper(this.selectedPaper);
    const selectItems = filtered.map((w) =>
      Object.assign({}, w, {
        displayStem: stripLeadingNumber(w.stem),
        checked: this.selectedSet.has(w.key)
      })
    );
    const allChecked = filtered.length > 0 && filtered.every((w) => this.selectedSet.has(w.key));
    this.setData({ selectItems, allChecked, selectedCount: this.selectedSet.size });
  },

  toggleSelectOne(e) {
    const key = e.currentTarget.dataset.key;
    if (this.selectedSet.has(key)) this.selectedSet.delete(key);
    else this.selectedSet.add(key);
    this.refreshSelect();
  },

  toggleSelectAll() {
    const filtered = store.getWrongBookForPaper(this.selectedPaper);
    const allChecked = filtered.length > 0 && filtered.every((w) => this.selectedSet.has(w.key));
    if (allChecked) filtered.forEach((w) => this.selectedSet.delete(w.key));
    else filtered.forEach((w) => this.selectedSet.add(w.key));
    this.refreshSelect();
  },

  backToDetail() {
    this.setData({ screen: 'detail' });
    this.refreshDetail();
  },

  /* ---- quiz：跟练习模式一样即时反馈，答对立刻从错题本移除 ---- */
  startQuiz() {
    if (this.selectedSet.size === 0) return;
    const all = store.getWrongBook().filter((w) => this.selectedSet.has(w.key));
    this.quizQueue = shuffle(all).map((w) => Object.assign({}, w, { displayStem: stripLeadingNumber(w.stem) }));
    this.quizIndex = 0;
    this.quizCorrectCount = 0;
    this.setData({
      screen: 'quiz',
      quizIndex: 0,
      quizTotal: this.quizQueue.length,
      quizCorrectCount: 0,
      quizAnswered: false,
      quizPicked: null
    });
    this.updateQuizView();
  },

  updateQuizView() {
    this.setData({
      currentQuizQuestion: this.quizQueue[this.quizIndex],
      quizProgressPct: Math.round(((this.quizIndex + 1) / this.quizQueue.length) * 100)
    });
  },

  pickQuizAnswer(e) {
    if (this.data.quizAnswered) return;
    const letter = e.currentTarget.dataset.letter;
    const q = this.quizQueue[this.quizIndex];
    const isCorrect = letter === q.answer;
    store.recordAnswerStat(q.paperKey, isCorrect);
    if (isCorrect) {
      this.quizCorrectCount++;
      store.removeWrongBookEntry(q.key);
    }
    this.setData({
      quizAnswered: true,
      quizPicked: letter,
      quizCorrectCount: this.quizCorrectCount
    });
  },

  nextQuizQuestion() {
    if (!this.data.quizAnswered) return;
    if (this.quizIndex + 1 < this.quizQueue.length) {
      this.quizIndex++;
      this.setData({ quizIndex: this.quizIndex, quizAnswered: false, quizPicked: null });
      this.updateQuizView();
    } else {
      const total = this.quizQueue.length;
      const pct = total > 0 ? Math.round((this.quizCorrectCount / total) * 100) : 0;
      this.setData({ screen: 'done', doneTotal: total, doneCorrect: this.quizCorrectCount, donePct: pct });
    }
  },

  backToDetailFromDone() {
    this.setData({ screen: 'detail' });
    this.refreshDetail();
  }
});
