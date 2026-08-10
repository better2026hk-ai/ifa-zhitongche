// Supabase 数据层。
//
// 微信云开发在海外主体下开不通，换成 Supabase：Postgres + 一个 Edge Function
// （supabase/functions/api）。小程序客户端没有微信云开发那种"天生带着登录身份
// 直连数据库"的能力，所以认证/数据读写都经过这一个函数——用 wx.login() 换来的
// code 在服务端换成 openid，函数自己签一个 token 交给客户端保存，之后每次调用
// 带着这个 token，函数验签解出 openid，代码里显式按 openid 过滤数据。
//
// 对页面暴露的函数名字/形状基本没变（上一版切云开发时就已经把所有页面从同步
// 读本地存储改成了 await store.xxx()），这次只是把内部实现从 wx.cloud.database()
// 换成了 HTTP 调 Edge Function。

const { HOME_BANKS } = require('./banks.js');
const { API_BASE, ANON_KEY } = require('./api-config.js');

const KEYS = {
  LOGGED_IN: 'ifa_logged_in', // 本机开关：这台设备是否已同意协议并点过登录，跟云端资料无关，不跨设备
  SESSION_TOKEN: 'ifa_session_token' // 登录换来的签名 token，认证凭证
};

let _cachedUser = null; // 同一次 App 运行期间缓存，避免每个页面 onShow 都重新查一次

function getPaperMeta(paperKey) {
  const bank = HOME_BANKS.find((b) => b.key === paperKey);
  return bank ? { tag: bank.tag, title: bank.title } : { tag: paperKey, title: '' };
}

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* ============================================================
   本机登录开关 + 会话 token
============================================================ */

function isLoggedIn() {
  return !!wx.getStorageSync(KEYS.LOGGED_IN);
}

function setLoggedIn(value) {
  wx.setStorageSync(KEYS.LOGGED_IN, !!value);
}

function getSessionToken() {
  return wx.getStorageSync(KEYS.SESSION_TOKEN) || '';
}

function setSessionToken(token) {
  wx.setStorageSync(KEYS.SESSION_TOKEN, token);
}

function logout() {
  setLoggedIn(false);
  setSessionToken('');
  _cachedUser = null;
}

/* ============================================================
   统一走这一个 Edge Function
============================================================ */

function callApi(action, payload) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: API_BASE,
      method: 'POST',
      // Authorization 头是过 Supabase 网关那一层要用的 anon key，跟下面
      // data 里的 token（我们自己签的登录凭证）是两层完全独立的校验。
      header: { Authorization: `Bearer ${ANON_KEY}` },
      data: Object.assign({ action, token: getSessionToken() }, payload || {}),
      success(res) {
        if (res.data && res.data.ok) {
          resolve(res.data.data);
        } else {
          const err = new Error((res.data && res.data.error) || '请求失败');
          err.status = res.statusCode;
          if (res.statusCode === 401) {
            // token 过期/无效——清掉本机登录态，下次进页面会被门禁重新带去登录页。
            logout();
          }
          reject(err);
        }
      },
      fail(err) {
        reject(err);
      }
    });
  });
}

/* ============================================================
   登录 + 用户资料 —— users 表，一人一条
============================================================ */

async function login(code) {
  const res = await callApi('login', { code });
  setSessionToken(res.token);
  _cachedUser = res.user || null;
  return _cachedUser;
}

async function fetchUserDoc() {
  if (_cachedUser) return _cachedUser;
  if (!getSessionToken()) return null;
  try {
    const user = await callApi('getUser');
    _cachedUser = user;
    return user;
  } catch (e) {
    return null;
  }
}

async function hasProfile() {
  const user = await fetchUserDoc();
  return !!(user && user.nickname);
}

async function saveProfile({ nickname, avatarUrl }) {
  const user = await callApi('saveProfile', { nickname, avatarUrl });
  _cachedUser = user;
  return user;
}

// 章节练习模式"上次做到哪"——保存的时候顺手同步一下内存缓存，下次同一次
// App 运行期间再读 fetchUserDoc() 不用等新的网络请求就能拿到最新进度。
async function saveProgress(paperKey, chapterIdx, qIndex) {
  await callApi('saveProgress', { paperKey, chapterIdx, qIndex });
  if (_cachedUser) {
    if (!_cachedUser.practiceProgress) _cachedUser.practiceProgress = {};
    _cachedUser.practiceProgress[paperKey] = { chapterIdx, qIndex };
  }
}

async function getOrCreateAccountId() {
  const user = await fetchUserDoc();
  return user ? user.accountId : null;
}

/* ---- 纯计算：从已经拿到的 user 文档里算，不摸网络 ---- */

function getBankStats(user, bank) {
  const stats = (user && user.paperStats) || {};
  const st = stats[bank.key] || { done: 0, correct: 0 };
  const acc = st.done > 0 ? Math.round((st.correct / st.done) * 100) : 0;
  return { done: st.done, correct: st.correct, acc, total: bank.total };
}

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
  const diffDays = Math.floor((Date.now() - firstLoginAt) / 86400000);
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
   题库 —— questions 表。原来打包进 packageExam/data 的 5 份 json 太大，
   分包超过了 2MB 的限制，改成按需从服务端拉取。
============================================================ */

// 章节练习模式要整份卷子（按章节浏览），一次性拉全量。
async function fetchPracticeQuestions(paperKey) {
  return callApi('fetchPracticeQuestions', { paperKey });
}

// 模拟考试只要随机抽 count 题——抽样在服务端做（数据库同一网络内），
// 小程序端不用拉整份题库回来再洗牌。
async function fetchExamQuestions(paperKey, count) {
  return callApi('fetchExamQuestions', { paperKey, count });
}

/* ============================================================
   单题作答 —— 练习模式 / 错题本测验共用，一次请求同时处理统计 + 错题本增删
============================================================ */

async function answerQuestion(paperKey, q, pickedLetter) {
  const isCorrect = pickedLetter === q.answer;
  const meta = getPaperMeta(paperKey);
  await callApi('answerQuestion', {
    paperKey,
    isCorrect,
    pickedLetter,
    stem: q.stem,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation || '',
    paperTag: meta.tag,
    paperName: meta.title
  });
  if (_cachedUser) {
    if (!_cachedUser.paperStats[paperKey]) _cachedUser.paperStats[paperKey] = { done: 0, correct: 0 };
    _cachedUser.paperStats[paperKey].done++;
    if (isCorrect) _cachedUser.paperStats[paperKey].correct++;
    const today = dateKey(new Date());
    if (!_cachedUser.activityDates.includes(today)) _cachedUser.activityDates.push(today);
  }
}

/* ============================================================
   错题本 —— wrongBook 表
============================================================ */

async function fetchWrongBook() {
  const list = await callApi('fetchWrongBook');
  // 沿用旧字段名 key（=id），页面里 wx:key/dataset/Set 大量用它当唯一标识，不用改。
  return list.map((w) => Object.assign({}, w, { key: w.id }));
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

async function removeWrongBookEntry(id) {
  await callApi('removeWrongBookEntry', { id });
}

async function countWrongBook() {
  const res = await callApi('countWrongBook');
  return res.count;
}

/* ============================================================
   模拟考试记录 —— examHistory 表，一次交卷一条
============================================================ */

async function fetchExamHistory() {
  return callApi('fetchExamHistory');
}

function getExamHistoryEntry(list, index) {
  return list[index] || null;
}

// 交卷场景一次要处理一整份卷子（数十题），全部交给服务端一次请求搞定
// （聚合统计 + 批量错题本增删 + 一条考试记录，共 4 条 SQL，见 Edge Function）。
// 调用方不需要 await 这个函数就能切到结果页——结果本身是本地算好的，不依赖
// 这次云端写入是否已经落地。
async function recordExamResult(paperKey, questions, answers, examMeta) {
  await callApi('recordExamResult', {
    paperKey,
    questions,
    answers,
    paperTag: examMeta.paperTag,
    paperName: examMeta.paperName,
    config: examMeta.config
  });
  if (_cachedUser) {
    let done = 0;
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i]) {
        done++;
        if (answers[i] === q.answer) correct++;
      }
    });
    if (!_cachedUser.paperStats[paperKey]) _cachedUser.paperStats[paperKey] = { done: 0, correct: 0 };
    _cachedUser.paperStats[paperKey].done += done;
    _cachedUser.paperStats[paperKey].correct += correct;
    const today = dateKey(new Date());
    if (!_cachedUser.activityDates.includes(today)) _cachedUser.activityDates.push(today);
  }
}

/* ============================================================
   意见反馈 —— feedback 表
============================================================ */

async function submitFeedback(rating, text) {
  await callApi('submitFeedback', { rating, text });
}

module.exports = {
  isLoggedIn,
  setLoggedIn,
  logout,
  login,
  fetchUserDoc,
  saveProgress,
  hasProfile,
  saveProfile,
  getOrCreateAccountId,
  fetchPracticeQuestions,
  fetchExamQuestions,
  answerQuestion,
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
  countWrongBook,
  fetchExamHistory,
  getExamHistoryEntry,
  recordExamResult,
  submitFeedback
};
