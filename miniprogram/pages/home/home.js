const store = require('../../utils/store.js');
const { HOME_BANKS } = require('../../utils/banks.js');
const { getStatusBarHeight, getMenuButtonGap } = require('../../utils/util.js');

function svgIcon(paths, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">${paths.replace(/currentColor/g, color)}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const CHEVRON_ICON = svgIcon('<path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>', '#5B6472');
const ARROW_ICON = svgIcon('<path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>', '#fff');
const CHECK_ICON = svgIcon('<path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>', '#0B6B63');

Page({
  data: {
    loggedIn: false,
    nickname: '',
    avatarUrl: '',
    days: 1,
    banks: [],
    current: { key: 'p1', tag: 'Paper Ⅰ', title: '保险原理及实务', total: 913, done: 0, acc: 0, pct: 0, desc: '' },
    currentKey: 'p1',
    sheetVisible: false,
    loginPromptVisible: false,
    chevronIcon: CHEVRON_ICON,
    arrowIcon: ARROW_ICON,
    checkIcon: CHECK_ICON,
    statusBarHeight: 24,
    menuGap: 0
  },

  // 首页允许游客浏览（微信审核要求：不能一进小程序就强制登录），题库列表/
  // 规则这些内容本身就是通用信息，不需要身份。只有"继续练习"这种要写入
  // 个人数据的操作才在点击那一刻检查登录态、弹出登录提示（见 guardLogin）。
  async onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0, hidden: false });
    }
    this.setData({ statusBarHeight: getStatusBarHeight(), menuGap: getMenuButtonGap() });
    const user = store.isLoggedIn() ? await store.fetchUserDoc() : null;
    this._user = user;
    this.refresh(user);
  },

  refresh(user) {
    const banks = HOME_BANKS.map((bank) => {
      const st = user ? store.getBankStats(user, bank) : { done: 0, correct: 0, acc: 0 };
      const pct = bank.total > 0 ? Math.round((st.done / bank.total) * 100) : 0;
      return { ...bank, done: st.done, acc: st.acc, pct };
    });
    const current = banks.find((b) => b.key === this.data.currentKey) || banks[0];
    const currentBank = HOME_BANKS.find((b) => b.key === current.key);
    current.desc = user ? store.generateBankDesc(user, currentBank) : '登录后即可同步你的练习进度。';

    this.setData({
      loggedIn: !!user,
      nickname: user ? user.nickname : '',
      avatarUrl: user ? user.avatarUrl || '' : '',
      days: user ? store.daysSinceFirstLogin(user) : 1,
      banks,
      current
    });
  },

  guardLogin() {
    if (this.data.loggedIn) return true;
    this.setData({ loginPromptVisible: true });
    return false;
  },

  goLogin() {
    this.setData({ loginPromptVisible: false });
    wx.navigateTo({ url: '/pages/login/login' });
  },

  closeLoginPrompt() {
    this.setData({ loginPromptVisible: false });
  },

  openSheet() {
    this.setData({ sheetVisible: true });
  },

  closeSheet() {
    this.setData({ sheetVisible: false });
  },

  onSelectBank(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ currentKey: key, sheetVisible: false });
    this.refresh(this._user);
  },

  // "我的题库"列表里的卡片——点击直接进对应题库的练习模式，
  // 跟"切换题库"面板（只换仪表盘显示）分开处理。
  onOpenBank(e) {
    if (!this.guardLogin()) return;
    const key = e.currentTarget.dataset.key;
    this.setData({ currentKey: key });
    this.refresh(this._user);
    wx.navigateTo({ url: `/packageExam/pages/practice/practice?key=${key}` });
  },

  onContinue() {
    if (!this.guardLogin()) return;
    wx.navigateTo({ url: `/packageExam/pages/practice/practice?key=${this.data.currentKey}` });
  },

  goProfile() {
    wx.switchTab({ url: '/pages/profile/profile' });
  }
});
