App({
  globalData: {
    // Filled right after wx.login() succeeds, before the profile-setup screen
    // has actually written a profile — lets profile-setup prefill a suggested
    // nickname without a full round trip through storage.
    suggestedNickname: null
  },

  onLaunch() {
    // TODO: once 云开发 is provisioned, call wx.cloud.init() here.
  }
});
