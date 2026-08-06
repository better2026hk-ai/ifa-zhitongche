const store = require('../../utils/store.js');

const ICON = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">' +
  '<path d="M12 3l8 4v5c0 5-3.4 8.4-8 9-4.6-.6-8-4-8-9V7l8-4z" stroke="#9AA0AC" stroke-width="1.8" stroke-linejoin="round"/>' +
  '<path d="M9.5 12l1.8 1.8L15 10" stroke="#9AA0AC" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
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
      this.getTabBar().setData({ selected: 2 });
    }
  }
});
