const store = require('../../utils/store.js');
const { HOME_BANKS } = require('../../utils/banks.js');
const { getStatusBarHeight } = require('../../utils/util.js');

function svgIcon(paths, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">${paths.replace(/currentColor/g, color)}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const CHEVRON_ICON = svgIcon('<path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>', '#5B6472');
const ARROW_ICON = svgIcon('<path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>', '#fff');
const CHECK_ICON = svgIcon('<path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>', '#0B6B63');

Page({
  data: {
    nickname: '',
    avatarUrl: '',
    days: 1,
    banks: [],
    current: { key: 'p1', tag: 'Paper Ⅰ', title: '保险原理及实务', total: 913, done: 0, acc: 0, pct: 0, desc: '' },
    currentKey: 'p1',
    sheetVisible: false,
    chevronIcon: CHEVRON_ICON,
    arrowIcon: ARROW_ICON,
    checkIcon: CHECK_ICON,
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
      this.getTabBar().setData({ selected: 0, hidden: false });
    }
    this._user = user;
    this.setData({ statusBarHeight: getStatusBarHeight() });
    this.refresh(user);
  },

  refresh(user) {
    const banks = HOME_BANKS.map((bank) => {
      const st = store.getBankStats(user, bank);
      const pct = bank.total > 0 ? Math.round((st.done / bank.total) * 100) : 0;
      return { ...bank, done: st.done, acc: st.acc, pct };
    });
    const current = banks.find((b) => b.key === this.data.currentKey) || banks[0];
    const currentBank = HOME_BANKS.find((b) => b.key === current.key);
    current.desc = store.generateBankDesc(user, currentBank);

    this.setData({
      nickname: user.nickname,
      avatarUrl: user.avatarUrl || '',
      days: store.daysSinceFirstLogin(user),
      banks,
      current
    });
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
    const key = e.currentTarget.dataset.key;
    this.setData({ currentKey: key });
    this.refresh(this._user);
    wx.navigateTo({ url: `/packageExam/pages/practice/practice?key=${key}` });
  },

  onContinue() {
    wx.navigateTo({ url: `/packageExam/pages/practice/practice?key=${this.data.currentKey}` });
  },

  goProfile() {
    wx.switchTab({ url: '/pages/profile/profile' });
  }
});
