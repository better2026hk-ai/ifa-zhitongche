const store = require('../../utils/store.js');
const { suggestNickname } = require('../../utils/util.js');

const BACK_ICON = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">' +
  '<path d="M15 6l-6 6 6 6" stroke="#14161A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>'
)}`;

Page({
  data: {
    isEdit: false,
    avatarUrl: '',
    nickname: '',
    backIcon: BACK_ICON
  },

  onLoad(options) {
    const isEdit = options.mode === 'edit';
    if (isEdit) {
      const profile = store.getProfile() || {};
      this.setData({
        isEdit: true,
        avatarUrl: profile.avatarUrl || '',
        nickname: profile.nickname || ''
      });
    } else {
      const suggested = getApp().globalData.suggestedNickname || suggestNickname();
      getApp().globalData.suggestedNickname = null;
      this.setData({ nickname: suggested });
    }
  },

  onChooseAvatar(e) {
    this.setData({ avatarUrl: e.detail.avatarUrl });
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value });
  },

  onNicknameBlur(e) {
    this.setData({ nickname: e.detail.value.trim() });
  },

  handleBack() {
    wx.navigateBack();
  },

  handleConfirm() {
    let nickname = this.data.nickname.trim();
    if (!nickname) nickname = suggestNickname();
    store.setProfile({ nickname, avatarUrl: this.data.avatarUrl });

    if (this.data.isEdit) {
      wx.navigateBack();
    } else {
      wx.reLaunch({ url: '/pages/home/home' });
    }
  }
});
