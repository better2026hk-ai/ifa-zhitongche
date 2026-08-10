const store = require('../../utils/store.js');
const { suggestNickname, getStatusBarHeight, wxLoginAsync } = require('../../utils/util.js');

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

const BACK_ICON = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">' +
  '<path d="M15 6l-6 6 6 6" stroke="#14161A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>'
)}`;

const CHECK_ICON = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">' +
  '<path d="M5 13l4 4L19 7" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>'
)}`;

Page({
  data: {
    wxIcon: WX_ICON,
    backIcon: BACK_ICON,
    checkIcon: CHECK_ICON,
    loggingIn: false,
    agreed: false,
    canGoBack: false,
    statusBarHeight: 24
  },

  async onShow() {
    this.setData({
      statusBarHeight: getStatusBarHeight(),
      canGoBack: getCurrentPages().length > 1
    });
    // Already fully set up (e.g. user tapped back into this page) — skip
    // straight past the screens they've already completed.
    if (!store.isLoggedIn()) return;
    const hasProfile = await store.hasProfile();
    if (hasProfile) {
      wx.reLaunch({ url: '/pages/home/home' });
    } else {
      wx.redirectTo({ url: '/pages/profile-setup/profile-setup' });
    }
  },

  goBack() {
    wx.navigateBack();
  },

  toggleAgree() {
    this.setData({ agreed: !this.data.agreed });
  },

  // Supabase 不认识微信身份，要靠 wx.login() 的 code 在服务端换 openid——
  // 这一步是这次接 Supabase 才重新需要的（跟微信云开发不一样，云开发直连
  // 数据库时这一步是多余的）。
  async handleLogin() {
    if (!this.data.agreed) {
      wx.showToast({ title: '请先阅读并勾选同意用户协议和隐私政策', icon: 'none' });
      return;
    }
    this.setData({ loggingIn: true });
    try {
      const { code } = await wxLoginAsync();
      const user = await store.login(code);
      store.setLoggedIn(true);
      if (user && user.nickname) {
        // 老用户重新登录（例如退出登录后再登录）：资料还在，直接回首页。
        wx.reLaunch({ url: '/pages/home/home' });
      } else {
        getApp().globalData.suggestedNickname = suggestNickname();
        wx.redirectTo({ url: '/pages/profile-setup/profile-setup' });
      }
    } catch (e) {
      this.setData({ loggingIn: false });
      wx.showToast({ title: '登录失败，请重试', icon: 'none' });
    }
  },

  viewTerms() {
    wx.navigateTo({ url: '/pages/policy/policy?type=terms' });
  },

  viewPrivacy() {
    wx.navigateTo({ url: '/pages/policy/policy?type=privacy' });
  }
});
