// Local persistence layer standing in for the real backend.
//
// 技术交接文档 3.3 节把 users / paperStats / activityDates 等描述为数据库集合，
// 现在还没有接微信云开发，所以先用 wx.storage 落地，字段名和读写方式都对齐文档，
// 后面接云开发时只需要把这个文件里的实现换成云函数调用，调用方（各 page）不用改。

const { HOME_BANKS } = require('./banks.js');

const KEYS = {
  LOGGED_IN: 'ifa_logged_in',
  PROFILE: 'ifa_profile', // { nickname, avatarUrl }
  FIRST_LOGIN_AT: 'ifa_first_login_at', // timestamp (ms)
  PAPER_STATS: 'ifa_paper_stats', // { [paperKey]: { done, correct } }
  ACTIVITY_DATES: 'ifa_activity_dates', // string[] of 'YYYY-MM-DD'
  WRONG_BOOK: 'ifa_wrong_book', // [{ key, paperKey, paperTag, paperName, stem, options, answer, lastPicked, explanation, wrongAt }]
  EXAM_HISTORY: 'ifa_exam_history', // [{ paperKey, paperTag, paperName, config, questions, answers, total, correct, passed, timestamp }]
  ACCOUNT_ID: 'ifa_account_id', // 真机上换成 wx.login 拿到的 openid
  FEEDBACK_LIST: 'ifa_feedback' // [{ rating, text, submittedAt }]
};

const PAPER_KEYS = ['p1', 'p2', 'p3', 'p5', 'mpf'];

function getPaperMeta(paperKey) {
  const bank = HOME_BANKS.find((b) => b.key === paperKey);
  return bank ? { tag: bank.tag, title: bank.title } : { tag: paperKey, title: '' };
}

function defaultPaperStats() {
  const stats = {};
  PAPER_KEYS.forEach((key) => { stats[key] = { done: 0, correct: 0 }; });
  return stats;
}

function isLoggedIn() {
  return !!wx.getStorageSync(KEYS.LOGGED_IN);
}

function setLoggedIn(value) {
  wx.setStorageSync(KEYS.LOGGED_IN, !!value);
}

function getProfile() {
  return wx.getStorageSync(KEYS.PROFILE) || null;
}

function hasProfile() {
  const profile = getProfile();
  return !!(profile && profile.nickname);
}

function setProfile(profile) {
  wx.setStorageSync(KEYS.PROFILE, profile);
  if (!wx.getStorageSync(KEYS.FIRST_LOGIN_AT)) {
    wx.setStorageSync(KEYS.FIRST_LOGIN_AT, Date.now());
  }
}

function getFirstLoginAt() {
  return wx.getStorageSync(KEYS.FIRST_LOGIN_AT) || null;
}

function daysSinceFirstLogin() {
  const firstLoginAt = getFirstLoginAt();
  if (!firstLoginAt) return 1;
  const diffDays = Math.floor((Date.now() - firstLoginAt) / 86400000);
  return Math.max(1, diffDays + 1);
}

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getActivityDates() {
  return new Set(wx.getStorageSync(KEYS.ACTIVITY_DATES) || []);
}

function markActivityToday() {
  const dates = getActivityDates();
  dates.add(dateKey(new Date()));
  wx.setStorageSync(KEYS.ACTIVITY_DATES, Array.from(dates));
}

function computeStreak() {
  const dates = getActivityDates();
  if (dates.size === 0) return 0;
  let streak = 0;
  const cursor = new Date();
  while (dates.has(dateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getPaperStats() {
  return Object.assign(defaultPaperStats(), wx.getStorageSync(KEYS.PAPER_STATS) || {});
}

function getBankStats(bank) {
  const stats = getPaperStats();
  const st = stats[bank.key] || { done: 0, correct: 0 };
  const acc = st.done > 0 ? Math.round((st.correct / st.done) * 100) : 0;
  return { done: st.done, correct: st.correct, acc, total: bank.total };
}

// 练习模式/模拟考试/错题本测验答题时统一调用这个函数记录统计——
// 技术交接文档 4.3 节强调这三个来源都要算进"已练习题数"，不区分来源。
function recordAnswerStat(paperKey, isCorrect) {
  const stats = getPaperStats();
  if (!stats[paperKey]) stats[paperKey] = { done: 0, correct: 0 };
  stats[paperKey].done++;
  if (isCorrect) stats[paperKey].correct++;
  wx.setStorageSync(KEYS.PAPER_STATS, stats);
  markActivityToday();
}

function generateBankDesc(bank) {
  const st = getBankStats(bank);
  if (bank.total === 0) return '题库建设中，敬请期待。';
  if (st.done === 0) return '还没有开始练习，现在就开始吧！';
  const remaining = bank.total - st.done;
  if (remaining <= 0) return `恭喜，已完成 ${bank.title} 题库的一轮练习！`;
  const days = Math.max(1, Math.ceil(remaining / 30));
  return `按当前进度（约每天 30 题），预计还需 ${days} 天完成全部题库一轮练习。`;
}

function logout() {
  setLoggedIn(false);
}

/* ============================================================
   错题本 —— 技术交接文档 3.3 / 5.4 节
   去重键: paperKey + stem。答错写入/更新，答对且存在则删除。
============================================================ */

function getWrongBook() {
  return wx.getStorageSync(KEYS.WRONG_BOOK) || [];
}

function saveWrongBook(list) {
  wx.setStorageSync(KEYS.WRONG_BOOK, list);
}

function getWrongBookForPaper(paperKey) {
  return getWrongBook().filter((w) => w.paperKey === paperKey);
}

// 错题本列表页只显示"科目 + 错题数"，按第一次出现的顺序分组
// （不要一上来就把所有错题铺出来 —— 文档 4.5 节）。
function getWrongBookGrouped() {
  const grouped = [];
  const byKey = {};
  getWrongBook().forEach((w) => {
    if (!byKey[w.paperKey]) {
      byKey[w.paperKey] = { key: w.paperKey, tag: w.paperTag, name: w.paperName, count: 0 };
      grouped.push(byKey[w.paperKey]);
    }
    byKey[w.paperKey].count++;
  });
  return grouped;
}

function removeWrongBookEntry(dedupeKey) {
  const list = getWrongBook();
  const idx = list.findIndex((w) => w.key === dedupeKey);
  if (idx >= 0) {
    list.splice(idx, 1);
    saveWrongBook(list);
  }
}

// 答对 -> 如果错题本里有这题就删掉；答错 -> 写入/更新（已存在则只刷新
// lastPicked/wrongAt，不重复插入）。练习模式、模拟考试、错题本自己的测验
// 三处都要调用这个函数，不区分来源（文档 5.4 节）。
function updateWrongBookOnAnswer(paperKey, q, pickedLetter) {
  if (!pickedLetter) return;
  const dedupeKey = `${paperKey}::${q.stem}`;
  const list = getWrongBook();
  const idx = list.findIndex((w) => w.key === dedupeKey);

  if (pickedLetter === q.answer) {
    if (idx >= 0) {
      list.splice(idx, 1);
      saveWrongBook(list);
    }
    return;
  }

  const meta = getPaperMeta(paperKey);
  const entry = {
    key: dedupeKey,
    paperKey,
    paperTag: meta.tag,
    paperName: meta.title,
    stem: q.stem,
    options: q.options,
    answer: q.answer,
    lastPicked: pickedLetter,
    explanation: q.explanation || '',
    wrongAt: Date.now()
  };
  if (idx >= 0) list[idx] = entry;
  else list.unshift(entry);
  saveWrongBook(list);
}

/* ============================================================
   模拟考试记录 —— 技术交接文档 3.3 / 4.6 节
============================================================ */

function getExamHistory() {
  return wx.getStorageSync(KEYS.EXAM_HISTORY) || [];
}

function addExamHistory(entry) {
  const list = getExamHistory();
  list.unshift(entry);
  wx.setStorageSync(KEYS.EXAM_HISTORY, list);
}

function getExamHistoryEntry(index) {
  return getExamHistory()[index] || null;
}

/* ============================================================
   "我的"页学习总览的 6 个数字 —— 技术交接文档 4.3 节
============================================================ */

function computeOverviewStats() {
  const stats = getPaperStats();
  let totalPracticed = 0;
  let totalCorrect = 0;
  Object.keys(stats).forEach((k) => {
    totalPracticed += stats[k].done;
    totalCorrect += stats[k].correct;
  });
  const avgAcc = totalPracticed > 0 ? Math.round((totalCorrect / totalPracticed) * 100) : 0;
  const history = getExamHistory();
  const examCount = history.length;
  const passCount = history.filter((h) => h.passed).length;
  const wrongCount = getWrongBook().length;
  return { totalPracticed, avgAcc, streak: computeStreak(), examCount, passCount, wrongCount };
}

/* ============================================================
   账号管理 / 意见反馈
============================================================ */

// 账号 ID 首次登录时生成一次，之后固定不变——真机上应该换成 wx.login()
// 换来的 openid，现在还没接云开发，先本地生成占位。
function getOrCreateAccountId() {
  let id = wx.getStorageSync(KEYS.ACCOUNT_ID);
  if (!id) {
    id = 'wxid_' + Math.random().toString(36).slice(2, 10);
    wx.setStorageSync(KEYS.ACCOUNT_ID, id);
  }
  return id;
}

// 提交后目前只本地留一份记录——真正写入数据库/转发通知需要接一个云函数
// （技术交接文档 9 节明确写了这是原型里故意没做成真的的地方）。
function submitFeedback(rating, text) {
  const list = wx.getStorageSync(KEYS.FEEDBACK_LIST) || [];
  list.unshift({ rating, text, submittedAt: Date.now() });
  wx.setStorageSync(KEYS.FEEDBACK_LIST, list);
}

module.exports = {
  KEYS,
  isLoggedIn,
  setLoggedIn,
  getProfile,
  hasProfile,
  setProfile,
  getFirstLoginAt,
  daysSinceFirstLogin,
  computeStreak,
  getPaperStats,
  getBankStats,
  recordAnswerStat,
  generateBankDesc,
  getPaperMeta,
  getWrongBook,
  getWrongBookForPaper,
  getWrongBookGrouped,
  removeWrongBookEntry,
  updateWrongBookOnAnswer,
  getExamHistory,
  addExamHistory,
  getExamHistoryEntry,
  computeOverviewStats,
  getOrCreateAccountId,
  submitFeedback,
  logout
};
