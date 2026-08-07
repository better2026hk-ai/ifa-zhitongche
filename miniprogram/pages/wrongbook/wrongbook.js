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

  async onShow() {
    if (!store.isLoggedIn() || !(await store.hasProfile())) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    this.setData({ screen: 'list', statusBarHeight: getStatusBarHeight() });
    this.syncTabBarVisibility();
    this.refreshList();
  },

  // 详情/选题/测验这几个子屏幕跟列表页是同一个 tab 路由，不像模拟考试/练习
  // 模式那样天然没有 tabBar；这几个屏幕自己有底部按钮，得手动把 tabBar 藏起来，
  // 不然会被挡住点不到（错题本详情页的"组一次错题测验"就是这么被挡住的）。
  syncTabBarVisibility() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ hidden: this.data.screen !== 'list' });
    }
  },

  async refreshList() {
    const list = await store.fetchWrongBook();
    this.setData({ grouped: store.getWrongBookGrouped(list) });
  },

  async openPaper(e) {
    const key = e.currentTarget.dataset.key;
    this.selectedPaper = key;
    this.expandedKey = null;
    this.setData({ screen: 'detail', selectedPaper: key, paperTitle: store.getPaperMeta(key).title });
    this.syncTabBarVisibility();
    await this.refreshDetail();
  },

  // 详情/选题这两屏进入时各拉一次全量列表并按科目筛出来缓存在 this._detailItems /
  // this._selectFiltered 上——同一屏内展开/勾选这类高频交互直接用缓存同步渲染，
  // 不用每点一次都发一次网络请求；离开这两屏（返回列表/交完测验）会重新拉一次。
  async refreshDetail() {
    const list = await store.fetchWrongBook();
    this._detailItems = store.getWrongBookForPaper(list, this.selectedPaper);
    this.renderDetail();
  },

  renderDetail() {
    const items = this._detailItems.map((w) =>
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
    this.renderDetail();
  },

  backToList() {
    this.setData({ screen: 'list' });
    this.syncTabBarVisibility();
    this.refreshList();
  },

  /* ---- select ---- */
  async goToSelect() {
    const list = await store.fetchWrongBook();
    this._selectFiltered = store.getWrongBookForPaper(list, this.selectedPaper);
    this.selectedSet = new Set(this._selectFiltered.map((w) => w.key));
    this.setData({ screen: 'select' });
    this.syncTabBarVisibility();
    this.refreshSelect();
  },

  refreshSelect() {
    const filtered = this._selectFiltered;
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
    const filtered = this._selectFiltered;
    const allChecked = filtered.length > 0 && filtered.every((w) => this.selectedSet.has(w.key));
    if (allChecked) filtered.forEach((w) => this.selectedSet.delete(w.key));
    else filtered.forEach((w) => this.selectedSet.add(w.key));
    this.refreshSelect();
  },

  backToDetail() {
    this.setData({ screen: 'detail' });
    this.syncTabBarVisibility();
    this.refreshDetail();
  },

  /* ---- quiz：跟练习模式一样即时反馈，答对立刻从错题本移除 ---- */
  startQuiz() {
    if (this.selectedSet.size === 0) return;
    const all = this._selectFiltered.filter((w) => this.selectedSet.has(w.key));
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
    this.syncTabBarVisibility();
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
    const toastFail = () => wx.showToast({ title: '网络异常，请重试', icon: 'none' });
    store.recordAnswerStat(q.paperKey, isCorrect).catch(toastFail);
    if (isCorrect) {
      this.quizCorrectCount++;
      store.removeWrongBookEntry(q.key).catch(toastFail);
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
    this.syncTabBarVisibility();
    this.refreshDetail();
  }
});
