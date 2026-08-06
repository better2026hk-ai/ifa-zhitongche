const store = require('../../utils/store.js');
const { HOME_BANKS } = require('../../utils/banks.js');

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
    checkIcon: CHECK_ICON
  },

  onShow() {
    if (!store.isLoggedIn() || !store.hasProfile()) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
    this.refresh();
  },

  refresh() {
    const profile = store.getProfile();
    const banks = HOME_BANKS.map((bank) => {
      const st = store.getBankStats(bank);
      const pct = bank.total > 0 ? Math.round((st.done / bank.total) * 100) : 0;
      return { ...bank, done: st.done, acc: st.acc, pct };
    });
    const current = banks.find((b) => b.key === this.data.currentKey) || banks[0];
    const currentBank = HOME_BANKS.find((b) => b.key === current.key);
    current.desc = store.generateBankDesc(currentBank);

    this.setData({
      nickname: profile.nickname,
      avatarUrl: profile.avatarUrl || '',
      days: store.daysSinceFirstLogin(),
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
    this.refresh();
  },

  onContinue() {
    // 练习模式是下一步要做的功能，先占位。
    wx.showToast({ title: '练习模式下一步实现', icon: 'none' });
  },

  goProfile() {
    wx.switchTab({ url: '/pages/profile/profile' });
  }
});
