const store = require('../../utils/store.js');
const { HOME_BANKS, EXAM_CONFIG } = require('../../utils/banks.js');
const { getStatusBarHeight } = require('../../utils/util.js');

Page({
  data: {
    papers: HOME_BANKS.map((b) => Object.assign({ key: b.key, tag: b.tag, title: b.title }, EXAM_CONFIG[b.key])),
    loginPromptVisible: false,
    statusBarHeight: 24
  },

  // 模拟考试的规则/科目列表本身就是通用信息，游客也能浏览——微信审核要求
  // 不能一进小程序就强制登录。真正要写入个人成绩的"开考"动作才检查登录态。
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1, hidden: false });
    }
    this.setData({ statusBarHeight: getStatusBarHeight() });
  },

  onSelectExam(e) {
    if (!store.isLoggedIn()) {
      this.setData({ loginPromptVisible: true });
      return;
    }
    const key = e.currentTarget.dataset.key;
    wx.navigateTo({ url: `/packageExam/pages/flow/flow?mode=new&key=${key}` });
  },

  goLogin() {
    this.setData({ loginPromptVisible: false });
    wx.navigateTo({ url: '/pages/login/login' });
  },

  closeLoginPrompt() {
    this.setData({ loginPromptVisible: false });
  }
});
