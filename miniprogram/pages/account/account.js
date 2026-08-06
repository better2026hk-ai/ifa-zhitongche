const store = require('../../utils/store.js');

const BACK_ICON = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">' +
  '<path d="M15 6l-6 6 6 6" stroke="#14161A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>'
)}`;

function fmtDate(timestamp) {
  const d = new Date(timestamp);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${hh}:${mm}`;
}

Page({
  data: {
    backIcon: BACK_ICON,
    nickname: '',
    avatarUrl: '',
    accountId: '',
    registeredAt: ''
  },

  onShow() {
    if (!store.isLoggedIn() || !store.hasProfile()) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    const profile = store.getProfile();
    const firstLoginAt = store.getFirstLoginAt();
    this.setData({
      nickname: profile.nickname,
      avatarUrl: profile.avatarUrl || '',
      accountId: store.getOrCreateAccountId(),
      registeredAt: firstLoginAt ? fmtDate(firstLoginAt) : '—'
    });
  },

  goBack() {
    wx.navigateBack();
  }
});
