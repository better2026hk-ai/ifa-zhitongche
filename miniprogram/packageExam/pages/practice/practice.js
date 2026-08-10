const store = require('../../../utils/store.js');
const { getStatusBarHeight, getMenuButtonGap } = require('../../../utils/util.js');

const CN_ORDER = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

function groupByChapter(questions) {
  const map = new Map();
  questions.forEach((q) => {
    if (!map.has(q.chapter)) map.set(q.chapter, { chapter: q.chapter, title: q.chapterTitle, items: [] });
    map.get(q.chapter).items.push(q);
  });
  const chapters = Array.from(map.values()).sort((a, b) => CN_ORDER[a.chapter] - CN_ORDER[b.chapter]);
  chapters.forEach((ch) => { ch.badgeLabel = `第${ch.chapter}章`; });
  // "全部章节"是个虚拟章节，把所有真实章节的题目按原顺序接起来——练完
  // 一章不想被锁在里面、想直接往下做的时候用。放在最后一个，不占用真实
  // 章节的下标（断点续练存的 chapterIdx 就不会因为这个而错位）。
  chapters.push({ chapter: '全部', badgeLabel: '全部章节', title: '全部章节', items: questions });
  return chapters;
}

function svgIcon(paths, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">${paths.replace(/currentColor/g, color)}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const ICONS = {
  back: svgIcon('<path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>', '#14161A'),
  next: svgIcon('<path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>', '#14161A'),
  chevronDown: svgIcon('<path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>', '#0B6B63'),
  check: svgIcon('<path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>', '#0B6B63'),
  bulb: svgIcon('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.45 1.1 1.2 1.2 1.95V16h4.8v-.25c.1-.75.6-1.5 1.2-1.95A6 6 0 0 0 12 3z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>', '#fff'),
  listDark: svgIcon('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>', '#14161A')
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
    currentChapterBadge: '',
    chapterTotal: 0,
    progressPct: 0,
    sheetVisible: false,
    navVisible: false,
    navCells: [],
    resumePromptVisible: false,
    resumeChapterLabel: '',
    letters: LETTERS,
    icons: ICONS,
    statusBarHeight: 24,
    menuGap: 0
  },

  async onLoad(options) {
    if (!store.isLoggedIn() || !(await store.hasProfile())) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.setData({ statusBarHeight: getStatusBarHeight(), menuGap: getMenuButtonGap() });
    const key = options.key;
    wx.showLoading({ title: '加载题库中', mask: true });
    let questions;
    let wrongList;
    let user;
    try {
      [questions, wrongList, user] = await Promise.all([
        store.fetchPracticeQuestions(key),
        store.fetchWrongBook(),
        store.fetchUserDoc()
      ]);
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '题库加载失败，请重试', icon: 'none' });
      wx.navigateBack();
      return;
    }
    wx.hideLoading();

    // 按题干反查这门科目当前的错题——章节练习一进来（或者切章节）就能
    // 准确显示"这题目前是错的"，不用等这次会话里重新答一遍才知道。
    this._wrongByStem = new Map();
    store.getWrongBookForPaper(wrongList, key).forEach((w) => this._wrongByStem.set(w.stem, w));

    const chapters = groupByChapter(questions);
    this.setData({
      paperKey: key,
      paperMeta: store.getPaperMeta(key),
      chapters,
      chapterIdx: 0,
      qIndex: 0,
      screen: 'question'
    });
    this.seedChapterAnswers(0);
    this.updateView();

    const saved = user && user.practiceProgress && user.practiceProgress[key];
    const savedChapter = saved && chapters[saved.chapterIdx];
    if (savedChapter && savedChapter.items[saved.qIndex] && (saved.chapterIdx !== 0 || saved.qIndex !== 0)) {
      this._savedProgress = saved;
      this.setData({
        resumePromptVisible: true,
        resumeChapterLabel: `${savedChapter.badgeLabel}第${saved.qIndex + 1}题`
      });
    }
  },

  resumeContinue() {
    const saved = this._savedProgress;
    this.setData({ resumePromptVisible: false });
    this.seedChapterAnswers(saved.chapterIdx);
    this.setData({ chapterIdx: saved.chapterIdx, qIndex: saved.qIndex });
    this.updateView();
  },

  // "重新开始"是"当这次练习没发生过"，本章目前显示成什么状态都清空
  // （包括进页面时按错题本提前标好的"这题目前是错的"标记）——那些题
  // 客观上确实还是错的，但重新开始这个动作本身就是想要一个干净的空白
  // 界面重新做一遍，不是去改错题本/统计数据（那些本来就不会因为"重新
  // 开始"而被清掉，答对了自然会从错题本消失，跟平时一样）。
  resumeRestart() {
    this.resetChapterAnswers();
    this.setData({ resumePromptVisible: false, qIndex: 0 });
    this.updateView();
    store.saveProgress(this.data.paperKey, 0, 0).catch(() => {});
  },

  // 当前章节每道题的作答情况，只在内存里存，不进 data——参考
  // wrongbook.js 里 this.selectedSet 的做法。
  resetChapterAnswers() {
    this.chapterAnswers = {};
  },

  // 进入一个"这次会话还没主动重新开始过"的章节时用这个——按错题本提前
  // 标好哪些题目前是错的，方便导航面板/重新打开这道题时准确显示状态，
  // 不用非得在本次会话里重新答一遍才知道。
  seedChapterAnswers(chapterIdx) {
    this.resetChapterAnswers();
    const ch = this.data.chapters[chapterIdx];
    ch.items.forEach((q, i) => {
      const w = this._wrongByStem.get(q.stem);
      if (w) this.chapterAnswers[i] = { picked: w.lastPicked, correct: false };
    });
  },

  updateView() {
    const { chapters, chapterIdx, qIndex } = this.data;
    const ch = chapters[chapterIdx];
    const q = ch.items[qIndex];
    const prior = this.chapterAnswers[qIndex];
    this.setData({
      currentChapterTitle: ch.title,
      currentChapterBadge: ch.badgeLabel,
      chapterTotal: ch.items.length,
      // 练习模式按章节顺序作答，原编号（"N. "）有意义要保留——只有跨章节
      // 随机抽题的模拟考试/错题本测验才需要去掉（文档 5.5 节）。
      currentQuestion: Object.assign({}, q, { displayStem: q.stem }),
      progressPct: Math.round(((qIndex + 1) / ch.items.length) * 100),
      answered: !!prior,
      picked: prior ? prior.picked : null
    });
  },

  pickAnswer(e) {
    if (this.data.answered) return;
    const letter = e.currentTarget.dataset.letter;
    const { chapterIdx, qIndex, paperKey } = this.data;
    const ch = this.data.chapters[chapterIdx];
    const q = ch.items[qIndex];
    const isCorrect = letter === q.answer;
    this.chapterAnswers[qIndex] = { picked: letter, correct: isCorrect };
    const toastFail = () => wx.showToast({ title: '网络异常，请重试', icon: 'none' });
    store.answerQuestion(paperKey, q, letter).catch(toastFail);
    this.setData({ answered: true, picked: letter });
  },

  // 题号导航/上一题/下一题按钮统一走这个方法——不再要求"当前题必须先
  // 作答才能离开"，跟模拟考试的导航自由度一致。
  goToQuestion(idx) {
    const ch = this.data.chapters[this.data.chapterIdx];
    if (idx < 0 || idx >= ch.items.length) return;
    this.setData({ qIndex: idx, navVisible: false });
    this.updateView();
    store.saveProgress(this.data.paperKey, this.data.chapterIdx, idx).catch(() => {});
  },

  prevQuestion() {
    this.goToQuestion(this.data.qIndex - 1);
  },

  nextQuestion() {
    const ch = this.data.chapters[this.data.chapterIdx];
    if (this.data.qIndex + 1 < ch.items.length) {
      this.goToQuestion(this.data.qIndex + 1);
    } else {
      this.setData({ screen: 'done' });
    }
  },

  toggleNavigator() {
    const ch = this.data.chapters[this.data.chapterIdx];
    const navCells = ch.items.map((q, i) => {
      const a = this.chapterAnswers[i];
      let state = 'blank';
      if (a) state = a.correct ? 'correct' : 'wrong';
      return { index: i, num: i + 1, state, current: i === this.data.qIndex };
    });
    this.setData({ navCells, navVisible: true });
  },

  closeNavigator() {
    this.setData({ navVisible: false });
  },

  onNavCellTap(e) {
    this.goToQuestion(Number(e.currentTarget.dataset.index));
  },

  // "重新练习本章"跟"重新开始"一样，是想要一张空白卷子重新做——不用
  // seedChapterAnswers 重新按错题本标错，不然点了"重新练习"这道题还是
  // 显示成已经答过/答错的颜色，看起来跟没点一样。
  restartChapter() {
    this.resetChapterAnswers();
    this.setData({ qIndex: 0, screen: 'question' });
    this.updateView();
    store.saveProgress(this.data.paperKey, this.data.chapterIdx, 0).catch(() => {});
  },

  switchChapter(e) {
    const idx = Number(e.currentTarget.dataset.index);
    this.seedChapterAnswers(idx);
    this.setData({
      chapterIdx: idx,
      qIndex: 0,
      sheetVisible: false,
      screen: 'question'
    });
    this.updateView();
    store.saveProgress(this.data.paperKey, idx, 0).catch(() => {});
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
