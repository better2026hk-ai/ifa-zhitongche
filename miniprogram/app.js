App({
  globalData: {
    // Filled right after wx.login() succeeds, before the profile-setup screen
    // has actually written a profile — lets profile-setup prefill a suggested
    // nickname without a full round trip through storage.
    suggestedNickname: null
  },

  onLaunch() {
    // TODO: once 云开发 is provisioned, call wx.cloud.init() here.
    this.loadCustomFonts();
  },

  // 设计规范：中英文标题用 Plus Jakarta Sans，数字类信息（题数/百分比/倒计时）
  // 用 JetBrains Mono——这两个都不是系统自带字体，写了 font-family 名字但不用
  // wx.loadFontFace() 注册的话会静默 fallback 到系统字体，跟设计稿字形差异很大
  // （尤其是标题里混排的英文/数字，比如"Paper Ⅱ""15%"）。只打了实际用到的字重。
  loadCustomFonts() {
    const fonts = [
      { family: 'Plus Jakarta Sans', file: 'PlusJakartaSans-Regular.ttf', weight: '400' },
      { family: 'Plus Jakarta Sans', file: 'PlusJakartaSans-SemiBold.ttf', weight: '600' },
      { family: 'Plus Jakarta Sans', file: 'PlusJakartaSans-Bold.ttf', weight: '700' },
      { family: 'Plus Jakarta Sans', file: 'PlusJakartaSans-ExtraBold.ttf', weight: '800' },
      { family: 'JetBrains Mono', file: 'JetBrainsMono-Regular.ttf', weight: '400' },
      { family: 'JetBrains Mono', file: 'JetBrainsMono-Bold.ttf', weight: '700' }
    ];
    fonts.forEach(({ family, file, weight }) => {
      wx.loadFontFace({
        family,
        source: `url("/fonts/${file}")`,
        desc: { weight },
        scopes: ['webview', 'native'],
        fail(err) {
          console.warn(`${family} (${weight}) 加载失败，将回退到系统字体`, err);
        }
      });
    });
  }
});
