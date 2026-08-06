const store = require('../../utils/store.js');
const { HOME_BANKS, EXAM_CONFIG } = require('../../utils/banks.js');

Page({
  data: {
    papers: HOME_BANKS.map((b) => Object.assign({ key: b.key, tag: b.tag, title: b.title }, EXAM_CONFIG[b.key]))
  },

  onShow() {
    if (!store.isLoggedIn() || !store.hasProfile()) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
  },

  onSelectExam(e) {
    const key = e.currentTarget.dataset.key;
    wx.navigateTo({ url: `/packageExam/pages/flow/flow?mode=new&key=${key}` });
  }
});
