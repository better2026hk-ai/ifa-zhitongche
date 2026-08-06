const store = require('../../utils/store.js');

const ICON = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">' +
  '<rect x="6" y="4" width="12" height="17" rx="2" stroke="#9AA0AC" stroke-width="1.8"/>' +
  '<path d="M9 4V3.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V4" stroke="#9AA0AC" stroke-width="1.8" stroke-linecap="round"/>' +
  '<path d="M9 12.5l2 2 4-4.5" stroke="#9AA0AC" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>'
)}`;

Page({
  data: { icon: ICON },

  onShow() {
    if (!store.isLoggedIn() || !store.hasProfile()) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
  }
});
