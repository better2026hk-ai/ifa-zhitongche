// Local persistence layer standing in for the real backend.
//
// 技术交接文档 3.3 节把 users / paperStats / activityDates 等描述为数据库集合，
// 现在还没有接微信云开发，所以先用 wx.storage 落地，字段名和读写方式都对齐文档，
// 后面接云开发时只需要把这个文件里的实现换成云函数调用，调用方（各 page）不用改。

const KEYS = {
  LOGGED_IN: 'ifa_logged_in',
  PROFILE: 'ifa_profile', // { nickname, avatarUrl }
  FIRST_LOGIN_AT: 'ifa_first_login_at', // timestamp (ms)
  PAPER_STATS: 'ifa_paper_stats', // { [paperKey]: { done, correct } }
  ACTIVITY_DATES: 'ifa_activity_dates' // string[] of 'YYYY-MM-DD'
};

const PAPER_KEYS = ['p1', 'p2', 'p3', 'p5', 'mpf'];

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

function daysSinceFirstLogin() {
  const firstLoginAt = wx.getStorageSync(KEYS.FIRST_LOGIN_AT);
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

module.exports = {
  KEYS,
  isLoggedIn,
  setLoggedIn,
  getProfile,
  hasProfile,
  setProfile,
  daysSinceFirstLogin,
  computeStreak,
  getPaperStats,
  getBankStats,
  recordAnswerStat,
  generateBankDesc,
  logout
};
