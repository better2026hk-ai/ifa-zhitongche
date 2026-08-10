function suggestNickname() {
  return '微信用户' + Math.floor(1000 + Math.random() * 9000);
}

// 题库里的 stem 开头都拼了章节内序号（"113. ..."），练习模式要保留，
// 模拟考试/错题本测验是跨章节抽题，原编号没意义，显示前要去掉——文档 5.5 节。
function stripLeadingNumber(stem) {
  return stem.replace(/^\d+\.\s*/, '');
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// env(safe-area-inset-top) 在部分 Android 微信客户端上不可靠（直接返回 0），
// 所以顶部安全区改成用这个真实测量值，而不是 CSS 里猜一个固定数字。
function getStatusBarHeight() {
  try {
    const info = wx.getWindowInfo();
    if (info && info.statusBarHeight) return info.statusBarHeight;
  } catch (e) {
    // wx.getWindowInfo 是较新的 API，兜底用 getSystemInfoSync
  }
  try {
    return wx.getSystemInfoSync().statusBarHeight || 24;
  } catch (e) {
    return 24;
  }
}

function wxLoginAsync() {
  return new Promise((resolve, reject) => {
    wx.login({ success: resolve, fail: reject });
  });
}

// navigationStyle 是 custom（全自定义导航），微信还是会在右上角叠一个
// 系统胶囊按钮（⋯ 和圆点），这东西不占页面布局的位置，纯粹悬浮在最上层。
// 页面自己顶部右侧的按钮/文字如果没让出这块地方，会被这个胶囊按钮盖住/
// 挡住点不到。用 wx.getMenuButtonBoundingClientRect() 量出胶囊实际
// 位置，算出"从屏幕右边缘算，要留多少 px 才不会被挡住"，页面里给右侧
// 控件加这么多 padding-right/margin-right 就行。
function getMenuButtonGap() {
  try {
    const rect = wx.getMenuButtonBoundingClientRect();
    const info = wx.getWindowInfo();
    if (rect && info) return Math.max(0, info.windowWidth - rect.left) + 16;
  } catch (e) {
    // 拿不到就用一个常见胶囊宽度（约87px）+ 间距的保守估计值兜底
  }
  return 110;
}

module.exports = {
  suggestNickname,
  stripLeadingNumber,
  shuffle,
  fmtTime,
  getStatusBarHeight,
  wxLoginAsync,
  getMenuButtonGap
};
