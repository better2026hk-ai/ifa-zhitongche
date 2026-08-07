const store = require('../../utils/store.js');
const { suggestNickname, getStatusBarHeight } = require('../../utils/util.js');

// Same WeChat-bubble glyph used in the HTML prototype's login button, baked
// as a white-fill data URI so no extra image asset is needed.
const WX_ICON = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">' +
  '<path d="M9.5 4.5a.8.8 0 1 1 0-1.6.8.8 0 0 1 0 1.6zM5 4.5a.8.8 0 1 1 0-1.6.8.8 0 0 1 0 1.6z" fill="#fff"/>' +
  '<path d="M2 8.2C2 5.3 4.8 3 8.3 3s6.3 2.3 6.3 5.2-2.8 5.2-6.3 5.2c-.6 0-1.2-.07-1.8-.2L4.4 14l.6-1.9C3 11.1 2 9.8 2 8.2z" fill="#fff"/>' +
  '<path d="M14.7 22c3 0 5.5-2 5.5-4.5s-2.5-4.5-5.5-4.5-5.5 2-5.5 4.5c0 1.2.6 2.3 1.6 3.1l-.5 1.6 1.9-.9c.7.2 1.3.3 2 .3z" fill="#fff"/>' +
  '<circle cx="12.5" cy="17" r="0.9" fill="#07C160"/><circle cx="17" cy="17" r="0.9" fill="#07C160"/>' +
  '</svg>'
)}`;

Page({
  data: {
    wxIcon: WX_ICON,
    loggingIn: false,
    statusBarHeight: 24
  },

  onShow() {
    this.setData({ statusBarHeight: getStatusBarHeight() });
    // Already fully set up (e.g. user tapped back into this page) — skip
    // straight past the screens they've already completed.
    if (store.isLoggedIn() && store.hasProfile()) {
      wx.reLaunch({ url: '/pages/home/home' });
    } else if (store.isLoggedIn() && !store.hasProfile()) {
      wx.redirectTo({ url: '/pages/profile-setup/profile-setup' });
    }
  },

  handleLogin() {
    this.setData({ loggingIn: true });
    wx.login({
      success: () => {
        // TODO: send res.code to a 云函数 to exchange for openid + session,
        // then persist that session instead of just a local flag.
        store.setLoggedIn(true);
        if (store.hasProfile()) {
          // 老用户重新登录（例如退出登录后再登录）：资料还在，直接回首页。
          wx.reLaunch({ url: '/pages/home/home' });
        } else {
          getApp().globalData.suggestedNickname = suggestNickname();
          wx.redirectTo({ url: '/pages/profile-setup/profile-setup' });
        }
      },
      fail: () => {
        this.setData({ loggingIn: false });
        wx.showToast({ title: '登录失败，请重试', icon: 'none' });
      }
    });
  },

  viewTerms() {
    wx.navigateTo({ url: '/pages/policy/policy?type=terms' });
  },

  viewPrivacy() {
    wx.navigateTo({ url: '/pages/policy/policy?type=privacy' });
  }
});
