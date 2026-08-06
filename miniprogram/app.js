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
  //
  // wx.loadFontFace 的 source 不能直接传包内路径（比如 "/fonts/x.ttf"）——
  // 它会被当成需要下载的网络地址，报 "createDownloadTask:fail invalid url"。
  // 本地字体必须先落到 wx.env.USER_DATA_PATH 这个真实的本地路径下才能用。
  // fs.copyFile 的 srcPath 传包内路径会报 "permission denied"（包内资源不是
  // 普通文件系统路径，不能直接当拷贝源），所以改成 readFile 读出二进制内容
  // 再 writeFile 写到 USER_DATA_PATH——读包内资源官方是支持的，只是不能"拷贝"。
  loadCustomFonts() {
    const fonts = [
      { family: 'Plus Jakarta Sans', file: 'PlusJakartaSans-Regular.ttf', weight: '400' },
      { family: 'Plus Jakarta Sans', file: 'PlusJakartaSans-SemiBold.ttf', weight: '600' },
      { family: 'Plus Jakarta Sans', file: 'PlusJakartaSans-Bold.ttf', weight: '700' },
      { family: 'Plus Jakarta Sans', file: 'PlusJakartaSans-ExtraBold.ttf', weight: '800' },
      { family: 'JetBrains Mono', file: 'JetBrainsMono-Regular.ttf', weight: '400' },
      { family: 'JetBrains Mono', file: 'JetBrainsMono-Bold.ttf', weight: '700' }
    ];
    fonts.forEach(({ family, file, weight }) => this.loadLocalFont(family, file, weight));
  },

  loadLocalFont(family, file, weight) {
    const fs = wx.getFileSystemManager();
    const destPath = `${wx.env.USER_DATA_PATH}/${file}`;
    const register = () => {
      wx.loadFontFace({
        family,
        source: `url("${destPath}")`,
        desc: { weight },
        scopes: ['webview', 'native'],
        fail(err) {
          console.warn(`${family} (${weight}) 加载失败，将回退到系统字体`, err);
        }
      });
    };

    fs.access({
      path: destPath,
      success: register,
      fail: () => {
        fs.readFile({
          filePath: `/fonts/${file}`,
          success: (res) => {
            fs.writeFile({
              filePath: destPath,
              data: res.data,
              success: register,
              fail(err) {
                console.warn(`写入字体文件失败: ${file}`, err);
              }
            });
          },
          fail(err) {
            console.warn(`读取字体文件失败: ${file}`, err);
          }
        });
      }
    });
  }
});
