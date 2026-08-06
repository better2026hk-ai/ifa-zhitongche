const store = require('../../utils/store.js');

function svgIcon(paths, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">${paths.replace(/currentColor/g, color)}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const EDIT_ICON = svgIcon('<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>', '#5B6472');
const LOGOUT_ICON = svgIcon('<path d="M15 17l5-5-5-5M20 12H9M13 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>', '#E2604B');
const ARROW_ICON = svgIcon('<path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>', '#9AA0AC');

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
    arrowIcon: ARROW_ICON
  },

  onShow() {
    if (!store.isLoggedIn() || !store.hasProfile()) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
    const profile = store.getProfile();
    const history = store.getExamHistory();
    const historyPreview = history.slice(0, 3).map((h) => ({
      paperTag: h.paperTag,
      paperName: h.paperName,
      passed: h.passed,
      dateStr: formatDate(h.timestamp),
      pct: h.total > 0 ? Math.round((h.correct / h.total) * 100) : 0
    }));
    this.setData({
      nickname: profile.nickname,
      avatarUrl: profile.avatarUrl || '',
      days: store.daysSinceFirstLogin(),
      overview: store.computeOverviewStats(),
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
