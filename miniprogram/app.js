App({
  globalData: {
    // Filled right after wx.login() succeeds, before the profile-setup screen
    // has actually written a profile — lets profile-setup prefill a suggested
    // nickname without a full round trip through storage.
    suggestedNickname: null
  },

  onLaunch() {
    // TODO: once 云开发 is provisioned, call wx.cloud.init() here.
    this.loadNumericFont();
  },

  // 设计规范里数字类信息（题数/百分比/倒计时）统一用 JetBrains Mono——这不是系统
  // 自带字体，不注册的话会静默 fallback 到系统等宽字体，跟设计稿对不上。
  // 只打了 Regular/Bold 两个字重，跟项目里实际用到的 font-weight 一致。
  loadNumericFont() {
    wx.loadFontFace({
      family: 'JetBrains Mono',
      source: 'url("/fonts/JetBrainsMono-Regular.ttf")',
      desc: { weight: '400' },
      scopes: ['webview', 'native'],
      fail(err) {
        console.warn('JetBrains Mono Regular 加载失败，将回退到系统等宽字体', err);
      }
    });
    wx.loadFontFace({
      family: 'JetBrains Mono',
      source: 'url("/fonts/JetBrainsMono-Bold.ttf")',
      desc: { weight: '700' },
      scopes: ['webview', 'native'],
      fail(err) {
        console.warn('JetBrains Mono Bold 加载失败，将回退到系统等宽字体', err);
      }
    });
  }
});
