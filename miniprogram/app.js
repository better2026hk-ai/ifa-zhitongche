const fontData = require('./fonts/font-data.js');

App({
  globalData: {
    // Filled right after wx.login() succeeds, before the profile-setup screen
    // has actually written a profile — lets profile-setup prefill a suggested
    // nickname without a full round trip through storage.
    suggestedNickname: null
  },

  onLaunch() {
    this.loadCustomFonts();
  },

  // 设计规范：中英文标题用 Plus Jakarta Sans，数字类信息（题数/百分比/倒计时）
  // 用 JetBrains Mono——这两个都不是系统自带字体，写了 font-family 名字但不用
  // wx.loadFontFace() 注册的话会静默 fallback 到系统字体，跟设计稿字形差异很大
  // （尤其是标题里混排的英文/数字，比如"Paper Ⅱ""15%"）。
  //
  // wx.loadFontFace 的 source 传包内路径（"/fonts/x.ttf"）会被当成要下载的网络
  // 地址报错；改用文件系统 API 把包内文件拷到本地也不行——包内资源根本不是
  // FileSystemManager 能打开的路径，copyFile/readFile 都报 permission denied。
  // 唯一在这几种方式都失败后还能用的本地方案：直接把字体内容转成 base64
  // data URI 内嵌传给 source，不依赖任何文件路径解析。
  loadCustomFonts() {
    const fonts = [
      { family: 'Plus Jakarta Sans', data: fontData.pjsRegular, weight: '400' },
      { family: 'Plus Jakarta Sans', data: fontData.pjsSemiBold, weight: '600' },
      { family: 'Plus Jakarta Sans', data: fontData.pjsBold, weight: '700' },
      { family: 'Plus Jakarta Sans', data: fontData.pjsExtraBold, weight: '800' },
      { family: 'JetBrains Mono', data: fontData.monoRegular, weight: '400' },
      { family: 'JetBrains Mono', data: fontData.monoBold, weight: '700' }
    ];
    fonts.forEach(({ family, data, weight }) => {
      wx.loadFontFace({
        family,
        source: `url("${data}")`,
        desc: { weight },
        scopes: ['webview', 'native'],
        success(res) {
          console.log(`${family} (${weight}) 加载成功`, res);
        },
        fail(err) {
          console.warn(`${family} (${weight}) 加载失败，将回退到系统字体`, err);
        }
      });
    });
  }
});
