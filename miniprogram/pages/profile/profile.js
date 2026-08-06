const store = require('../../utils/store.js');

function svgIcon(paths, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">${paths.replace(/currentColor/g, color)}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const EDIT_ICON = svgIcon('<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>', '#5B6472');
const LOGOUT_ICON = svgIcon('<path d="M15 17l5-5-5-5M20 12H9M13 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>', '#E2604B');
const ARROW_ICON = svgIcon('<path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>', '#9AA0AC');

Page({
  data: {
    nickname: '',
    avatarUrl: '',
    days: 1,
    confirmVisible: false,
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
    this.setData({
      nickname: profile.nickname,
      avatarUrl: profile.avatarUrl || '',
      days: store.daysSinceFirstLogin()
    });
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
