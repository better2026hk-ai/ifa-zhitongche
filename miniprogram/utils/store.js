// 微信云开发数据层。
//
// 技术交接文档 3.3 节把 users / paperStats / activityDates 等描述为数据库集合——
// 现在真的接上了云开发：4 个集合（users / wrongBook / examHistory / feedback），
// 权限规则都是"仅创建者可读写"，微信按登录身份自动隔离每个人的数据，不用自己管
// openid/账号 ID。调用方（各 page）该拿云端数据的函数都变成了 async，其余纯计算
// 函数（getBankStats/computeOverviewStats 等）保持同步，只是从"自己读存储"变成
// "调用方把已经拿到的 user/list 传进来"。

const { HOME_BANKS } = require('./banks.js');

const KEYS = {
  LOGGED_IN: 'ifa_logged_in' // 本机开关：这台设备是否已同意协议并点过登录，跟云端资料无关，不跨设备
};

const PAPER_KEYS = ['p1', 'p2', 'p3', 'p5', 'mpf'];

// 懒加载：不在模块顶层调用 wx.cloud.database()，避免依赖"这个文件被 require 的
// 时机一定在 app.js 的 wx.cloud.init() 之后"这个假设。
let _db = null;
function db() {
  if (!_db) _db = wx.cloud.database();
  return _db;
}

let _cachedUser = null; // 同一次 App 运行期间缓存，避免每个页面 onShow 都重新查一次

function getPaperMeta(paperKey) {
  const bank = HOME_BANKS.find((b) => b.key === paperKey);
  return bank ? { tag: bank.tag, title: bank.title } : { tag: paperKey, title: '' };
}

function defaultPaperStats() {
  const stats = {};
  PAPER_KEYS.forEach((key) => { stats[key] = { done: 0, correct: 0 }; });
  return stats;
}

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* ============================================================
   本机登录开关
============================================================ */

function isLoggedIn() {
  return !!wx.getStorageSync(KEYS.LOGGED_IN);
}

function setLoggedIn(value) {
  wx.setStorageSync(KEYS.LOGGED_IN, !!value);
}

function logout() {
  setLoggedIn(false);
  _cachedUser = null;
}

/* ============================================================
   用户资料 + 做题统计 —— users 集合，一人一条
============================================================ */

async function fetchUserDoc() {
  if (_cachedUser) return _cachedUser;
  const res = await db().collection('users').limit(1).get();
  if (!res.data.length) return null;
  _cachedUser = res.data[0];
  return _cachedUser;
}

async function hasProfile() {
  const user = await fetchUserDoc();
  return !!(user && user.nickname);
}

function genAccountId() {
  return 'wxid_' + Math.random().toString(36).slice(2, 10);
}

async function saveProfile({ nickname, avatarUrl }) {
  if (_cachedUser && _cachedUser._id) {
    await db().collection('users').doc(_cachedUser._id).update({ data: { nickname, avatarUrl } });
    _cachedUser = Object.assign({}, _cachedUser, { nickname, avatarUrl });
    return _cachedUser;
  }
  const data = {
    nickname,
    avatarUrl,
    firstLoginAt: db().serverDate(),
    paperStats: defaultPaperStats(),
    activityDates: [],
    accountId: genAccountId()
  };
  const res = await db().collection('users').add({ data });
  _cachedUser = Object.assign({ _id: res._id }, data, { firstLoginAt: Date.now() });
  return _cachedUser;
}

async function getOrCreateAccountId() {
  const user = await fetchUserDoc();
  return user ? user.accountId : null;
}

async function recordAnswerStat(paperKey, isCorrect) {
  const user = await fetchUserDoc();
  if (!user) return;
  const today = dateKey(new Date());
  const _ = db().command;
  await db().collection('users').doc(user._id).update({ data: {
    [`paperStats.${paperKey}.done`]: _.inc(1),
    [`paperStats.${paperKey}.correct`]: _.inc(isCorrect ? 1 : 0),
    activityDates: _.addToSet(today)
  } });
  // 本地缓存顺手同步一份，下一次同步读（getBankStats 等）不用等新的网络请求。
  if (!user.paperStats[paperKey]) user.paperStats[paperKey] = { done: 0, correct: 0 };
  user.paperStats[paperKey].done++;
  if (isCorrect) user.paperStats[paperKey].correct++;
  if (!user.activityDates.includes(today)) user.activityDates.push(today);
}

/* ---- 纯计算：从已经拿到的 user 文档里算，不摸网络 ---- */

function getBankStats(user, bank) {
  const stats = (user && user.paperStats) || {};
  const st = stats[bank.key] || { done: 0, correct: 0 };
  const acc = st.done > 0 ? Math.round((st.correct / st.done) * 100) : 0;
  return { done: st.done, correct: st.correct, acc, total: bank.total };
}

// 练习模式/模拟考试/错题本测验答题时统一调用 recordAnswerStat 记录统计——
// 技术交接文档 4.3 节强调这三个来源都要算进"已练习题数"，不区分来源。
function generateBankDesc(user, bank) {
  const st = getBankStats(user, bank);
  if (bank.total === 0) return '题库建设中，敬请期待。';
  if (st.done === 0) return '还没有开始练习，现在就开始吧！';
  const remaining = bank.total - st.done;
  if (remaining <= 0) return `恭喜，已完成 ${bank.title} 题库的一轮练习！`;
  const days = Math.max(1, Math.ceil(remaining / 30));
  return `按当前进度（约每天 30 题），预计还需 ${days} 天完成全部题库一轮练习。`;
}

function daysSinceFirstLogin(user) {
  const firstLoginAt = user && user.firstLoginAt;
  if (!firstLoginAt) return 1;
  const diffDays = Math.floor((Date.now() - new Date(firstLoginAt).getTime()) / 86400000);
  return Math.max(1, diffDays + 1);
}

function computeStreak(user) {
  const dates = new Set((user && user.activityDates) || []);
  if (dates.size === 0) return 0;
  let streak = 0;
  const cursor = new Date();
  while (dates.has(dateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// "我的"页学习总览的 6 个数字 —— 技术交接文档 4.3 节
function computeOverviewStats(user, examHistory, wrongCount) {
  const stats = (user && user.paperStats) || {};
  let totalPracticed = 0;
  let totalCorrect = 0;
  Object.keys(stats).forEach((k) => {
    totalPracticed += stats[k].done;
    totalCorrect += stats[k].correct;
  });
  const avgAcc = totalPracticed > 0 ? Math.round((totalCorrect / totalPracticed) * 100) : 0;
  const examCount = examHistory.length;
  const passCount = examHistory.filter((h) => h.passed).length;
  return { totalPracticed, avgAcc, streak: computeStreak(user), examCount, passCount, wrongCount };
}

/* ============================================================
   分页拉取辅助 —— 客户端 SDK 单次 get() 最多 100 条，错题本/考试记录用久了会超
============================================================ */

async function fetchAllDocs(query, orderField) {
  const PAGE = 100;
  let skip = 0;
  let all = [];
  while (true) {
    const q = orderField ? query.orderBy(orderField, 'desc') : query;
    const res = await q.skip(skip).limit(PAGE).get();
    all = all.concat(res.data);
    if (res.data.length < PAGE) break;
    skip += PAGE;
  }
  return all;
}

/* ============================================================
   错题本 —— wrongBook 集合。去重键 paperKey + stem 哈希成 _id，
   靠自定义 _id 把"答错写入/更新、答对删除"压成 1 次请求（set()/remove()）。
============================================================ */

function hashDedupeKey(paperKey, stem) {
  let h = 2166136261; // FNV-1a 32位
  for (let i = 0; i < stem.length; i++) {
    h ^= stem.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${paperKey}_${(h >>> 0).toString(36)}`;
}

async function fetchWrongBook() {
  const list = await fetchAllDocs(db().collection('wrongBook'), 'wrongAt');
  // 沿用旧字段名 key（=_id），页面里 wx:key/dataset/Set 大量用它当唯一标识，不用改。
  return list.map((w) => Object.assign({}, w, { key: w._id }));
}

function getWrongBookForPaper(list, paperKey) {
  return list.filter((w) => w.paperKey === paperKey);
}

// 错题本列表页只显示"科目 + 错题数"，按第一次出现的顺序分组
// （不要一上来就把所有错题铺出来 —— 文档 4.5 节）。
function getWrongBookGrouped(list) {
  const grouped = [];
  const byKey = {};
  list.forEach((w) => {
    if (!byKey[w.paperKey]) {
      byKey[w.paperKey] = { key: w.paperKey, tag: w.paperTag, name: w.paperName, count: 0 };
      grouped.push(byKey[w.paperKey]);
    }
    byKey[w.paperKey].count++;
  });
  return grouped;
}

async function removeWrongBookEntry(dedupeId) {
  try {
    await db().collection('wrongBook').doc(dedupeId).remove();
  } catch (e) {
    // 本来就不在错题本里，忽略。
  }
}

async function countWrongBook() {
  const res = await db().collection('wrongBook').count();
  return res.total;
}

// 答对 -> 如果错题本里有这题就删掉；答错 -> 写入/更新（已存在则整条替换，不重复插入）。
// 练习模式、模拟考试、错题本自己的测验三处都要调用这个函数，不区分来源（文档 5.4 节）。
async function updateWrongBookOnAnswer(paperKey, q, pickedLetter) {
  if (!pickedLetter) return;
  const id = hashDedupeKey(paperKey, q.stem);
  if (pickedLetter === q.answer) {
    await removeWrongBookEntry(id);
    return;
  }
  const meta = getPaperMeta(paperKey);
  const entry = {
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
  await db().collection('wrongBook').doc(id).set({ data: entry });
}

/* ============================================================
   模拟考试记录 —— examHistory 集合，一次交卷一条
============================================================ */

async function fetchExamHistory() {
  return fetchAllDocs(db().collection('examHistory'), 'timestamp');
}

async function addExamHistory(entry) {
  await db().collection('examHistory').add({ data: entry });
}

function getExamHistoryEntry(list, index) {
  return list[index] || null;
}

// 交卷场景一次要处理一整份卷子（数十题），不逐题排队请求：用户统计一次原子更新
// 聚合搞定，每题的错题本增删并发跑，考试记录单独写一条。调用方不需要 await 这个
// 函数就能切到结果页——结果本身是本地算好的，不依赖这几次云端写入是否已经落地。
async function recordExamResult(paperKey, questions, answers, examMeta) {
  const user = await fetchUserDoc();
  const today = dateKey(new Date());
  const jobs = [];

  if (user) {
    let done = 0;
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i]) {
        done++;
        if (answers[i] === q.answer) correct++;
      }
    });
    const _ = db().command;
    jobs.push(db().collection('users').doc(user._id).update({ data: {
      [`paperStats.${paperKey}.done`]: _.inc(done),
      [`paperStats.${paperKey}.correct`]: _.inc(correct),
      activityDates: _.addToSet(today)
    } }).then(() => {
      if (!user.paperStats[paperKey]) user.paperStats[paperKey] = { done: 0, correct: 0 };
      user.paperStats[paperKey].done += done;
      user.paperStats[paperKey].correct += correct;
      if (!user.activityDates.includes(today)) user.activityDates.push(today);
    }));
  }

  questions.forEach((q, i) => {
    jobs.push(updateWrongBookOnAnswer(paperKey, q, answers[i]));
  });

  const correctTotal = questions.filter((q, i) => answers[i] === q.answer).length;
  jobs.push(addExamHistory({
    paperKey,
    paperTag: examMeta.paperTag,
    paperName: examMeta.paperName,
    config: examMeta.config,
    questions,
    answers: Object.assign({}, answers),
    total: questions.length,
    correct: correctTotal,
    passed: correctTotal >= examMeta.config.passCount,
    timestamp: Date.now()
  }));

  return Promise.all(jobs);
}

/* ============================================================
   账号管理 / 意见反馈
============================================================ */

async function submitFeedback(rating, text) {
  await db().collection('feedback').add({ data: { rating, text, submittedAt: db().serverDate() } });
}

module.exports = {
  isLoggedIn,
  setLoggedIn,
  logout,
  fetchUserDoc,
  hasProfile,
  saveProfile,
  getOrCreateAccountId,
  recordAnswerStat,
  getBankStats,
  generateBankDesc,
  daysSinceFirstLogin,
  computeStreak,
  computeOverviewStats,
  getPaperMeta,
  fetchWrongBook,
  getWrongBookForPaper,
  getWrongBookGrouped,
  removeWrongBookEntry,
  updateWrongBookOnAnswer,
  countWrongBook,
  fetchExamHistory,
  addExamHistory,
  getExamHistoryEntry,
  recordExamResult,
  submitFeedback
};
