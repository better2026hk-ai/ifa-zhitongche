const store = require('../../utils/store.js');
const { getStatusBarHeight, getMenuButtonGap } = require('../../utils/util.js');

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
    loggedIn: false,
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
    statusBarHeight: 24,
    menuGap: 0
  },

  // "我的"是个人数据主页，没什么可给游客看的，但同样不能一上来就把人
  // reLaunch 走——就地显示"请先登录"，「关于我们」这类静态信息照样能点进去。
  async onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3, hidden: false });
    }
    // getMenuButtonGap() 量的是"胶囊按钮左边到屏幕最右边"的绝对距离；这个
    // 页面的滚动容器（.home-scroll）自己已经有 40rpx（约 20px）的右侧
    // 页面留白了，直接把 menuGap 整个拿来当 .profile-header 的
    // padding-right 会把这 20px 重复算一遍，把编辑按钮推得比躲开胶囊
    // 实际需要的位置还靠左很多，白白挤掉昵称/副标题能用的宽度。减掉这
    // 20px，编辑按钮就只往右挪到刚好不被挡住的位置。
    this.setData({ statusBarHeight: getStatusBarHeight(), menuGap: Math.max(0, getMenuButtonGap() - 20) });
    if (!store.isLoggedIn()) {
      this.setData({ loggedIn: false });
      return;
    }
    // 本机登录开关（同步，不摸网络）已经是 true，先假定这次能显示真实
    // 内容，不要让页面先渲染成"还没有登录"再等下面这个网络请求把它翻回
    // 来——小程序被切到后台一段时间后经常会被系统回收，下次点进"我的"
    // 基本等于冷启动，`await fetchUserDoc()` 期间如果画面一直停在初始值
    // `loggedIn:false`，看起来就像每次都要重新登录一样，得等一下才会
    // 自动切换成真实资料。真的查到 token 失效/没有资料时下面还是会切回
    // 游客界面，这里只是不让它在确认之前先误显示。
    if (!this.data.loggedIn) this.setData({ loggedIn: true });
    const user = await store.fetchUserDoc();
    if (!user || !user.nickname) {
      this.setData({ loggedIn: false });
      return;
    }
    const [history, wrongCount] = await Promise.all([store.fetchExamHistory(), store.countWrongBook()]);
    const historyPreview = history.slice(0, 3).map((h) => ({
      paperTag: h.paperTag,
      paperName: h.paperName,
      passed: h.passed,
      dateStr: formatDate(h.timestamp),
      pct: h.total > 0 ? Math.round((h.correct / h.total) * 100) : 0
    }));
    this.setData({
      loggedIn: true,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl || '',
      days: store.daysSinceFirstLogin(user),
      overview: store.computeOverviewStats(user, history, wrongCount),
      historyPreview,
      historyCountLabel: Math.min(history.length, 20)
    });
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
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
    wx.reLaunch({ url: '/pages/home/home' });
  }
});
