const store = require('../../../utils/store.js');
const { EXAM_CONFIG } = require('../../../utils/banks.js');
const { stripLeadingNumber, shuffle, fmtTime, getStatusBarHeight } = require('../../../utils/util.js');
const BANKS = require('../../data/index.js');

function svgIcon(paths, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">${paths.replace(/currentColor/g, color)}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const ICONS = {
  back: svgIcon('<path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>', '#14161A'),
  next: svgIcon('<path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>', '#14161A'),
  clock: svgIcon('<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v5l3.5 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>', '#0B6B63'),
  list: svgIcon('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>', '#0B6B63'),
  target: svgIcon('<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="1.8"/>', '#0B6B63'),
  timerClock: svgIcon('<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v5l3.5 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>', '#14161A'),
  listDark: svgIcon('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>', '#14161A'),
  bulb: svgIcon('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.45 1.1 1.2 1.2 1.95V16h4.8v-.25c.1-.75.6-1.5 1.2-1.95A6 6 0 0 0 12 3z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>', '#fff')
};

const LETTERS = ['A', 'B', 'C', 'D'];

function withDisplayStem(questions) {
  return questions.map((q) => Object.assign({}, q, { displayStem: stripLeadingNumber(q.stem) }));
}

Page({
  data: {
    mode: 'new',
    paperKey: '',
    paperMeta: { tag: '', title: '' },
    config: { name: '', durationMinutes: 0, totalQuestions: 0, passCount: 0 },
    phase: 'start',
    questions: [],
    answers: {},
    letters: LETTERS,
    currentIndex: 0,
    currentQuestion: null,
    picked: null,
    timeLeft: 0,
    timeLabel: '00:00',
    timerWarn: false,
    answeredCount: 0,
    progressPct: 0,
    navVisible: false,
    navCells: [],
    reviewNav: false,
    confirmVisible: false,
    confirmMessage: '',
    viewingHistory: false,
    reviewIndex: 0,
    reviewQuestion: null,
    reviewPicked: null,
    reviewIsCorrect: false,
    reviewIsBlank: true,
    correct: 0,
    total: 0,
    answeredCountResult: 0,
    wrongCount: 0,
    blankCount: 0,
    resultPct: 0,
    passed: false,
    resultRingStyle: '',
    resultBadgeText: '',
    resultTitle: '',
    resultDesc: '',
    icons: ICONS,
    statusBarHeight: 24
  },

  async onLoad(options) {
    if (!store.isLoggedIn() || !(await store.hasProfile())) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.setData({ statusBarHeight: getStatusBarHeight() });
    if (options.mode === 'history') {
      const history = await store.fetchExamHistory();
      const entry = store.getExamHistoryEntry(history, Number(options.historyIndex));
      if (!entry) {
        wx.showToast({ title: '记录不存在', icon: 'none' });
        wx.navigateBack();
        return;
      }
      this.setData({
        mode: 'history',
        paperKey: entry.paperKey,
        paperMeta: { tag: entry.paperTag, title: entry.paperName },
        config: entry.config,
        questions: withDisplayStem(entry.questions),
        answers: entry.answers,
        phase: 'result',
        viewingHistory: true
      });
      this.refreshResult();
    } else {
      const key = options.key;
      this.setData({
        mode: 'new',
        paperKey: key,
        paperMeta: store.getPaperMeta(key),
        config: EXAM_CONFIG[key],
        phase: 'start',
        viewingHistory: false
      });
    }
  },

  onUnload() {
    if (this.timerHandle) clearInterval(this.timerHandle);
  },

  goBack() {
    wx.navigateBack();
  },

  /* ---- start ---- */
  startExam() {
    const key = this.data.paperKey;
    const config = EXAM_CONFIG[key];
    const pool = shuffle(BANKS[key]);
    const questions = withDisplayStem(pool.slice(0, config.totalQuestions));
    this.setData({
      config,
      questions,
      answers: {},
      currentIndex: 0,
      phase: 'exam',
      timeLeft: config.durationMinutes * 60,
      timeLabel: fmtTime(config.durationMinutes * 60),
      timerWarn: false
    });
    this.updateExamView();
    if (this.timerHandle) clearInterval(this.timerHandle);
    this.timerHandle = setInterval(() => this.tickTimer(), 1000);
  },

  tickTimer() {
    const timeLeft = this.data.timeLeft - 1;
    if (timeLeft <= 0) {
      clearInterval(this.timerHandle);
      this.setData({ timeLeft: 0, timeLabel: '00:00' });
      this.finishExam();
      return;
    }
    this.setData({
      timeLeft,
      timeLabel: fmtTime(timeLeft),
      timerWarn: timeLeft <= 300
    });
  },

  /* ---- exam ---- */
  updateExamView() {
    const { questions, answers, currentIndex } = this.data;
    this.setData({
      currentQuestion: questions[currentIndex],
      answeredCount: Object.keys(answers).length,
      progressPct: Math.round(((currentIndex + 1) / questions.length) * 100),
      picked: answers[currentIndex] || null
    });
  },

  pickAnswer(e) {
    const letter = e.currentTarget.dataset.letter;
    const idx = this.data.currentIndex;
    const wasAnswered = !!this.data.answers[idx];
    this.setData({
      [`answers.${idx}`]: letter,
      picked: letter,
      answeredCount: this.data.answeredCount + (wasAnswered ? 0 : 1)
    });
  },

  gotoQuestion(e) {
    const idx = Number(e.currentTarget.dataset.index);
    if (idx < 0 || idx >= this.data.questions.length) return;
    this.setData({ currentIndex: idx });
    this.updateExamView();
  },

  toggleNavigator() {
    const { questions, answers, currentIndex } = this.data;
    const navCells = questions.map((q, i) => ({
      index: i,
      num: i + 1,
      answered: !!answers[i],
      current: i === currentIndex
    }));
    this.setData({ navCells, navVisible: true, reviewNav: false });
  },

  closeNavigator() {
    this.setData({ navVisible: false });
  },

  onNavCellTap(e) {
    const idx = Number(e.currentTarget.dataset.index);
    this.setData({ navVisible: false });
    if (this.data.reviewNav) {
      this.setData({ reviewIndex: idx });
      this.updateReviewView();
    } else {
      this.setData({ currentIndex: idx });
      this.updateExamView();
    }
  },

  askSubmit() {
    const { questions, answers } = this.data;
    const unanswered = questions.length - Object.keys(answers).length;
    this.setData({
      confirmVisible: true,
      confirmMessage: unanswered > 0 ? '检测到未完成所有题目做答，请问是否确认提交？' : '请确认是否提交。'
    });
  },

  closeConfirmDialog() {
    this.setData({ confirmVisible: false });
  },

  finishExam() {
    if (this.timerHandle) clearInterval(this.timerHandle);
    const { questions, answers, paperKey, config, paperMeta } = this.data;

    // 写云端（聚合统计 + 并发处理错题本 + 一条考试记录）不阻塞切到结果页——
    // 分数是本地算好的，不依赖这几次云端写入是否已经落地。
    store.recordExamResult(paperKey, questions, answers, {
      paperTag: paperMeta.tag,
      paperName: paperMeta.title,
      config
    }).catch(() => wx.showToast({ title: '网络异常，本次成绩可能未同步', icon: 'none' }));

    this.setData({ phase: 'result', confirmVisible: false });
    this.refreshResult();
  },

  /* ---- result ---- */
  refreshResult() {
    const { questions, answers, config } = this.data;
    const total = questions.length;
    const correct = questions.filter((q, i) => answers[i] === q.answer).length;
    const answeredCount = Object.keys(answers).length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const passed = correct >= config.passCount;
    const colors = passed ? ['#0B6B63', '#17C9A3'] : ['#E2604B', '#EF7B62'];
    const resultDesc = passed
      ? `合格线为 ${config.passCount} 题（70%），本次答对 ${correct} 题，已达标。`
      : `合格线为 ${config.passCount} 题（70%），本次答对 ${correct} 题，还差 ${config.passCount - correct} 题。`;
    this.setData({
      total,
      correct,
      answeredCountResult: answeredCount,
      wrongCount: answeredCount - correct,
      blankCount: total - answeredCount,
      resultPct: pct,
      passed,
      resultRingStyle: `background:conic-gradient(${colors[0]} 0%, ${colors[1]} ${pct}%, rgba(20,24,33,0.08) ${pct}% 100%);`,
      resultBadgeText: passed ? '✔ 合格 PASS' : '✕ 未达标 FAIL',
      resultTitle: passed ? '恭喜，模拟考试通过！' : '还差一点，继续加油',
      resultDesc
    });
  },

  restartExam() {
    this.setData({ viewingHistory: false, phase: 'start' });
  },

  exitToList() {
    wx.navigateBack();
  },

  /* ---- review ---- */
  openReview() {
    this.setData({ phase: 'review', reviewIndex: 0 });
    this.updateReviewView();
  },

  backToResult() {
    this.setData({ phase: 'result' });
  },

  updateReviewView() {
    const { questions, answers, reviewIndex } = this.data;
    const q = questions[reviewIndex];
    const picked = answers[reviewIndex] || null;
    this.setData({
      reviewQuestion: q,
      reviewPicked: picked,
      reviewIsBlank: !picked,
      reviewIsCorrect: picked === q.answer
    });
  },

  gotoReview(e) {
    const idx = Number(e.currentTarget.dataset.index);
    if (idx < 0 || idx >= this.data.questions.length) return;
    this.setData({ reviewIndex: idx });
    this.updateReviewView();
  },

  toggleReviewNavigator() {
    const { questions, answers, reviewIndex } = this.data;
    const navCells = questions.map((q, i) => {
      const picked = answers[i];
      let state = 'blank';
      if (picked) state = picked === q.answer ? 'correct' : 'wrong';
      return { index: i, num: i + 1, state, current: i === reviewIndex };
    });
    this.setData({ navCells, navVisible: true, reviewNav: true });
  }
});
