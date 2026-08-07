const store = require('../../utils/store.js');
const { getStatusBarHeight } = require('../../utils/util.js');

function svgIcon(paths, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">${paths.replace(/currentColor/g, color)}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const EDIT_ICON = svgIcon('<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>', '#5B6472');
const LOGOUT_ICON = svgIcon('<path d="M15 17l5-5-5-5M20 12H9M13 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>', '#E2604B');
const ARROW_ICON = svgIcon('<path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>', '#9AA0AC');

const ICONS = {
  user: svgIcon('<circle cx="12" cy="8" r="3.4" stroke="currentColor" stroke-width="1.6"/><path d="M5 20c1.2-4 4-6 7-6s5.8 2 7 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>', '#0B6B63'),
  message: svgIcon('<path d="M4 5h16v11H9l-4 4V5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>', '#0B6B63'),
  info: svgIcon('<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><path d="M12 8h.01M11 11h1v5h1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>', '#0B6B63')
};

function formatDate(timestamp) {
  const d = new Date(timestamp);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getMonth() + 1}月${d.getDate()}日 ${hh}:${mm}`;
}

Page({
  data: {
    nickname: '',
    avatarUrl: '',
    days: 1,
    confirmVisible: false,
    overview: { totalPracticed: 0, avgAcc: 0, streak: 0, examCount: 0, passCount: 0, wrongCount: 0 },
    historyPreview: [],
    historyCountLabel: 0,
    editIcon: EDIT_ICON,
    logoutIcon: LOGOUT_ICON,
    arrowIcon: ARROW_ICON,
    icons: ICONS,
    statusBarHeight: 24
  },

  async onShow() {
    if (!store.isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    const user = await store.fetchUserDoc();
    if (!user || !user.nickname) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3, hidden: false });
    }
    this.setData({ statusBarHeight: getStatusBarHeight() });
    const [history, wrongCount] = await Promise.all([store.fetchExamHistory(), store.countWrongBook()]);
    const historyPreview = history.slice(0, 3).map((h) => ({
      paperTag: h.paperTag,
      paperName: h.paperName,
      passed: h.passed,
      dateStr: formatDate(h.timestamp),
      pct: h.total > 0 ? Math.round((h.correct / h.total) * 100) : 0
    }));
    this.setData({
      nickname: user.nickname,
      avatarUrl: user.avatarUrl || '',
      days: store.daysSinceFirstLogin(user),
      overview: store.computeOverviewStats(user, history, wrongCount),
      historyPreview,
      historyCountLabel: Math.min(history.length, 20)
    });
  },

  onOpenHistory(e) {
    const idx = e.currentTarget.dataset.index;
    wx.navigateTo({ url: `/packageExam/pages/flow/flow?mode=history&historyIndex=${idx}` });
  },

  openExamHistoryList() {
    wx.navigateTo({ url: '/pages/exam-history/exam-history' });
  },

  editProfile() {
    wx.navigateTo({ url: '/pages/profile-setup/profile-setup?mode=edit' });
  },

  openAccount() {
    wx.navigateTo({ url: '/pages/account/account' });
  },

  openFeedback() {
    wx.navigateTo({ url: '/pages/feedback/feedback' });
  },

  openAbout() {
    wx.navigateTo({ url: '/pages/about/about' });
  },

  handleLogout() {
    this.setData({ confirmVisible: true });
  },

  cancelLogout() {
    this.setData({ confirmVisible: false });
  },

  confirmLogout() {
    this.setData({ confirmVisible: false });
    store.logout();
    wx.reLaunch({ url: '/pages/login/login' });
  }
});
